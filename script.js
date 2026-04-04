let products = [];
// 1. Получаем текущего пользователя
const currentUser = localStorage.getItem('current_user') || 'guest';
// 2. Загружаем корзину именно для этого пользователя
let cart = JSON.parse(localStorage.getItem(`cart_${currentUser}`)) || [];

let currentFilter = 'ALL';       // Чипсет (NVIDIA/AMD)
let currentMemoryFilter = 'ALL'; // Память
let currentVendorFilter = 'ALL'; // Производитель (ASUS/MSI...)

let allOrders = [];

// --- СОХРАНЕНИЕ КОРЗИНЫ ---
function saveCart() {
    // Сохраняем с уникальным ключом пользователя
    localStorage.setItem(`cart_${currentUser}`, JSON.stringify(cart));
}

// --- ИНИЦИАЛИЗАЦИЯ ---
async function init() {
    try {
        const resp = await fetch('api.php?action=check');
        const session = await resp.json();
        
        // Если сессия на сервере сдохла, а в локале юзер есть - чистим
        if (!session.loggedin) { 
            localStorage.removeItem('current_user');
            window.location.href = 'login.html'; 
            return; 
        }

        const prodResp = await fetch('api.php?action=products');
        products = await prodResp.json();

        filterProducts();
        updateCartCount();
    } catch (e) {
        console.error("Ошибка инициализации:", e);
    }
}

async function logout() {
    await fetch('api.php?action=logout');
    // При выходе удаляем только пометку о текущем юзере
    // Сама корзина останется в localStorage под его именем до следующего входа
    localStorage.removeItem('current_user'); 
    window.location.href = 'login.html';
}

// --- ФИЛЬТРЫ (ВСЕ ТРИ РАБОТАЮТ ОДИНАКОВО) ---

// Чипсет (NVIDIA/AMD)
function setFilter(brand) {
    currentFilter = brand;
    const buttons = document.querySelectorAll('#brand-buttons .filter-btn');
    buttons.forEach(btn => {
        const text = btn.innerText.trim();
        btn.classList.toggle('active', text === brand || (brand === 'ALL' && text === 'Все'));
    });
    filterProducts();
}

// Производитель (ASUS/MSI...)
function setVendorFilter(vendor) {
    currentVendorFilter = vendor;
    const buttons = document.querySelectorAll('#vendor-buttons .filter-btn');
    buttons.forEach(btn => {
        const text = btn.innerText.trim();
        btn.classList.toggle('active', text === vendor || (vendor === 'ALL' && text === 'Все'));
    });
    filterProducts();
}

// Память
function setMemoryFilter(size) {
    currentMemoryFilter = size;
    const buttons = document.querySelectorAll('#memory-buttons .filter-btn');
    buttons.forEach(btn => {
        const text = btn.innerText.trim();
        btn.classList.toggle('active', text === size || (size === 'ALL' && text === 'Все'));
    });
    filterProducts();
}

function filterProducts() {
    const search = document.getElementById('search-input')?.value.toLowerCase() || "";
    
    // Получаем значения цен и переводим в числа
    const minPrice = parseFloat(document.getElementById('price-min').value) || 0;
    const maxPrice = parseFloat(document.getElementById('price-max').value) || Infinity;

    const filtered = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search);
        const matchesBrand = (currentFilter === 'ALL' || p.brand === currentFilter);
        const matchesMemory = (currentMemoryFilter === 'ALL' || p.memory === currentMemoryFilter);
        const matchesVendor = (currentVendorFilter === 'ALL' || p.vendor === currentVendorFilter);
        
        // Проверка цены
        const matchesPrice = p.price >= minPrice && p.price <= maxPrice;

        return matchesSearch && matchesBrand && matchesMemory && matchesVendor && matchesPrice;
    });

    renderGrid(filtered);
}

