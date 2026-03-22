let products = [];
let cart = JSON.parse(localStorage.getItem('my_cart')) || [];

let currentFilter = 'ALL';
let currentMemoryFilter = 'ALL';

// --- СОХРАНЕНИЕ КОРЗИНЫ ---
function saveCart() {
    localStorage.setItem('my_cart', JSON.stringify(cart));
}

// --- ИНИЦИАЛИЗАЦИЯ ---
async function init() {
    try {
        const resp = await fetch('api.php?action=check');
        const session = await resp.json();
        if (!session.loggedin) { 
            window.location.href = 'login.html'; 
            return; 
        }
        
        const prodResp = await fetch('api.php?action=products');
        products = await prodResp.json();

        displayProducts();
        updateCartCount();
        console.log(products);

    } catch (e) {
        console.error("Ошибка инициализации:", e);
    }
}

// --- ФИЛЬТРЫ ---
function setFilter(brand) {
    currentFilter = brand;

    document.querySelectorAll('.filter-buttons:not(#memory-buttons) .filter-btn')
        .forEach(btn => {
            const text = btn.innerText.trim();
            btn.classList.toggle('active', 
                text === brand || (brand === 'ALL' && text === 'Все бренды'));
        });

    showProducts();
    filterProducts();
}

function setMemoryFilter(size) {
    currentMemoryFilter = size;

    document.querySelectorAll('#memory-buttons .filter-btn')
        .forEach(btn => {
            const text = btn.innerText.trim();
            btn.classList.toggle('active', 
                text === size || (size === 'ALL' && text === 'Все'));
        });

    showProducts();
    filterProducts();
}

function filterProducts() {
    const search = document.getElementById('search-input')?.value.toLowerCase() || "";

    const filtered = products.filter(p => {
        return (
            p.name.toLowerCase().includes(search) &&
            (currentFilter === 'ALL' || p.brand === currentFilter) &&
            (currentMemoryFilter === 'ALL' || p.memory === currentMemoryFilter)
        );
    });

    renderGrid(filtered);
}

// --- ОТРИСОВКА ---
function renderGrid(list) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    grid.innerHTML = list.length 
        ? '' 
        : '<p style="color:white; padding:20px;">Ничего не найдено</p>';

    list.forEach(p => {
        const div = document.createElement('div');
        div.className = 'product-card';
        div.onclick = () => openModal(p.id);

        div.innerHTML = `
            <img src="${p.image}" class="product-image" onerror="this.src='logo/VCard.png'">
            <div class="product-info">
                <div class="brand-badge">${p.brand}</div>
                <h3>${p.vendor} ${p.name}</h3>
                <p class="product-memory">Память: ${p.memory}</p>
                <p class="product-price">${p.price} ₽</p> 
                <button class="add-to-cart-btn"
                    onclick="event.stopPropagation(); addToCart(${p.id})"
                    ${p.inStock == 0 ? 'disabled' : ''}>
                    ${p.inStock == 1 ? 'В корзину' : 'Нет в наличии'}
                </button>
            </div>`;
        grid.appendChild(div);
    });
}

// --- МОДАЛКА ---
function openModal(id) {
    const p = products.find(x => x.id == id);
    if (!p) return;

    document.getElementById('modal-details').innerHTML = `
        <div class="modal-grid">
            <img src="${p.image}" class="modal-img" onerror="this.src='logo/VCard.png'">
            <div class="modal-info-text">
                <h2>${p.vendor} ${p.name}</h2>
                <p><strong>Производитель:</strong> ${p.brand}</p>
                <p><strong>Объем памяти:</strong> ${p.memory}</p>
                <p><strong>Статус:</strong> ${Number(p.inStock) === 1 ? 'В наличии' : 'Под заказ'}</p>
                <p><strong>Дата выхода:</strong> ${formatDate(p.release_date)}</p>
                <hr>
                <h3>Цена: ${p.price} ₽</h3>
                <button class="checkout-button" onclick="addToCart(${p.id})">
                    Добавить в корзину
                </button>
            </div>
        </div>`;

    document.getElementById('product-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('product-modal').style.display = 'none';
}

// --- КОРЗИНА ---
function addToCart(id) {
    const p = products.find(x => x.id == id);
    if (!p) return;

    cart.push({ ...p });

    console.log("КОРЗИНА:", cart); // 👈 ВАЖНО

    saveCart();
    updateCartCount();
    updateCartDisplay();
}

function removeFromCart(index) {
    cart.splice(index, 1);

    saveCart();
    updateCartCount();
    updateCartDisplay();
}

function updateCartCount() {
    document.getElementById('cart-count').innerText = cart.length;
}

function toggleCart() {
    const cartView = document.getElementById('cart-view');

    if (cartView.classList.contains('hidden')) {
        showCart();
    } else {
        showProducts();
    }
}

function showCart() {
    document.getElementById('product-grid').classList.add('hidden');
    document.getElementById('main-controls').classList.add('hidden');

    const cartView = document.getElementById('cart-view');
    cartView.classList.remove('hidden');
    cartView.style.display = 'block';

    updateCartDisplay();
}

function showProducts() {
    document.getElementById('product-grid').classList.remove('hidden');
    document.getElementById('main-controls').classList.remove('hidden');

    const cartView = document.getElementById('cart-view');
    cartView.classList.add('hidden');
    cartView.style.display = 'none';
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

    let total = 0;

    itemsDiv.innerHTML = cart.map((p, i) => {
        const price = String(p.price).replace(/[^0-9]/g, '');
        total += Number(price);

        return `
            <div class="cart-item">
                <div>
                    <h4>${p.vendor} ${p.name}</h4>
                    <p>${p.price} ₽</p>
                </div>
                <button class="remove-btn" onclick="removeFromCart(${i})">Удалить</button>
            </div>
        `;
    }).join('');

    document.getElementById('total-amount').innerText =
        total.toLocaleString() + ' ₽';
}

// --- ДОП ---
function displayProducts() { filterProducts(); }

async function logout() {
    await fetch('api.php?action=logout');
    window.location.href = 'login.html';
}

window.onload = init;

window.onclick = (e) => {
    if (e.target === document.getElementById('product-modal')) {
        closeModal();
    }
};

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU');
}