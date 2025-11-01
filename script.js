// --- CONSTANTS & UTILITY FUNCTIONS ---
const $ = (selector) => document.querySelector(selector);
const getVal = (id) => parseFloat($(`#${id}`).value) || 0;
const getStr = (id) => $(`#${id}`).value.trim() || 'N/A';
const toFixedTrim = (n, d = 2) => parseFloat(n.toFixed(d));
const GRAMS_TO_ANA_RATE = 1.372;
let otn_calculationResult = {}; // Global object to store results for old-to-new tab

function gramsToAnaString(weightInGrams) {
    const totalAna = weightInGrams * GRAMS_TO_ANA_RATE;
    return `${totalAna.toFixed(3)} আনা`;
}

function animateValue(obj, start, end, duration) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    obj.textContent = `₹${Math.floor(progress * (end - start) + start).toLocaleString('en-IN')}`;
    if (progress < 1) { window.requestAnimationFrame(step); }
  };
  window.requestAnimationFrame(step);
}

// Progress Bar Animation
function showProgress(id) {
  const progress = $(`#${id}`);
  progress.style.display = 'block';
  const fill = progress.querySelector('.progress-fill');
  fill.style.width = '0%';
  setTimeout(() => { fill.style.width = '100%'; }, 100);
  setTimeout(() => { progress.style.display = 'none'; }, 2000);
}

// --- TAB HANDLING ---
function openTab(tabName) {
  document.querySelectorAll('.tab-pane').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  $(`#${tabName}`).classList.add('active');
  $(`button[onclick="openTab('${tabName}')"]`).classList.add('active');
  if (tabName === 'history') {
    displayBillHistory();
  }
}

// --- DATA PERSISTENCE (SETTINGS) ---
function saveSettings() {
    localStorage.setItem('solemanJewellersSettings', JSON.stringify({
        basePrice24ct: getVal('basePrice24ct'), gstPercent: getVal('gstPercent'),
        makingChargePerGram: getVal('makingChargePerGram'), deduct: getVal('deduct'),
    }));
}

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('solemanJewellersSettings'));
    if (settings) {
        $('#basePrice24ct').value = settings.basePrice24ct || 126000;
        $('#gstPercent').value = settings.gstPercent || 3;
        $('#makingChargePerGram').value = settings.makingChargePerGram || 500;
        $('#deduct').value = settings.deduct || 35;
        $('#deductSilver').value = settings.deduct || 35;
    }
}

// --- LIVE PRICE ---
function fetchLivePrice() {
    const livePriceDisplay24ct = $('#liveGoldPrice24ct');
    const livePriceDisplay22ct = $('#liveGoldPrice22ct');
    const currentPrice24ct = getVal('basePrice24ct') || getVal('otn_BasePrice24ct');
    
    if (currentPrice24ct > 0) {
        const currentPrice22ct = currentPrice24ct * 0.98;
        animateValue(livePriceDisplay24ct, currentPrice24ct - 500, currentPrice24ct, 1500);
        animateValue(livePriceDisplay22ct, currentPrice22ct - 500, currentPrice22ct, 1500);
    } else {
        livePriceDisplay24ct.textContent = 'N/A';
        livePriceDisplay22ct.textContent = 'N/A';
    }
}

// --- CALCULATORS ---
function calculateProfit(returnDetails = false) {
  showProgress('profitProgress');
  const details = {
    basePrice24ct: getVal('basePrice24ct'), weightGrams: getVal('profitWeight'),
    quality: $('#goldQuality').value, makingChargePerGram: getVal('makingChargePerGram'),
    gstPercent: getVal('gstPercent'), qualityName: $('#goldQuality > option:checked').text,
    customerName: getStr('customerName'), customerPhone: getStr('customerPhone'),
  };

  if (details.basePrice24ct <= 0 || details.weightGrams <= 0) {
    if (!returnDetails) $('#profitOutput').innerHTML = 'অনুগ্রহ করে সঠিক সোনার দাম এবং ওজন লিখুন।';
    return null;
  }
  
  let priceRatio = { Licence: 0.98, kdm: 0.88, bengali: 0.81, desi_bengali: 0.71 }[details.quality];
  details.totalGoldValue = toFixedTrim((details.basePrice24ct * priceRatio / 10) * details.weightGrams);
  details.totalMakingCharge = toFixedTrim(details.makingChargePerGram * details.weightGrams);
  const taxableAmount = details.totalGoldValue + details.totalMakingCharge;
  details.gstAmount = toFixedTrim(taxableAmount * (details.gstPercent / 100));
  const totalSellingPrice = toFixedTrim(taxableAmount + details.gstAmount);

  if (returnDetails) return { details, total: totalSellingPrice };

  $('#profitOutput').innerHTML = `
    <div>
        <strong style="font-size: 1.2em;">সর্বমোট মূল্য (GST সহ): <span style="color: var(--primary-dark)">₹${totalSellingPrice.toLocaleString('en-IN')}</span></strong><hr>
        <button class="btn btn-sm btn-alt" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'block' ? 'none' : 'block'">সম্পূর্ণ হিসাব দেখুন</button>
        <div class="hidden-details" style="display:none;">
            <strong>হিসাবের বিবরণ (${details.qualityName} - ${details.weightGrams} গ্রাম):</strong><hr>
            <strong>সোনার মূল্য:</strong> ₹${toFixedTrim(details.totalGoldValue).toLocaleString('en-IN')}<br>
            <strong>মোট মজুরি:</strong> ₹${toFixedTrim(details.totalMakingCharge).toLocaleString('en-IN')}<br>
            <strong>GST (${details.gstPercent}%):</strong> ₹${toFixedTrim(details.gstAmount).toLocaleString('en-IN')}
        </div>
    </div>`;
  saveSettings();
}