// --- ОТРИСОВКА ---
function renderGrid(list) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    // Сначала очищаем сетку и проверяем, есть ли товары
    grid.innerHTML = list.length ? '' : '<p style="color:white; padding:20px;">Ничего не найдено</p>';

    list.forEach(p => {
        // !!! ПЕРЕМЕННЫЕ ДОЛЖНЫ БЫТЬ ВНУТРИ ЦИКЛА, ЧТОБЫ ВИДЕТЬ ТОВАР 'p' !!!
        const isBtnDisabled = p.inStock == 0 || currentUser === 'admin';
        const btnText = currentUser === 'admin' ? 'Режим админа' : (p.inStock == 1 ? 'В корзину' : 'Нет в наличии');
        
        const div = document.createElement('div');
        div.className = 'product-card';
        div.onclick = () => openModal(p.id);

        div.innerHTML = `
            <img src="${p.image}" class="product-image" onerror="this.src='logo/VCard.png'">
            <div class="product-info">
                <div class="brand-badge">${p.brand}</div>
                <h3>${p.vendor} ${p.name}</h3>
                <p class="product-memory">Память: ${p.memory}</p>
                <p class="product-price">${Number(p.price).toLocaleString()} ₽</p> 
                
                <button class="add-to-cart-btn" 
                    onclick="event.stopPropagation(); addToCart(${p.id})"
                    ${isBtnDisabled ? 'disabled style="background: #30363d; cursor: not-allowed;"' : ''}>
                    ${btnText}
                </button>
            </div>`;
        grid.appendChild(div);
    });
}

// --- МОДАЛКА ---
function openModal(id) {
    const p = products.find(x => x.id == id);
    if (!p) return;

    // Проверяем наличие: 1 - есть, 0 - нет
    const isAvailable = Number(p.inStock) === 1;
    
    // Формируем кнопку заранее
    const buyButton = isAvailable 
        ? `<button class="checkout-button" onclick="addToCart(${p.id})">Добавить в корзину</button>`
        : `<button class="checkout-button" style="background-color: #4b5563; cursor: not-allowed;" disabled>Нет в наличии</button>`;

    document.getElementById('modal-details').innerHTML = `
        <div class="modal-grid">
            <img src="${p.image}" class="modal-img" onerror="this.src='logo/VCard.png'">
            <div class="modal-info-text">
                <h2>${p.vendor} ${p.name}</h2>
                <p><strong>Бренд:</strong> ${p.brand}</p>
                <p><strong>Производитель:</strong> ${p.vendor}</p>
                <p><strong>Объем памяти:</strong> ${p.memory}</p>
                <p><strong>Статус:</strong> 
                    <span style="color: ${isAvailable ? '#22c55e' : '#ef4444'}">
                        ${isAvailable ? 'В наличии' : 'Нет в наличии'}
                    </span>
                </p>
                <p><strong>Дата выхода:</strong> ${formatDate(p.release_date)}</p>
                <hr style="border: 0; border-top: 1px solid #30363d; margin: 15px 0;">
                <h3>Цена: ${Number(p.price).toLocaleString()} ₽</h3>
                ${buyButton}
            </div>
        </div>`;

    document.getElementById('product-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('product-modal').style.display = 'none';
}

// --- КОРЗИНА ---
function addToCart(id) {
    if (currentUser === 'admin') {
        alert('Администратор не может совершать покупки');
        return;
    }

    const p = products.find(x => x.id == id);
    if (!p) return;

    // ВОТ ЭТОЙ СТРОКИ НЕ ХВАТАЛО:
    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1;
    } else {
        cart.push({ ...p, quantity: 1 });
    }

    saveCart();
    updateCartCount();
    updateCartDisplay();
    alert('Товар добавлен в корзину');
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartCount();
    updateCartDisplay();
}

function updateCartCount() {
    const countEl = document.getElementById('cart-count');
    if (countEl) countEl.innerText = cart.length;
}

function toggleCart() { showScreen('cart-view'); updateCartDisplay(); }

function showCart() {
    document.getElementById('product-grid').classList.add('hidden');
    document.getElementById('main-controls').classList.add('hidden');
    const cartView = document.getElementById('cart-view');
    cartView.classList.remove('hidden');
    cartView.style.display = 'block';
    updateCartDisplay();
}

function showProducts() { showScreen('products'); }

function openOrderModal() {
    document.getElementById('order-modal').style.display = 'flex';
}

function closeOrderModal() {
    document.getElementById('order-modal').style.display = 'none';
}

