// إعدادات Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBQ9R33BlgaK-TXhnvIqFvSebpROzR9Ewk",
    authDomain: "iuiouu.firebaseapp.com",
    projectId: "iuiouu",
    storageBucket: "iuiouu.firebasestorage.app",
    messagingSenderId: "637429957373",
    appId: "1:637429957373:web:a5a4335851c922b6fc7494"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// مصفوفات لتخزين البيانات محلياً
let inventory = JSON.parse(localStorage.getItem('myInventory')) || [];

// دوال المزامنة مع Firebase
async function syncToFirebase() {
    try {
        await setDoc(doc(db, "data", "inventory"), { items: inventory });
    } catch (error) {
        console.log("خطأ في المزامنة مع فايربيز:", error);
    }
}

async function loadFromFirebase() {
    try {
        const invDoc = await getDoc(doc(db, "data", "inventory"));
        if (invDoc.exists()) {
            inventory = invDoc.data().items || [];
            localStorage.setItem('myInventory', JSON.stringify(inventory));
        }
        renderAll();
    } catch (error) {
        console.log("تعذر جلب البيانات من فايربيز (ربما تعمل أوفلاين):", error);
    }
}

// دالة تنسيق العملة
function formatCurrency(amount) {
    return Number(amount).toLocaleString('en-US') + ' دينار';
}

// دالة التنبيهات المتحركة
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
    
    if(tabId === 'inventoryTab') renderInventory();
};

function renderAll() {
    renderProducts();
    renderInventory();
}

// --- قسم المنتجات ---
window.saveItem = function() {
    let name = document.getElementById('itemName').value;
    let buyPrice = parseFloat(document.getElementById('itemBuyPrice').value);
    let sellPrice = parseFloat(document.getElementById('itemSellPrice').value);
    let qty = parseInt(document.getElementById('itemQty').value);
    let editIndex = document.getElementById('editIndex').value;

    if(!name || isNaN(buyPrice) || isNaN(sellPrice) || isNaN(qty)) {
        showCustomAlert("يرجى تعبئة جميع الحقول بشكل صحيح!");
        return;
    }

    if(editIndex === "") {
        // عند الإضافة: الكمية المتبقية تساوي الكمية الأصلية
        inventory.push({ name, buyPrice, sellPrice, qty, remQty: qty });
        showCustomAlert("تمت إضافة المنتج بنجاح", "success");
    } else {
        let oldRem = inventory[editIndex].remQty;
        if(oldRem === undefined || oldRem > qty) oldRem = qty;
        
        inventory[editIndex] = { name, buyPrice, sellPrice, qty, remQty: oldRem };
        document.getElementById('saveBtn').innerText = "إضافة منتج";
        document.getElementById('editIndex').value = "";
        showCustomAlert("تم تعديل المنتج بنجاح", "success");
    }

    localStorage.setItem('myInventory', JSON.stringify(inventory));
    syncToFirebase();
    
    clearProductForm();
    renderAll();
};

function clearProductForm() {
    document.getElementById('itemName').value = '';
    document.getElementById('itemBuyPrice').value = '';
    document.getElementById('itemSellPrice').value = '';
    document.getElementById('itemQty').value = '';
}