function calculateExchange(returnDetails = false){
  showProgress('exchangeProgress');
  const details = {
    newWeight: getVal('newWeight'), newPrice10g: getVal('newPrice11'),
    labourType: $('#labourType').value, labourValue: getVal('labourValue'),
    oldWeight: getVal('oldWeight'), oldPrice10g: getVal('oldPrice11'),
    deduct: getVal('deduct'), gstPercent: getVal('gstPercent'),
    includeGst: $('#includeGstExchange').checked
  };
  
  details.baseNewValue = (details.newPrice10g / 10) * details.newWeight;
  let labourAmount = 0;
  if (details.labourType === 'fixed') labourAmount = details.labourValue;
  else if (details.labourType === 'percent') labourAmount = (details.labourValue / 100) * details.baseNewValue;
  else if (details.labourType === 'pergram') labourAmount = details.labourValue * details.newWeight;
  details.labourAmount = toFixedTrim(labourAmount);

  details.newGross = toFixedTrim(details.baseNewValue + details.labourAmount);
  details.oldNet = toFixedTrim((details.oldPrice10g / 10) * details.oldWeight * (1 - details.deduct / 100));
  details.balance = toFixedTrim(details.newGross - details.oldNet);
  
  details.gstOnPayable = 0;
  if (details.includeGst && details.balance > 0) {
    details.gstOnPayable = toFixedTrim(details.balance * (details.gstPercent / 100));
  }
  details.finalPayable = toFixedTrim(details.balance + details.gstOnPayable);

  if(returnDetails) return details;
  
  let out=`<strong>নতুন গহনার মোট মূল্য:</strong> ₹${details.newGross.toLocaleString('en-IN')}<hr>
            <strong>পুরাতন গহনার মূল্য (${details.deduct}% কাটছাঁট পর):</strong> ₹${details.oldNet.toLocaleString('en-IN')}<hr>`;
  
  if (details.balance > 0.005) {
    out += `<strong style="font-size:1.2em;">গ্রাহককে মোট দিতে হবে: <span style="color: var(--primary-dark)">₹${details.finalPayable.toLocaleString('en-IN')}</span></strong>`;
  } else if (details.balance < -0.005) {
    out += `<strong style="font-size:1.2em;">দোকান ফেরত দেবে: <span style="color: var(--primary-dark)">₹${toFixedTrim(Math.abs(details.balance)).toLocaleString('en-IN')}</span></strong>`;
  } else { 
    out += `<strong>ব্যালেন্স:</strong> ₹0`; 
  }
  
  $('#exchangeOutput').innerHTML = out;
  saveSettings();
}

function calculateSilverExchange(returnDetails = false){
  showProgress('silverProgress');
  const details = {
    newWeight: getVal('newWeightSilver'), newPrice10g: getVal('newPrice11Silver'),
    labourType: $('#labourTypeSilver').value, labourValue: getVal('labourValueSilver'),
    oldWeight: getVal('oldWeightSilver'), oldPrice10g: getVal('oldPrice11Silver'),
    deduct: getVal('deductSilver'), gstPercent: getVal('gstPercent'),
    includeGst: $('#includeGstExchangeSilver').checked
  };
  
  details.baseNewValue = (details.newPrice10g / 10) * details.newWeight;
  let labourAmount = 0;
  if (details.labourType === 'fixed') labourAmount = details.labourValue;
  else if (details.labourType === 'percent') labourAmount = (details.labourValue / 100) * details.baseNewValue;
  else if (details.labourType === 'pergram') labourAmount = details.labourValue * details.newWeight;
  details.labourAmount = toFixedTrim(labourAmount);

  details.newGross = toFixedTrim(details.baseNewValue + details.labourAmount);
  details.oldNet = toFixedTrim((details.oldPrice10g / 10) * details.oldWeight * (1 - details.deduct / 100));
  details.balance = toFixedTrim(details.newGross - details.oldNet);
  
  details.gstOnPayable = 0;
  if (details.includeGst && details.balance > 0) {
    details.gstOnPayable = toFixedTrim(details.balance * (details.gstPercent / 100));
  }
  details.finalPayable = toFixedTrim(details.balance + details.gstOnPayable);

  if(returnDetails) return details;
  
  let out=`<strong>নতুন চাঁদির মোট মূল্য:</strong> ₹${details.newGross.toLocaleString('en-IN')}<hr>
            <strong>পুরাতন চাঁদির মূল্য (${details.deduct}% কাটছাঁট পর):</strong> ₹${details.oldNet.toLocaleString('en-IN')}<hr>`;
  
  if (details.balance > 0.005) {
    out += `<strong style="font-size:1.2em;">গ্রাহককে মোট দিতে হবে: <span style="color: var(--primary-dark)">₹${details.finalPayable.toLocaleString('en-IN')}</span></strong>`;
  } else if (details.balance < -0.005) {
    out += `<strong style="font-size:1.2em;">দোকান ফেরত দেবে: <span style="color: var(--primary-dark)">₹${toFixedTrim(Math.abs(details.balance)).toLocaleString('en-IN')}</span></strong>`;
  } else { 
    out += `<strong>ব্যালেন্স:</strong> ₹0`; 
  }
  
  $('#exchangeOutputSilver').innerHTML = out;
  saveSettings();
}

// --- BILL PREVIEW, SAVE, PRINT, & HISTORY ---
function previewBill() {
    const calcData = calculateProfit(true);
    if (!calcData) {
        alert("প্রিভিউ দেখার আগে সঠিক হিসাব প্রয়োজন।");
        return;
    }
    const { details, total } = calcData;
    const invoiceId = `SJ-PREVIEW`;
    
    $('#modalTitle').textContent = 'বিল প্রিভিউ';
    const modalBody = $('#modalBody');
    modalBody.innerHTML = `
        <table class="bill-details-table">
            <tr><td>ইনভয়েস নং:</td><td>${invoiceId}</td></tr>
            <tr><td>গ্রাহকের নাম:</td><td>${details.customerName}</td></tr>
            <tr><td>ফোন নম্বর:</td><td>${details.customerPhone}</td></tr>
            <tr><td>তারিখ:</td><td>${new Date().toLocaleDateString('bn-BD', {day: 'numeric', month: 'long', year: 'numeric'})}</td></tr>
            <tr><td colspan="2"><hr></td></tr>
            <tr><td>গহনার প্রকার:</td><td>${details.qualityName}</td></tr>
            <tr><td>ওজন:</td><td>${details.weightGrams} গ্রাম</td></tr>
            <tr><td>সোনার মূল্য:</td><td>₹${toFixedTrim(details.totalGoldValue).toLocaleString('en-IN')}</td></tr>
            <tr><td>মজুরি:</td><td>₹${toFixedTrim(details.totalMakingCharge).toLocaleString('en-IN')}</td></tr>
            <tr><td>সাবটোটাল (মজুরি সহ):</td><td>₹${toFixedTrim(details.totalGoldValue + details.totalMakingCharge).toLocaleString('en-IN')}</td></tr>
            <tr><td>GST (${details.gstPercent}%):</td><td>₹${toFixedTrim(details.gstAmount).toLocaleString('en-IN')}</td></tr>
            <tr class="total-row"><td>সর্বমোট মূল্য:</td><td>₹${toFixedTrim(total).toLocaleString('en-IN')}</td></tr>
        </table>
    `;
    $('#billDetailsModal').style.display = 'flex';
}