async function submitOrder(event) {
    event.preventDefault();

    const address = `Г. ${document.getElementById('order-city').value}, ул. ${document.getElementById('order-street').value}, д. ${document.getElementById('order-house').value}, под. ${document.getElementById('order-ent').value || '-'}, кв. ${document.getElementById('order-flat').value || '-'}`;

    const orderData = {
        items: cart, // Весь массив корзины
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        address: address
    };

    try {
        const resp = await fetch('api.php?action=create_order', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
        const result = await resp.json();

        if (result.success) {
            alert('Заказ успешно оформлен!');
            cart = []; // Чистим корзину
            saveCart();
            updateCartCount();
            closeOrderModal();
            showProducts(); // Возвращаемся в каталог
        } else {
            alert('Ошибка: ' + result.error);
        }
    } catch (e) {
        console.error(e);
    }
}

// --- ИСТОРИЯ ЗАКАЗОВ ---

async function showHistory() {
    showScreen('profile-view');
    const infoDiv = document.getElementById('profile-info');
    infoDiv.innerHTML = '<h3>Загрузка истории...</h3>';

    try {
        const resp = await fetch('api.php?action=get_history');
        const orders = await resp.json();

        let html = `<h2>История заказов</h2><button class="filter-btn" onclick="showProfile()">← Назад в профиль</button><br><br>`;
        
        if (orders.length === 0) {
            html += '<p>Вы еще ничего не заказывали</p>';
        } else {
            orders.forEach(ord => {
                const items = JSON.parse(ord.items);
                const itemsList = items.map(i => `${i.vendor} ${i.name} (${i.quantity} шт.)`).join(', ');
                
                // --- ВОТ ТУТ ГЕНЕРИРУЕМ КОД ---
                const orderCode = generateOrderCode(ord.id); 

                html += `
                <div class="order-card" onclick='openOrderDetails(${JSON.stringify(ord)})'>
                    <p><strong>Заказ <span style="color:#22c55e">${orderCode}</span> от ${formatDate(ord.created_at)}</strong></p>
                    <p class="order-items-preview">${itemsList}</p>
                    <p>Сумма: <strong>${Number(ord.total_price).toLocaleString()} ₽</strong></p>
                    <p>Статус: <span style="color:#22c55e">${ord.status}</span></p>
                </div>`;
            });
        }
        infoDiv.innerHTML = html;
    } catch (e) {
        infoDiv.innerHTML = '<p>Ошибка загрузки истории</p>';
    }
}

function generateOrderCode(id) {
    // Используем хеширование или просто превращаем ID в строку с префиксом
    // Чтобы код был уникальным для каждого заказа, но постоянным
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // без похожих 0/O, 1/I
    let code = "";
    let n = id * 12345; // "засаливаем" ID, чтобы коды не шли просто 1, 2, 3...
    
    for (let i = 0; i < 6; i++) {
        code += alphabet.charAt(n % alphabet.length);
        n = Math.floor(n / alphabet.length);
    }
    return `#${code}`;
}

function openOrderDetails(ord) {
    const items = JSON.parse(ord.items);
    
    // Генерируем тот же самый код на основе ID из базы
    const orderCode = generateOrderCode(ord.id); 

    let itemsHtml = items.map(i => `
        <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:5px;">
            <span>${i.vendor} ${i.name} (${i.quantity} шт.)</span>
            <span>${(i.price * i.quantity).toLocaleString()} ₽</span>
        </div>
    `).join('');

    document.getElementById('order-full-info').innerHTML = `
        <h2 style="color:#22c55e;">Заказ ${orderCode}</h2>
        <p><strong>Дата:</strong> ${formatDate(ord.created_at)}</p>
        <p><strong>Статус:</strong> <span style="color:#22c55e;">${ord.status}</span></p>
        <hr style="border: 0; border-top: 1px solid #333; margin: 15px 0;">
        <h4 style="margin-bottom:10px;">Товары:</h4>
        ${itemsHtml}
        <hr style="border: 0; border-top: 1px solid #333; margin: 15px 0;">
        <p><strong>Адрес доставки:</strong><br>${ord.address || 'Адрес не указан'}</p>
        <h3 style="text-align:right; color:#22c55e; margin-top:20px;">Итого: ${Number(ord.total_price).toLocaleString()} ₽</h3>
    `;

    document.getElementById('order-details-modal').style.display = 'flex';
}

function closeOrderDetailsModal() {
    document.getElementById('order-details-modal').style.display = 'none';
}

function showProfile() {
    showScreen('profile-view');
    const userName = localStorage.getItem('current_user') || 'Пользователь';
    
    let adminButton = '';
    // Если зашел админ, добавляем кнопку перехода в панель
    if (userName === 'admin') {
        adminButton = `<button class="filter-btn" style="width:100%; margin-bottom:10px; background-color: #eab308; color: black;" onclick="showAdminPanel()">Админ-панель</button>`;
    }

    document.getElementById('profile-info').innerHTML = `
        <div class="profile-card">
            <h2>Личный кабинет</h2>
            <p><strong>Логин:</strong> ${userName}</p>
            <p><strong>Статус:</strong> ${userName === 'admin' ? 'Администратор' : 'Постоянный покупатель'}</p>
            <br>
            ${adminButton}
            <button class="filter-btn" style="width:100%; margin-bottom:10px;" onclick="showHistory()">История моих заказов</button>
            <button class="logout-btn-big" onclick="logout()">Выйти из аккаунта</button>
        </div>
    `;
}

function changeQuantity(id, delta) {
    const item = cart.find(item => item.id === id);
    if (!item) return;

    item.quantity = (item.quantity || 1) + delta;

    // Если количество стало 0 или меньше — выкидываем из корзины
    if (item.quantity <= 0) {
        cart = cart.filter(item => item.id !== id);
    }

    saveCart();
    updateCartCount();
    updateCartDisplay();
}

function updateCartDisplay() {
    const itemsDiv = document.getElementById('cart-items');
    const totalDiv = document.getElementById('cart-total');
    const emptyDiv = document.getElementById('empty-cart');

    if (cart.length === 0) {
        emptyDiv.classList.remove('hidden');
        itemsDiv.innerHTML = '';
        totalDiv.classList.add('hidden');
        return;
    }

    emptyDiv.classList.add('hidden');
    totalDiv.classList.remove('hidden');

    let totalMoney = 0;
    itemsDiv.innerHTML = cart.map((p) => {
        // Если вдруг quantity потерялся, считаем как 1
        const qty = p.quantity || 1;
        const itemTotal = Number(p.price) * qty;
        totalMoney += itemTotal;

        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${p.vendor} ${p.name}</h4>
                    <div class="cart-controls-row">
                        <button class="qty-btn" onclick="changeQuantity(${p.id}, -1)">-</button>
                        <span class="qty-num">${qty}</span>
                        <button class="qty-btn" onclick="changeQuantity(${p.id}, 1)">+</button>
                        <span class="price-each">× ${Number(p.price).toLocaleString()} ₽</span>
                    </div>
                </div>
                <div class="cart-item-right">
                    <strong>${itemTotal.toLocaleString()} ₽</strong>
                    <button class="remove-btn-small" onclick="changeQuantity(${p.id}, -${qty})">Удалить</button>
                </div>
            </div>`;
    }).join('');

    document.getElementById('total-amount').innerText = totalMoney.toLocaleString() + ' ₽';
}

function displayProducts() { filterProducts(); }

async function logout() {
    await fetch('api.php?action=logout');
    window.location.href = 'login.html';
}

window.onload = init;
window.onclick = (e) => {
    if (e.target === document.getElementById('product-modal')) closeModal();
};

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU');
}

function showScreen(screenId) {
    // Скрываем вообще всё
    document.getElementById('product-grid').classList.add('hidden');
    document.getElementById('main-controls').classList.add('hidden');
    document.getElementById('cart-view').classList.add('hidden');
    document.getElementById('profile-view').classList.add('hidden');

    // Показываем только то, что нужно
    if (screenId === 'products') {
        document.getElementById('product-grid').classList.remove('hidden');
        document.getElementById('main-controls').classList.remove('hidden');
    } else {
        document.getElementById(screenId).classList.remove('hidden');
    }
}

async function showAdminPanel() {
    showScreen('admin-view');
    const listDiv = document.getElementById('admin-orders-list');
    listDiv.innerHTML = '<h3 style="color:white">Загрузка всех заказов...</h3>';

    try {
        // Нам нужен новый action в api.php, который отдает ВООБЩЕ ВСЕ заказы
        const resp = await fetch('api.php?action=get_all_orders');
        allOrders = await resp.json();
        renderAdminOrders(allOrders);
    } catch (e) {
        listDiv.innerHTML = '<p style="color:red">Ошибка доступа. Вы не админ или сессия истекла.</p>';
    }
}

function renderAdminOrders(orders) {
    const listDiv = document.getElementById('admin-orders-list');
    listDiv.innerHTML = '';

    if (orders.length === 0) {
        listDiv.innerHTML = '<p style="color:#888; grid-column: 1/-1; text-align:center;">Заказов не найдено</p>';
        return;
    }

    orders.forEach(ord => {
        const orderCode = generateOrderCode(ord.id);
        const items = JSON.parse(ord.items);
        
        const div = document.createElement('div');
        div.className = 'admin-card';
        // Добавляем ID элементу, чтобы легко удалить его из DOM
        div.id = `order-row-${ord.id}`; 
        
        div.innerHTML = `
            <div style="border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 10px;">
                <span style="color:#22c55e; font-weight:bold;">${orderCode}</span>
                <span style="color:#888; float:right;">@${ord.username}</span>
            </div>
            <p style="font-size: 0.9em; height: 40px; overflow: hidden; color: #ccc;">
                ${items.map(i => i.name).join(', ')}
            </p>
            <p style="font-weight:bold; margin-top:10px;">${Number(ord.total_price).toLocaleString()} ₽</p>
            
            <div class="admin-actions">
                <button class="btn-more" onclick='openOrderDetails(${JSON.stringify(ord)})'>Подробнее</button>
                <button class="btn-delete" onclick="deleteOrder(${ord.id})">
                    🗑️ Удалить
                </button>
            </div>
        `;
        listDiv.appendChild(div);
    });
}

// Исправленное удаление (с мгновенным исчезновением)
async function deleteOrder(id) {
    if (!confirm('Удалить этот заказ навсегда?')) return;

    try {
        const resp = await fetch(`api.php?action=delete_order&id=${id}`, { method: 'POST' });
        const result = await resp.json();

        if (result.success) {
            // 1. Удаляем из глобального массива, чтобы поиск продолжал работать корректно
            allOrders = allOrders.filter(o => o.id !== id);
            
            // 2. Мгновенно удаляем элемент из DOM с анимацией (опционально)
            const element = document.getElementById(`order-row-${id}`);
            if (element) {
                element.style.opacity = '0';
                element.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    element.remove();
                    // Если после удаления заказов не осталось, пишем "Пусто"
                    if (allOrders.length === 0) renderAdminOrders([]);
                }, 200);
            }
        } else {
            alert('Ошибка сервера: ' + result.error);
        }
    } catch (e) {
        console.error("Ошибка при удалении:", e);
        alert('Не удалось связаться с сервером');
    }
}

// Обновляем функцию переключения экранов
function showScreen(screenId) {
    const screens = ['product-grid', 'main-controls', 'cart-view', 'profile-view', 'admin-view'];
    screens.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.classList.add('hidden');
    });

    if (screenId === 'products') {
        document.getElementById('product-grid').classList.remove('hidden');
        document.getElementById('main-controls').classList.remove('hidden');
    } else {
        document.getElementById(screenId).classList.remove('hidden');
    }
}

function filterAdminOrders() {
    const searchInput = document.getElementById('admin-search');
    if (!searchInput) return;

    const query = searchInput.value.toLowerCase().trim();
    
    // Фильтруем оригинальный массив allOrders
    const filtered = allOrders.filter(ord => {
        const orderCode = generateOrderCode(ord.id).toLowerCase(); // Например "#abc123"
        const userName = (ord.username || "").toLowerCase();
        
        // Ищем либо по логину, либо по коду (включая вариант без решетки)
        return userName.includes(query) || 
               orderCode.includes(query) || 
               orderCode.replace('#', '').includes(query);
    });

    renderAdminOrders(filtered);
}