window.renderProducts = function() {
    let tbody = document.querySelector('#productsTable tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    let totalBuyAmount = 0;

    inventory.forEach((item, index) => {
        totalBuyAmount += ((item.buyPrice || 0) * (item.qty || 0));

        tbody.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td>${formatCurrency(item.buyPrice || 0)}</td>
                <td>${formatCurrency(item.sellPrice || 0)}</td>
                <td>${item.qty}</td>
                <td>
                    <button class="btn btn-edit" style="padding: 6px 12px; font-size: 13px; margin-bottom: 5px; border-radius: 6px;" onclick="editItem(${index})">تعديل</button>
                    <button class="btn btn-danger" style="padding: 6px 12px; font-size: 13px; border-radius: 6px;" onclick="deleteItem(${index})">حذف</button>
                </td>
            </tr>
        `;
    });

    let totalBuyPriceElement = document.getElementById('totalBuyPrice');
    if(totalBuyPriceElement) {
        totalBuyPriceElement.innerText = formatCurrency(totalBuyAmount);
    }
};

window.editItem = function(index) {
    let item = inventory[index];
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemBuyPrice').value = item.buyPrice || 0;
    document.getElementById('itemSellPrice').value = item.sellPrice || 0;
    document.getElementById('itemQty').value = item.qty;
    document.getElementById('editIndex').value = index;
    document.getElementById('saveBtn').innerText = "حفظ التعديلات";
};

window.deleteItem = function(index) {
    if(confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
        inventory.splice(index, 1);
        localStorage.setItem('myInventory', JSON.stringify(inventory));
        syncToFirebase();
        
        renderAll();
        showCustomAlert("تم الحذف بنجاح", "success");
    }
};

// --- قسم الجرد (إدخال المتبقي وحساب المباع والأرباح) ---
window.renderInventory = function() {
    let tbody = document.querySelector('#inventoryTable tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    let currentTotalProfit = 0;

    inventory.forEach((item, index) => {
        if(item.remQty === undefined) item.remQty = item.qty;
        
        let soldQty = item.qty - item.remQty;
        let unitProfit = (item.sellPrice || 0) - (item.buyPrice || 0);
        let profit = soldQty * unitProfit;
        currentTotalProfit += profit;

        tbody.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td>${item.qty}</td>
                <td>
                    <input type="number" min="0" max="${item.qty}" value="${item.remQty}" 
                        oninput="updateRemQty(${index}, this.value)"
                        style="width: 70px; padding: 8px; text-align: center; box-shadow: none;">
                </td>
                <td id="soldQty-${index}">${soldQty}</td>
                <td id="profit-${index}" style="color: var(--secondary-color); font-weight: bold;">${formatCurrency(profit)}</td>
            </tr>
        `;
    });

    document.getElementById('currentTotalProfit').innerText = formatCurrency(currentTotalProfit);
};

window.updateRemQty = function(index, value) {
    let val = parseInt(value);
    if(isNaN(val) || val < 0) val = 0;
    if(val > inventory[index].qty) val = inventory[index].qty;
    
    inventory[index].remQty = val;
    
    // تحديث الأرقام مباشرة في الجدول دون إعادة بناء الصفحة للحفاظ على التركيز (Focus)
    let soldQty = inventory[index].qty - val;
    let unitProfit = (inventory[index].sellPrice || 0) - (inventory[index].buyPrice || 0);
    let profit = soldQty * unitProfit;
    
    document.getElementById(`soldQty-${index}`).innerText = soldQty;
    document.getElementById(`profit-${index}`).innerText = formatCurrency(profit);
    
    // إعادة حساب المجموع الكلي
    let currentTotalProfit = 0;
    inventory.forEach(item => {
        let sQty = item.qty - (item.remQty !== undefined ? item.remQty : item.qty);
        let uProf = (item.sellPrice || 0) - (item.buyPrice || 0);
        currentTotalProfit += (sQty * uProf);
    });
    document.getElementById('currentTotalProfit').innerText = formatCurrency(currentTotalProfit);
    
    localStorage.setItem('myInventory', JSON.stringify(inventory));
    syncToFirebase();
};

window.resetAllData = function() {
    let pass = prompt("الرجاء إدخال رمز تصفير الحسابات (سيتم مسح كل شيء نهائياً):");
    if(pass === "1001") {
        localStorage.removeItem('myInventory');
        inventory = [];
        syncToFirebase();
        
        renderAll();
        showCustomAlert("تم تصفير جميع البيانات بنجاح", "success");
    } else if (pass !== null) {
        showCustomAlert("الرمز خاطئ!");
    }
};

// --- قسم الإعدادات (النسخ الاحتياطي) ---
window.backupData = function() {
    let data = {
        inventory: inventory
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
            if(data.inventory) {
                localStorage.setItem('myInventory', JSON.stringify(data.inventory));
                inventory = data.inventory;
                syncToFirebase();
                
                renderAll();
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
renderAll();
loadFromFirebase();