function previewExchange() {
    const details = calculateExchange(true);
    if (!details) { alert("প্রিভিউ দেখার আগে সঠিক হিসাব প্রয়োজন।"); return; }

    $('#modalTitle').textContent = 'সোনা এক্সচেঞ্জ প্রিভিউ';
    const modalBody = $('#modalBody');
    let balanceRow = '';
    if (details.balance > 0.005) {
        balanceRow = `
            <tr><td>দিতে হবে (GST ছাড়া):</td><td>₹${details.balance.toLocaleString('en-IN')}</td></tr>
            ${details.includeGst ? `<tr><td>GST (${details.gstPercent}%):</td><td>₹${details.gstOnPayable.toLocaleString('en-IN')}</td></tr>` : ''}
            <tr class="total-row"><td>সর্বমোট দিতে হবে:</td><td>₹${details.finalPayable.toLocaleString('en-IN')}</td></tr>
        `;
    } else if (details.balance < -0.005) {
        balanceRow = `<tr class="total-row"><td>দোকান ফেরত দেবে:</td><td>₹${toFixedTrim(Math.abs(details.balance)).toLocaleString('en-IN')}</td></tr>`;
    } else {
        balanceRow = `<tr class="total-row"><td>ব্যালেন্স:</td><td>₹0</td></tr>`;
    }

    modalBody.innerHTML = `
        <table class="bill-details-table">
            <tr><td colspan="2" style="background:#f2f2f2; font-weight:bold;">নতুন গহনার হিসাব</td></tr>
            <tr><td>নতুন গহনার মূল্য:</td><td>₹${toFixedTrim(details.baseNewValue).toLocaleString('en-IN')}</td></tr>
            <tr><td>মজুরি:</td><td>₹${details.labourAmount.toLocaleString('en-IN')}</td></tr>
            <tr><td><strong>নতুন গহনার মোট:</strong></td><td><strong>₹${details.newGross.toLocaleString('en-IN')}</strong></td></tr>
            <tr><td colspan="2"><hr style="margin:5px 0;"></td></tr>
            <tr><td colspan="2" style="background:#f2f2f2; font-weight:bold;">পুরাতন গহনার হিসাব</td></tr>
            <tr><td>পুরাতন গহনার মূল্য (${details.deduct}% কাটছাঁট পর):</td><td>₹${details.oldNet.toLocaleString('en-IN')}</td></tr>
            <tr><td colspan="2"><hr style="margin:5px 0;"></td></tr>
            ${balanceRow}
        </table>
    `;
    $('#billDetailsModal').style.display = 'flex';
}

function previewSilverExchange() {
    const details = calculateSilverExchange(true);
    if (!details) { alert("প্রিভিউ দেখার আগে সঠিক হিসাব প্রয়োজন।"); return; }

    $('#modalTitle').textContent = 'চাঁদি এক্সচেঞ্জ প্রিভিউ';
    const modalBody = $('#modalBody');
    let balanceRow = '';
    if (details.balance > 0.005) {
        balanceRow = `
            <tr><td>দিতে হবে (GST ছাড়া):</td><td>₹${details.balance.toLocaleString('en-IN')}</td></tr>
            ${details.includeGst ? `<tr><td>GST (${details.gstPercent}%):</td><td>₹${details.gstOnPayable.toLocaleString('en-IN')}</td></tr>` : ''}
            <tr class="total-row"><td>সর্বমোট দিতে হবে:</td><td>₹${details.finalPayable.toLocaleString('en-IN')}</td></tr>
        `;
    } else if (details.balance < -0.005) {
        balanceRow = `<tr class="total-row"><td>দোকান ফেরত দেবে:</td><td>₹${toFixedTrim(Math.abs(details.balance)).toLocaleString('en-IN')}</td></tr>`;
    } else {
        balanceRow = `<tr class="total-row"><td>ব্যালেন্স:</td><td>₹0</td></tr>`;
    }

    modalBody.innerHTML = `
        <table class="bill-details-table">
            <tr><td colspan="2" style="background:#f2f2f2; font-weight:bold;">নতুন চাঁদির হিসাব</td></tr>
            <tr><td>নতুন চাঁদির মূল্য:</td><td>₹${toFixedTrim(details.baseNewValue).toLocaleString('en-IN')}</td></tr>
            <tr><td>মজুরি:</td><td>₹${details.labourAmount.toLocaleString('en-IN')}</td></tr>
            <tr><td><strong>নতুন চাঁদির মোট:</strong></td><td><strong>₹${details.newGross.toLocaleString('en-IN')}</strong></td></tr>
            <tr><td colspan="2"><hr style="margin:5px 0;"></td></tr>
            <tr><td colspan="2" style="background:#f2f2f2; font-weight:bold;">পুরাতন চাঁদির হিসাব</td></tr>
            <tr><td>পুরাতন চাঁদির মূল্য (${details.deduct}% কাটছাঁট পর):</td><td>₹${details.oldNet.toLocaleString('en-IN')}</td></tr>
            <tr><td colspan="2"><hr style="margin:5px 0;"></td></tr>
            ${balanceRow}
        </table>
    `;
    $('#billDetailsModal').style.display = 'flex';
}


