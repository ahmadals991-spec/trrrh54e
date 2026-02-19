// إعدادات Firebase كما طلبت
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";

const firebaseConfig = {
    apiKey: "AIzaSyBQ9R33BlgaK-TXhnvIqFvSebpROzR9Ewk",
    authDomain: "iuiouu.firebaseapp.com",
    projectId: "iuiouu",
    storageBucket: "iuiouu.firebasestorage.app",
    messagingSenderId: "637429957373",
    appId: "1:637429957373:web:a5a4335851c922b6fc7494"
};
const app = initializeApp(firebaseConfig);

// مصفوفات لتخزين البيانات محلياً
let inventory = JSON.parse(localStorage.getItem('myInventory')) || [];
let salesHistory = JSON.parse(localStorage.getItem('mySalesHistory')) || [];
let cart = [];

// دالة تنسيق العملة (الدينار العراقي)
function formatCurrency(amount) {
    return Number(amount).toLocaleString('en-US') + ' دينار';
}

// دالة التنبيهات المتحركة (بديل alert)
function showCustomAlert(message, type = 'error') {
    const container = document.getElementById('customAlertContainer');
    const alertBox = document.createElement('div');
    alertBox.className = `custom-alert ${type}`;
    alertBox.innerText = message;
    container.appendChild(alertBox);
    setTimeout(() => {
        alertBox.remove();
    }, 3000);
}

// دالة التبديل بين التبويبات
window.switchTab = function(tabId) {
    document.querySelectorAll('.container').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tabs button').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');
    
    updateDatalist();
    if(tabId === 'historyTab') renderHistory();
};

// --- قسم المخزون ---
window.saveItem = function() {
    let name = document.getElementById('itemName').value;
    let price = parseFloat(document.getElementById('itemPrice').value);
    let qty = parseInt(document.getElementById('itemQty').value);
    let editIndex = document.getElementById('editIndex').value;

    if(!name || !price || !qty) {
        showCustomAlert("يرجى تعبئة جميع الحقول!");
        return;
    }

    if(editIndex === "") {
        inventory.push({ name, price, qty });
        showCustomAlert("تمت إضافة السلعة بنجاح", "success");
    } else {
        inventory[editIndex] = { name, price, qty };
        document.getElementById('saveBtn').innerText = "إضافة سلعة";
        document.getElementById('editIndex').value = "";
        showCustomAlert("تم تعديل السلعة بنجاح", "success");
    }

    localStorage.setItem('myInventory', JSON.stringify(inventory));
    clearProductForm();
    renderInventory();
    updateDatalist();
};

function clearProductForm() {
    document.getElementById('itemName').value = '';
    document.getElementById('itemPrice').value = '';
    document.getElementById('itemQty').value = '';
}

function renderInventory() {
    let tbody = document.querySelector('#inventoryTable tbody');
    tbody.innerHTML = '';
    inventory.forEach((item, index) => {
        tbody.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td>${formatCurrency(item.price)}</td>
                <td>${item.qty}</td>
                <td>
                    <button class="btn btn-edit" onclick="editItem(${index})">تعديل</button>
                    <button class="btn btn-danger" onclick="deleteItem(${index})">حذف</button>
                </td>
            </tr>
        `;
    });
}

window.deleteItem = function(index) {
    if(confirm("هل أنت متأكد من حذف هذه السلعة؟")) {
        inventory.splice(index, 1);
        localStorage.setItem('myInventory', JSON.stringify(inventory));
        renderInventory();
        updateDatalist();
        showCustomAlert("تم الحذف بنجاح", "success");
    }
};

window.editItem = function(index) {
    let item = inventory[index];
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemPrice').value = item.price;
    document.getElementById('itemQty').value = item.qty;
    document.getElementById('editIndex').value = index;
    document.getElementById('saveBtn').innerText = "حفظ التعديلات";
};

// --- قسم المبيعات (POS) ---
function updateDatalist() {
    let datalist = document.getElementById('itemList');
    datalist.innerHTML = '';
    inventory.forEach(item => {
        if(item.qty > 0) {
            let option = document.createElement('option');
            option.value = item.name;
            datalist.appendChild(option);
        }
    });
}

window.addToCart = function() {
    let searchName = document.getElementById('searchItem').value;
    let qty = parseInt(document.getElementById('saleQty').value);

    let product = inventory.find(i => i.name === searchName);

    if(!product) {
        showCustomAlert("السلعة غير موجودة في المخزون!");
        return;
    }
    if(qty > product.qty) {
        showCustomAlert("الكمية المطلوبة غير متوفرة! المتوفر: " + product.qty);
        return;
    }

    let existingCartItem = cart.find(c => c.name === product.name);
    if(existingCartItem) {
        if(existingCartItem.qty + qty > product.qty) {
            showCustomAlert("لقد تجاوزت الكمية المتاحة في المخزون!");
            return;
        }
        existingCartItem.qty += qty;
    } else {
        cart.push({ name: product.name, price: product.price, qty: qty });
    }

    document.getElementById('searchItem').value = '';
    document.getElementById('saleQty').value = '1';
    renderCart();
};

function renderCart() {
    let tbody = document.querySelector('#cartTable tbody');
    tbody.innerHTML = '';
    let grandTotal = 0;

    cart.forEach((item, index) => {
        let total = item.price * item.qty;
        grandTotal += total;
        tbody.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td>${formatCurrency(item.price)}</td>
                <td>${item.qty}</td>
                <td>${formatCurrency(total)}</td>
                <td><button class="btn btn-danger" onclick="removeFromCart(${index})">إزالة</button></td>
            </tr>
        `;
    });

    document.getElementById('grandTotal').innerText = formatCurrency(grandTotal);
}

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    renderCart();
};