function saveAndPrintBill() {
    const calcData = calculateProfit(true);
    if (!calcData) { alert("প্রিন্ট করার আগে সঠিক হিসাব প্রয়োজন।"); return; }
    
    const { details, total } = calcData;
    details.total = total;
    details.id = Date.now();
    details.date = new Date().toISOString();
    
    let bills = JSON.parse(localStorage.getItem('solemanJewellersBills')) || [];
    bills.unshift(details);
    localStorage.setItem('solemanJewellersBills', JSON.stringify(bills));
    
    alert('বিল সফলভাবে সেভ হয়েছে!');

    const billWindow = window.open('', 'PRINT', 'height=700,width=900');
    const today = new Date(details.date).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
    const invoiceId = `SJ-${details.id.toString().slice(-6)}`;
    
    billWindow.document.write(`
        <html><head><title>Invoice ${invoiceId}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600&display=swap');
            body { font-family: 'Noto Sans Bengali', sans-serif; margin: 25px; } .container { border: 2px solid #000; padding: 25px; }
            .header { text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 15px; margin-bottom: 20px;}
            .header h2 { margin: 0; } .header p { margin: 5px 0; font-size: 14px; } .meta { display: flex; justify-content: space-between; margin-bottom: 20px;}
            table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
            th { background: #f2f2f2; } .total td { font-weight: bold; font-size: 1.2em; } .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 14px;}
        </style></head><body><div class="container">
            <div class="header">
                <h2>সোলেমান জুয়েলার্স</h2> <p>ঠিকানা: ভাদুরিয়াপাড়া বাজার | মোবাইল: 8967575884</p> <p>GSTIN: 19BMZPR4273E1Z9 | BIS Licence: HM/C-5191720314</p>
            </div>
            <div class="meta">
                <div><strong>ইনভয়েস নং:</strong> ${invoiceId}<br><strong>তারিখ:</strong> ${today}</div>
                <div><strong>গ্রাহকের নাম:</strong> ${details.customerName}<br><strong>ফোন:</strong> ${details.customerPhone}</div>
            </div>
            <h3>বিক্রয় বিল</h3>
            <table>
                <tr><th>বিবরণ</th><th>ওজন/পরিমাণ</th><th>মূল্য</th></tr>
                <tr><td>গহনা (${details.qualityName})</td><td>${details.weightGrams} গ্রাম</td><td>₹${toFixedTrim(details.totalGoldValue).toLocaleString('en-IN')}</td></tr>
                <tr><td>মজুরি</td><td>@ ₹${details.makingChargePerGram}/গ্রাম</td><td>₹${toFixedTrim(details.totalMakingCharge).toLocaleString('en-IN')}</td></tr>
                <tr><td colspan="2">সাব-টোটাল</td><td>₹${toFixedTrim(details.totalGoldValue + details.totalMakingCharge).toLocaleString('en-IN')}</td></tr>
                <tr><td colspan="2">GST (${details.gstPercent}%)</td><td>₹${toFixedTrim(details.gstAmount).toLocaleString('en-IN')}</td></tr>
                <tr class="total"><td colspan="2">সর্বমোট মূল্য</td><td>₹${toFixedTrim(total).toLocaleString('en-IN')}</td></tr>
            </table>
            <div class="footer"><p>ধন্যবাদ! আবার আসবেন।</p></div>
        </div></body></html>`);
    billWindow.document.close(); billWindow.focus(); billWindow.print();
}

function displayBillHistory() {
    const container = $('#billHistoryContainer');
    const bills = JSON.parse(localStorage.getItem('solemanJewellersBills')) || [];

    if (bills.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-light);">এখানে কোনো সেভ করা বিল নেই।</p>';
        return;
    }

    container.innerHTML = bills.map(bill => `
        <div class="bill-item" id="bill-item-${bill.id}">
            <div class="bill-item-info">
                <strong>গ্রাহক: ${bill.customerName}</strong>
                <span>তারিখ: ${new Date(bill.date).toLocaleDateString('bn-BD', {day: 'numeric', month: 'long', year: 'numeric'})} | মোট: ₹${toFixedTrim(bill.total).toLocaleString('en-IN')}</span>
            </div>
            <div class="bill-item-actions">
                <button class="btn btn-sm btn-alt" onclick="viewBillDetails(${bill.id})">বিস্তারিত দেখুন</button>
                <button class="btn btn-sm btn-danger" onclick="deleteBill(${bill.id})">ডিলিট</button>
            </div>
        </div>
    `).join('');
}

function deleteBill(billId) {
    if (!confirm('আপনি কি সত্যিই এই বিলটি ডিলিট করতে চান? এই কাজটি ফেরানো যাবে না।')) {
        return;
    }
    let bills = JSON.parse(localStorage.getItem('solemanJewellersBills')) || [];
    const updatedBills = bills.filter(bill => bill.id !== billId);
    localStorage.setItem('solemanJewellersBills', JSON.stringify(updatedBills));
    displayBillHistory(); 
}

function viewBillDetails(billId) {
    const bills = JSON.parse(localStorage.getItem('solemanJewellersBills')) || [];
    const bill = bills.find(b => b.id === billId);
    if (!bill) {
        alert('বিল খুঁজে পাওয়া যায়নি!');
        return;
    }

    $('#modalTitle').textContent = 'সেভ করা বিলের বিবরণ';
    const modalBody = $('#modalBody');
    const invoiceId = `SJ-${bill.id.toString().slice(-6)}`;
    
    modalBody.innerHTML = `
        <table class="bill-details-table">
            <tr><td>ইনভয়েস নং:</td><td>${invoiceId}</td></tr>
            <tr><td>গ্রাহকের নাম:</td><td>${bill.customerName}</td></tr>
            <tr><td>ফোন নম্বর:</td><td>${bill.customerPhone}</td></tr>
            <tr><td>তারিখ:</td><td>${new Date(bill.date).toLocaleDateString('bn-BD', {day: 'numeric', month: 'long', year: 'numeric'})}</td></tr>
            <tr><td colspan="2"><hr></td></tr>
            <tr><td>গহনার প্রকার:</td><td>${bill.qualityName}</td></tr>
            <tr><td>ওজন:</td><td>${bill.weightGrams} গ্রাম</td></tr>
            <tr><td>সোনার মূল্য:</td><td>₹${toFixedTrim(bill.totalGoldValue).toLocaleString('en-IN')}</td></tr>
            <tr><td>মজুরি:</td><td>₹${toFixedTrim(bill.totalMakingCharge).toLocaleString('en-IN')}</td></tr>
            <tr><td>সাবটোটাল (মজুরি সহ):</td><td>₹${toFixedTrim(bill.totalGoldValue + bill.totalMakingCharge).toLocaleString('en-IN')}</td></tr>
            <tr><td>GST (${bill.gstPercent}%):</td><td>₹${toFixedTrim(bill.gstAmount).toLocaleString('en-IN')}</td></tr>
            <tr class="total-row"><td>সর্বমোট মূল্য:</td><td>₹${toFixedTrim(bill.total).toLocaleString('en-IN')}</td></tr>
        </table>
    `;

    $('#billDetailsModal').style.display = 'flex';
}

// --- INITIALIZATION & RESETS ---
function resetProfit() {
  $('#customerName').value = ''; $('#customerPhone').value = ''; 
  $('#profitWeight').value = '10';
  $('#basePrice24ct').value = '126000'; 
  $('#makingChargePerGram').value = '500';
  $('#goldQuality').value = 'Licence';
  calculateProfit();
  updateAllAnaDisplays();
}
function resetExchange(){
  $('#newWeight').value='0'; 
  $('#newPrice11').value = '126000';
  $('#labourType').value = 'pergram';
  $('#labourValue').value='500'; 
  $('#oldWeight').value='0';
  $('#oldPrice11').value = '126000';
  $('#deduct').value = '35';
  $('#includeGstExchange').checked = true;
  calculateExchange(false);
  updateAllAnaDisplays();
}
function resetSilverExchange(){
  $('#newWeightSilver').value='0'; $('#labourTypeSilver').value = 'percent';
  $('#labourValueSilver').value='10'; $('#oldWeightSilver').value='0'; 
  $('#newPrice11Silver').value='1310'; $('#oldPrice11Silver').value='1310';
  $('#deductSilver').value='35';
  $('#includeGstExchangeSilver').checked = true;
  calculateSilverExchange(false);
  updateAllAnaDisplays();
}