window.checkout = function() {
    if(cart.length === 0) {
        showCustomAlert("الفاتورة فارغة!");
        return;
    }

    let customerName = document.getElementById('customerName').value || 'عميل نقدي';
    let customerPhone = document.getElementById('customerPhone').value || '-';
    let grandTotal = 0;

    cart.forEach(cartItem => {
        let inventoryItem = inventory.find(i => i.name === cartItem.name);
        if(inventoryItem) {
            inventoryItem.qty -= cartItem.qty;
        }
        grandTotal += (cartItem.price * cartItem.qty);
    });

    // حفظ الفاتورة في سجل المبيعات
    let invoice = {
        date: new Date().toLocaleDateString('en-GB'),
        time: new Date().toLocaleTimeString(),
        customerName,
        customerPhone,
        items: [...cart],
        total: grandTotal
    };
    salesHistory.push(invoice);
    localStorage.setItem('mySalesHistory', JSON.stringify(salesHistory));
    localStorage.setItem('myInventory', JSON.stringify(inventory));
    
    showCustomAlert("تم إتمام عملية البيع بنجاح!", "success");
    
    cart = [];
    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    renderCart();
    renderInventory();
    updateDatalist();
    renderHistory();
};

// --- قسم سجل المبيعات ---
function renderHistory() {
    let container = document.getElementById('salesHistoryContainer');
    container.innerHTML = '';
    let todayDate = new Date().toLocaleDateString('en-GB');
    let todayTotal = 0;

    // عكس المصفوفة لعرض الأحدث أولاً
    let reversedHistory = [...salesHistory].reverse();

    reversedHistory.forEach((invoice, reversedIndex) => {
        let originalIndex = salesHistory.length - 1 - reversedIndex;
        
        if(invoice.date === todayDate) {
            todayTotal += invoice.total;
        }

        let itemsHtml = invoice.items.map(i => `<li>${i.name} (الكمية: ${i.qty}) - ${formatCurrency(i.price * i.qty)}</li>`).join('');

        container.innerHTML += `
            <div class="invoice-card">
                <div class="invoice-header">
                    <div>
                        <strong>العميل: ${invoice.customerName}</strong><br>
                        <small>${invoice.date} - ${invoice.time}</small>
                    </div>
                    <div>
                        <strong>المجموع: ${formatCurrency(invoice.total)}</strong>
                    </div>
                </div>
                <ul>${itemsHtml}</ul>
                <button class="btn btn-danger" style="padding: 5px 10px; font-size: 14px;" onclick="deleteInvoice(${originalIndex})">حذف الفاتورة</button>
            </div>
        `;
    });

    document.getElementById('todayTotal').innerText = formatCurrency(todayTotal);
}

window.deleteInvoice = function(index) {
    let pass = prompt("الرجاء إدخال رمز الحذف:");
    if(pass === "1001") {
        salesHistory.splice(index, 1);
        localStorage.setItem('mySalesHistory', JSON.stringify(salesHistory));
        renderHistory();
        showCustomAlert("تم حذف الفاتورة", "success");
    } else if (pass !== null) {
        showCustomAlert("الرمز خاطئ!");
    }
};

window.resetAllData = function() {
    let pass = prompt("الرجاء إدخال رمز تصفير الحسابات (سيتم مسح كل شيء):");
    if(pass === "1001") {
        localStorage.removeItem('myInventory');
        localStorage.removeItem('mySalesHistory');
        inventory = [];
        salesHistory = [];
        renderInventory();
        renderHistory();
        updateDatalist();
        showCustomAlert("تم تصفير جميع البيانات بنجاح", "success");
    } else if (pass !== null) {
        showCustomAlert("الرمز خاطئ!");
    }
};

// --- قسم الإعدادات (النسخ الاحتياطي) ---
window.backupData = function() {
    let data = {
        inventory: inventory,
        salesHistory: salesHistory
    };
    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    let downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "backup_data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showCustomAlert("تم تحميل النسخة الاحتياطية", "success");
};

window.restoreData = function(event) {
    let file = event.target.files[0];
    if (!file) return;

    let reader = new FileReader();
    reader.onload = function(e) {
        try {
            let data = JSON.parse(e.target.result);
            if(data.inventory && data.salesHistory) {
                localStorage.setItem('myInventory', JSON.stringify(data.inventory));
                localStorage.setItem('mySalesHistory', JSON.stringify(data.salesHistory));
                inventory = data.inventory;
                salesHistory = data.salesHistory;
                renderInventory();
                renderHistory();
                updateDatalist();
                showCustomAlert("تم استعادة البيانات بنجاح", "success");
            } else {
                showCustomAlert("ملف النسخة الاحتياطية غير صالح!");
            }
        } catch(err) {
            showCustomAlert("حدث خطأ أثناء قراءة الملف!");
        }
    };
    reader.readAsText(file);
};

// تهيئة النظام عند التحميل
renderInventory();
updateDatalist();