// --- OLD TO NEW CALCULATOR SCRIPT ---
function otn_calculateOldToNew() {
  showProgress('otnProgress');
    const oldWeight = getVal('otn_OldWeight');
    const oldType = $('#otn_OldType').value;
    const newWeight = getVal('otn_NewWeight');
    const newType = $('#otn_NewType').value;
    const price24ct = getVal('otn_BasePrice24ct');
    const makingCharge = getVal('otn_MakingCharge');
    const gstPercent = getVal('otn_GstPercent');

    otn_calculationResult = { 
        oldWeight, 
        oldType: $('#otn_OldType').options[$('#otn_OldType').selectedIndex].text, 
        newWeight, 
        newType: $('#otn_NewType').options[$('#otn_NewType').selectedIndex].text, 
        price24ct, 
        makingCharge, 
        gstPercent, 
        pureGoldEq: 0 
    };

    if (oldWeight <= 0 || newWeight <= 0 || price24ct <= 0) {
        $('#otn_oldToNewOutput').innerHTML = 'অনুগ্রহ করে সমস্ত সঠিক তথ্য লিখুন।';
        return;
    }

    let pureGoldEq;
    
    // === আপনার অনুরোধ অনুযায়ী বিশেষ লজিক ===
    
    // Hallmark (85) to Others
    if (oldType === 'Licence' && newType === 'kdm_850') {
        pureGoldEq = oldWeight * 85 / 85; // 10.000
    }
    else if (oldType === 'Licence' && newType === 'bengali') {
        pureGoldEq = oldWeight * 85 / 75; // 11.333
    }
    else if (oldType === 'Licence' && newType === 'desi_bengali') {
        pureGoldEq = oldWeight * 85 / 65; // 13.076
    }
    
    // === নতুন যোগ করা হয়েছে: KDM 850 (78) to Others ===
    else if (oldType === 'kdm_850' && newType === 'Licence') {
        pureGoldEq = oldWeight * 78 / 92; // 8.478
    }
    else if (oldType === 'kdm_850' && newType === 'kdm_850') {
        pureGoldEq = oldWeight * 78 / 85; // 9.176
    }
    else if (oldType === 'kdm_850' && newType === 'bengali') {
        pureGoldEq = oldWeight * 78 / 75; // 10.400
    }
    else if (oldType === 'kdm_850' && newType === 'desi_bengali') {
        pureGoldEq = oldWeight * 78 / 65; // 12.000
    }
    // ============================================
    
    // Bengali (65) to Others
    else if (oldType === 'bengali' && newType === 'kdm_850') {
        pureGoldEq = oldWeight * 65 / 85; // 7.647
    }
    else if (oldType === 'bengali' && newType === 'desi_bengali') {
        pureGoldEq = oldWeight * 65 / 58; // 11.206
    }
    else if (oldType === 'bengali' && newType === 'bengali') {
        pureGoldEq = oldWeight * 65 / 75; 
    }
    // === নতুন যোগ করা: Desi Bengali (58) to Others ===
    else if (oldType === 'desi_bengali' && newType === 'Licence') {
        pureGoldEq = oldWeight * 58 / 92; // 6.304 for 10g
    }
    else if (oldType === 'desi_bengali' && newType === 'kdm_850') {
        pureGoldEq = oldWeight * 58 / 85; // 6.823 for 10g
    }
    else if (oldType === 'desi_bengali' && newType === 'bengali') {
        pureGoldEq = oldWeight * 58 / 75; // 7.733 for 10g
    }
    else if (oldType === 'desi_bengali' && newType === 'desi_bengali') {
        pureGoldEq = oldWeight * 58 / 65; // 8.923 for 10g
    }
    // ===============================================
    
    // === জেনেরিক / ফলব্যাক লজিক ===
    else {
        // ফলব্যাক পুরানো পিউরিটি ফ্যাক্টর (আপনার লজিক অনুযায়ী আপডেট করা হয়েছে)
        const oldPurityFactors = { 
            Licence: 85/92, 
            bengali: 65/92, 
            kdm_850: 78/92, // 85/92 থেকে 78/92 তে পরিবর্তন করা হয়েছে
            desi_bengali: 58/92 // একটি আনুমানিক মান
        };
        pureGoldEq = oldWeight * (oldPurityFactors[oldType] || 65/92); // ফলব্যাক
    }
    // ===============================================
    
    otn_calculationResult.pureGoldEq = pureGoldEq;

    const deductionInGrams = oldWeight - pureGoldEq;
    
    const newGoldPriceRatio = { 
        Licence: 0.98, 
        bengali: 0.81, 
        kdm_850: 0.91, // 20K850 এর জন্য আনুমানিক অনুপাত
        desi_bengali: 0.71 
    };

    const deficitWeight = newWeight - pureGoldEq;
    let detailsHTML, summaryHTML;

    if (deficitWeight < -0.001) { // Case 1: EXCESS gold
        const excessGoldInGrams = Math.abs(deficitWeight);
        const pricePerGramNew = (price24ct * (newGoldPriceRatio[newType] || 0.91)) / 10;
        const creditValue = excessGoldInGrams * pricePerGramNew;
        const totalMakingCharge = newWeight * makingCharge;
        let finalPayable = 0, finalRefundable = 0;

        if (totalMakingCharge > creditValue) {
            let payableMakingCharge = totalMakingCharge - creditValue;
            let gstOnPayable = payableMakingCharge * (gstPercent / 100);
            finalPayable = payableMakingCharge + gstOnPayable;
        } else {
            finalRefundable = creditValue - totalMakingCharge;
        }

        detailsHTML = `
            <strong>প্রাপ্ত পাকা সোনার ওজন:</strong> ${pureGoldEq.toFixed(3)} গ্রাম / ${gramsToAnaString(pureGoldEq)}<hr>
            <strong>বাদ গেছে:</strong> ${deductionInGrams.toFixed(3)} গ্রাম / ${gramsToAnaString(deductionInGrams)}<hr>
            <strong>অতিরিক্ত সোনা রয়েছে:</strong> ${excessGoldInGrams.toFixed(3)} গ্রাম / ${gramsToAnaString(excessGoldInGrams)}<hr>
            <strong>নতুন গহনার মোট মজুরি:</strong> ₹${totalMakingCharge.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}<br>
            <strong>অতিরিক্ত সোনার জন্য ক্রেডিট:</strong> ₹${creditValue.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
        `;
        summaryHTML = finalPayable > 0.01
            ? `<strong style="font-size: 1.2em;">সর্বমোট প্রদেয় মূল্য: <span style="color: var(--primary-dark);">₹${finalPayable.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></strong>`
            : `<strong style="font-size: 1.2em;">দোকান ফেরত দেবে: <span style="color: var(--danger-dark);">₹${finalRefundable.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></strong>`;

        Object.assign(otn_calculationResult, { finalPayable, finalRefundable, creditValue, totalMakingCharge, excessGoldInGrams, deductionInGrams });
    }
    else { // Case 2: DEFICIT of gold
        const pricePerGramNew = (price24ct * (newGoldPriceRatio[newType] || 0.91)) / 10;
        const costOfDeficitGold = deficitWeight * pricePerGramNew;
        const totalMakingCharge = newWeight * makingCharge;
        const subtotal = costOfDeficitGold + totalMakingCharge;
        const gstAmount = subtotal * (gstPercent / 100);
        const totalPayable = subtotal + gstAmount;

        let pricePerAnaText = '';
        if (deficitWeight > 0.001) {
            const makingChargeForDeficit = deficitWeight * makingCharge;
            const subtotalForDeficit = costOfDeficitGold + makingChargeForDeficit;
            const gstForDeficit = subtotalForDeficit * (gstPercent / 100);
            const totalCostForDeficit = subtotalForDeficit + gstForDeficit;
            const deficitInAna = deficitWeight * GRAMS_TO_ANA_RATE;
            if (deficitInAna > 0) {
                const pricePerAna = totalCostForDeficit / deficitInAna;
                pricePerAnaText = ` <span style="font-size: 0.9em; color: var(--text-light);">(মজুরি ও GST সহ প্রতি আনা প্রায় ₹${pricePerAna.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})})</span>`;
            }
        }

        detailsHTML = `
            <strong>প্রাপ্ত পাকা সোনার ওজন:</strong> ${pureGoldEq.toFixed(3)} গ্রাম / ${gramsToAnaString(pureGoldEq)}<hr>
            <strong>বাদ গেছে:</strong> ${deductionInGrams.toFixed(3)} গ্রাম / ${gramsToAnaString(deductionInGrams)}<hr>
            <strong>অতিরিক্ত সোনা কিনতে হবে:</strong> ${deficitWeight.toFixed(3)} গ্রাম / ${gramsToAnaString(deficitWeight)}<hr>
            <strong>অতিরিক্ত সোনার মূল্য:</strong> ₹${costOfDeficitGold.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}${pricePerAnaText}<br>
            <strong>নতুন গহনার (${newWeight} গ্রাম) মজুরি:</strong> ₹${totalMakingCharge.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}<br>
            <strong>সাবটোটাল (মূল্য + মজুরি):</strong> ₹${subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}<br>
            <strong>GST (${gstPercent}%):</strong> ₹${gstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
        `;
        summaryHTML = `<strong style="font-size: 1.2em;">সর্বমোট প্রদেয় মূল্য: <span style="color: var(--primary-dark);">₹${totalPayable.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></strong>`;
        Object.assign(otn_calculationResult, { totalPayable, costOfDeficitGold, totalMakingCharge, subtotal, gstAmount, deficitWeight, deductionInGrams });
    }

    otn_calculationResult.detailsHTML = detailsHTML; 

    $('#otn_oldToNewOutput').innerHTML = `
        <div style="margin-bottom: 8px;">${summaryHTML}</div>
        <button class="otn_btn-details" onclick="otn_toggleDetails(this)">সম্পূর্ণ হিসাব দেখুন</button>
        <div id="otn_calculation-details" style="display: none;">${detailsHTML}</div>
    `;
}

function otn_toggleDetails(button) {
    const details = $('#otn_calculation-details');
    if (details.style.display === 'none') {
        details.style.display = 'block';
        button.textContent = 'সম্পূর্ণ হিসাব';
    } else {
        details.style.display = 'none';
        button.textContent = 'সম্পূর্ণ হিসাব দেখুন';
    }
}

function otn_resetOldToNew() {
    $('#otn_customerName').value = '';
    $('#otn_customerMobile').value = '';
    $('#otn_OldWeight').value = '10';
    $('#otn_OldWeightInAna').value = (10 * GRAMS_TO_ANA_RATE).toFixed(3);
    $('#otn_OldType').value = 'bengali';
    $('#otn_NewWeight').value = '10';
    $('#otn_NewWeightInAna').value = (10 * GRAMS_TO_ANA_RATE).toFixed(3);
    $('#otn_NewType').value = 'Licence';
    $('#otn_BasePrice24ct').value = '126000';
    $('#otn_MakingCharge').value = '500';
    $('#otn_GstPercent').value = '3';
    otn_calculateOldToNew();
}

function otn_generateBillHTML() {
    const customerName = $('#otn_customerName').value || 'N/A';
    const customerMobile = $('#otn_customerMobile').value || 'N/A';
    const now = new Date();
    const dateStr = now.toLocaleDateString('bn-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('bn-IN', { hour: '2-digit', minute: '2-digit' });

    let finalAmountText = '';
    if (otn_calculationResult.hasOwnProperty('totalPayable')) {
        finalAmountText = `<tr><td colspan="3" style="text-align: right; font-weight: bold; font-size: 1.2em;">সর্বমোট প্রদেয় মূল্য:</td><td style="text-align:right; font-weight: bold; font-size: 1.2em;">₹${otn_calculationResult.totalPayable.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td></tr>`;
    } else if (otn_calculationResult.hasOwnProperty('finalPayable') && otn_calculationResult.finalPayable > 0.01) {
        finalAmountText = `<tr><td colspan="3" style="text-align: right; font-weight: bold; font-size: 1.2em;">সর্বমোট প্রদেয় মূল্য:</td><td style="text-align:right; font-weight: bold; font-size: 1.2em;">₹${otn_calculationResult.finalPayable.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td></tr>`;
    } else {
         finalAmountText = `<tr><td colspan="3" style="text-align: right; font-weight: bold; font-size: 1.2em;">দোকান ফেরত দেবে:</td><td style="text-align:right; font-weight: bold; font-size: 1.2em;">₹${(otn_calculationResult.finalRefundable || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td></tr>`;
    }

    return `
        <div style="font-family: 'Noto Sans Bengali', sans-serif; color: #0f172a; padding: 15px;">
            <div style="text-align: center; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 28px; color: #0284c7;">সোলেমান জুয়েলার্স</h2>
                <p style="margin: 5px 0;">ঠিকানা: ভাদুরিয়াপাড়া বাজার | মোবাইল: 8967575884</p>
                <p style="margin: 5px 0; font-size: 12px;">GSTIN: 19BMZPR4273E1Z9 | BIS Licence: HM/C-5191720314</p>
                <h3 style="margin: 15px 0 5px; font-size: 20px; color: #1e293b;">গহনা বিনিময়ের বিল</h3>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <div><strong>গ্রাহকের নাম:</strong> ${customerName}</div>
                <div><strong>তারিখ:</strong> ${dateStr}</div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <div><strong>মোবাইল নম্বর:</strong> ${customerMobile}</div>
                <div><strong>সময়:</strong> ${timeStr}</div>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                    <tr style="background-color: #f1f5f9;">
                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #cbd5e1;">বিবরণ</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 1px solid #cbd5e1;">ওজন (গ্রাম)</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 1px solid #cbd5e1;">হার (₹)</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 1px solid #cbd5e1;">মোট (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td colspan="4" style="background: #f1f5f9; font-weight:bold;">পুরাতন গহনা</td></tr>
                    <tr><td>${otn_calculationResult.oldType}</td><td style="text-align: right;">${otn_calculationResult.oldWeight.toFixed(3)} গ্রাম</td><td>-</td><td>-</td></tr>
                    <tr><td colspan="3" style="text-align: right;">বাদ গেছে:</td><td style="text-align: right;">${(otn_calculationResult.deductionInGrams || 0).toFixed(3)} গ্রাম</td></tr>
                    <tr><td colspan="3" style="text-align: right; font-weight:bold;">প্রাপ্ত পাকা সোনার ওজন:</td><td style="text-align: right; font-weight:bold;">${(otn_calculationResult.pureGoldEq || 0).toFixed(3)} গ্রাম</td></tr>
                    
                    <tr><td colspan="4" style="background: #f1f5f9; font-weight:bold;">নতুন গহনা</td></tr>
                    <tr><td>${otn_calculationResult.newType}</td><td style="text-align: right;">${otn_calculationResult.newWeight.toFixed(3)} গ্রাম</td><td>-</td><td>-</td></tr>
                    
                    ${otn_calculationResult.deficitWeight > 0.001 ? `
                    <tr><td colspan="2">অতিরিক্ত সোনা কিনতে হবে (${otn_calculationResult.deficitWeight.toFixed(3)} গ্রাম)</td><td style="text-align: right;">-</td><td style="text-align: right;">${(otn_calculationResult.costOfDeficitGold || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td></tr>
                    <tr><td colspan="2">নতুন গহনার মজুরি (${otn_calculationResult.newWeight.toFixed(3)} গ্রাম)</td><td style="text-align: right;">${otn_calculationResult.makingCharge}/গ্রাম</td><td style="text-align: right;">${(otn_calculationResult.totalMakingCharge || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td></tr>
                    <tr><td colspan="3" style="text-align: right;">সাবটোটাল:</td><td style="text-align: right;">${(otn_calculationResult.subtotal || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td></tr>
                    <tr><td colspan="3" style="text-align: right;">GST (${otn_calculationResult.gstPercent}%):</td><td style="text-align: right;">${(otn_calculationResult.gstAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td></tr>
                    ` : `
                    <tr><td colspan="2">নতুন গহনার মজুরি (${otn_calculationResult.newWeight.toFixed(3)} গ্রাম)</td><td style="text-align: right;">${otn_calculationResult.makingCharge}/গ্রাম</td><td style="text-align: right;">${(otn_calculationResult.totalMakingCharge || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td></tr>
                    <tr><td colspan="3" style="text-align: right;">অতিরিক্ত সোনার জন্য ক্রেডিট:</td><td style="text-align: right;">- ₹${(otn_calculationResult.creditValue || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td></tr>
                    `}
                </tbody>
                <tfoot>
                    <tr style="border-top: 2px solid #94a3b8;">
                        ${finalAmountText}
                    </tr>
                </tfoot>
            </table>
             <div style="margin-top: 30px; text-align: right;">
                <p style="margin: 0;">--------------------------</p>
                <p style="margin: 5px 0;">স্বাক্ষর</p>
            </div>
        </div>
    `;
}

function otn_previewBill() {
    otn_calculateOldToNew(); // প্রথমে হিসাবটি পুনরায় করুন
    if (!otn_calculationResult.pureGoldEq || otn_calculationResult.pureGoldEq <= 0) {
        alert("অনুগ্রহ করে সঠিক তথ্য পূরণ করুন।");
        return;
    }
    const billContent = otn_generateBillHTML();
    $('#otn_bill-preview-content').innerHTML = billContent;
    $('#otn_bill-preview-modal').style.display = 'flex';
}

function otn_closeModal() {
    $('#otn_bill-preview-modal').style.display = 'none';
}

function otn_printBill() {
    otn_calculateOldToNew(); // প্রথমে হিসাবটি পুনরায় করুন
    if (!otn_calculationResult.pureGoldEq || otn_calculationResult.pureGoldEq <= 0) {
        alert("প্রিন্ট করার আগে অনুগ্রহ করে সঠিক তথ্য পূরণ করুন।");
        return;
    }
    const billContent = otn_generateBillHTML();
    const printWindow = window.open('', '', 'height=800,width=800');
    printWindow.document.write('<html><head><title>Bill</title>');
    printWindow.document.write('<style>@import url("https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap"); body { font-family: "Noto Sans Bengali", sans-serif; margin: 20px; }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(billContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    setTimeout(() => { 
        printWindow.print();
    }, 500);
}

// --- Utility for Ana Displays (if needed) ---
function updateAllAnaDisplays() {
  // Placeholder if needed for future
}

// --- INITIALIZATION ---
window.onload = function() {
  $('#todayDate').textContent = new Date().toLocaleDateString('bn-BD',{year:'numeric',month:'long',day:'numeric'});
  loadSettings();
  
  // --- ANA/GRAM CONVERSION LISTENERS ---
  let isCalculating = false;
  function setupWeightConversion(gramId, anaId) {
      const gramInput = $(`#${gramId}`);
      const anaInput = $(`#${anaId}`);
      
      gramInput.addEventListener('input', () => {
          if (isCalculating) return;
          isCalculating = true;
          const grams = getVal(gramId);
          anaInput.value = grams > 0 ? (grams * GRAMS_TO_ANA_RATE).toFixed(3) : '';
          isCalculating = false;
      });

      anaInput.addEventListener('input', () => {
          if (isCalculating) return;
          isCalculating = true;
          const anas = getVal(anaId);
          gramInput.value = anas > 0 ? (anas / GRAMS_TO_ANA_RATE).toFixed(3) : '0';
          gramInput.dispatchEvent(new Event('input', { bubbles: true }));
          isCalculating = false;
      });
  }
  
  // Setup for all tabs
  setupWeightConversion('profitWeight', 'profitWeightInAna');
  setupWeightConversion('newWeight', 'newWeightInAna');
  setupWeightConversion('oldWeight', 'oldWeightInAna');
  setupWeightConversion('newWeightSilver', 'newWeightSilverInAna');
  setupWeightConversion('oldWeightSilver', 'oldWeightSilverInAna');
  setupWeightConversion('otn_OldWeight', 'otn_OldWeightInAna');
  setupWeightConversion('otn_NewWeight', 'otn_NewWeightInAna');

  // Main Event Listeners for Real-time Calculation
  document.querySelectorAll('#profit input, #profit select').forEach(input => {
    input.addEventListener('input', () => {
        calculateProfit();
    });
  });
  document.querySelectorAll('#exchange input, #exchange select').forEach(input => {
      input.addEventListener('input', () => {
          calculateExchange(false);
        });
    });
  document.querySelectorAll('#silverExchange input, #silverExchange select').forEach(input => {
      input.addEventListener('input', () => {
          calculateSilverExchange(false);
        });
    });
  document.querySelectorAll('#oldToNew input, #oldToNew select').forEach(input => {
      input.addEventListener('input', otn_calculateOldToNew);
  });
  
  // Modal close listeners
  const modal = $('#billDetailsModal');
  $('#modalCloseBtn').onclick = () => { modal.style.display = 'none'; };
  modal.onclick = (event) => { if (event.target === modal) { modal.style.display = 'none'; } };
  const otnModal = $('#otn_bill-preview-modal');
  otnModal.onclick = (event) => { if (event.target === otnModal) { otnModal.style.display = 'none'; } };

  // Initial setup
  openTab('profit');
  resetProfit(); 
  resetExchange(); 
  resetSilverExchange();
  otn_resetOldToNew();
  fetchLivePrice();
};
