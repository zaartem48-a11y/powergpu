// ПРОВЕРКА АВТОРИЗАЦИИ + ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
let products = [];
let cart = [];
let isUSD = true;
const EXCHANGE_RATE = 77;
let currentFilter = 'ALL';

// Инициализация страницы (ПРОВЕРКА АВТОРИЗАЦИИ + ТОВАРЫ ИЗ БД)
async function init() {
    // Проверяем авторизацию
    try {
        const response = await fetch('api.php?action=check');
        const session = await response.json();
        
        if (!session.loggedin) {
            window.location.href = 'login.html';
            return;
        }
    } catch (error) {
        console.error('Session check error:', error);
        window.location.href = 'login.html';
        return;
    }

    // Загружаем товары из БД
    try {
        const response = await fetch('api.php?action=products');
        products = await response.json();
        displayProducts();
        updateCartCount();
    } catch (error) {
        console.error('Products load error:', error);
        document.getElementById('product-grid').innerHTML = 
            '<p style="color: #22c55e; text-align: center; grid-column: 1 / -1;">Ошибка загрузки товаров из базы данных</p>';
    }
}

// Выход из системы (очищаем сессию на сервере)
async function logout() {
    try {
        await fetch('api.php?action=logout');
    } catch (error) {
        console.error('Logout error:', error);
    }
    window.location.href = 'login.html';
}

// Форматирование цены в зависимости от текущей валюты
function formatPrice(price) {
    if (isUSD) {
        return '$' + price;
    } else {
        return (price * EXCHANGE_RATE) + '₽';
    }
}

// Переключение валюты между USD и RUB
function toggleCurrency() {
    isUSD = !isUSD;
    const currencyButton = document.getElementById('currency-button');
    
    if (isUSD) {
        currencyButton.textContent = '(₽)';
    } else {
        currencyButton.textContent = '($)';
    }
    
    displayProducts();
    
    // Обновление отображения корзины, если она открыта
    const cartView = document.getElementById('cart-view');
    if (cartView.classList.contains('active')) {
        updateCartDisplay();
    }
}

// Установка фильтра по бренду
function setFilter(brand) {
    currentFilter = brand;
    
    // Обновление активной кнопки
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if ((brand === 'ALL' && btn.textContent === 'Все бренды') ||
            (brand === 'NVIDIA' && btn.textContent === 'NVIDIA') ||
            (brand === 'AMD' && btn.textContent === 'AMD')) {
            btn.classList.add('active');
        }
    });
    
    filterProducts();
}

// Фильтрация товаров по поиску и бренду
function filterProducts() {
    const searchText = document.getElementById('search-input').value.toLowerCase();

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchText);
        const matchesBrand = currentFilter === 'ALL' || product.brand === currentFilter;
        return matchesSearch && matchesBrand;
    });

    displayFilteredProducts(filteredProducts);
}

// Отображение отфильтрованных товаров
function displayFilteredProducts(filteredProducts) {
    const productGrid = document.getElementById('product-grid');
    productGrid.innerHTML = '';

    if (filteredProducts.length === 0) {
        productGrid.innerHTML = '<p style="color: #4ade80; grid-column: 1 / -1; text-align: center;">Товары не найдены</p>';
        return;
    }

    filteredProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        productCard.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.style.display='none'">
            <div class="product-info">
                <div class="brand-badge">${product.brand}</div>
                <h3>${product.name}</h3>
                <p class="product-memory">${product.memory}</p>
                <p class="product-price">${formatPrice(product.price)}</p>
                <button 
                    class="add-to-cart-btn" 
                    onclick="addToCart(${product.id})"
                    ${product.inStock == 0 ? 'disabled' : ''}
                >
                    ${product.inStock == 1 ? 'Добавить в корзину' : 'Нет в наличии'}
                </button>
            </div>
        `;
        
        productGrid.appendChild(productCard);
    });
}

// Отображение всех товаров
function displayProducts() {
    filterProducts();
}

// Добавление товара в корзину
function addToCart(productId) {
    const product = products.find(p => p.id == productId);
    
    if (!product || product.inStock == 0) return;
    
    const existingItem = cart.find(item => item.id == productId);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
        });
    }
    
    updateCartCount();
    alert(`✅ ${product.name} добавлен в корзину!`);
}

// Удаление товара из корзины
function removeFromCart(productId) {
    cart = cart.filter(item => item.id != productId);
    updateCartDisplay();
    updateCartCount();
}

// Обновление количества товара
function updateQuantity(productId, change) {
    const item = cart.find(item => item.id == productId);
    if (item) {
        item.quantity = Math.max(1, item.quantity + change);
        updateCartDisplay();
        updateCartCount();
    }
}

// Обновление счетчика товаров в корзине
function updateCartCount() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').textContent = totalItems;
}

// Показать корзину
function toggleCart() {
    document.getElementById('product-grid').style.display = 'none';
    document.getElementById('cart-view').classList.remove('hidden');
    document.getElementById('cart-view').classList.add('active');
    document.querySelector('.controls').style.display = 'none';
    updateCartDisplay();
}

// Показать товары
function showProducts() {
    document.getElementById('product-grid').style.display = 'grid';
    document.getElementById('cart-view').classList.add('hidden');
    document.getElementById('cart-view').classList.remove('active');
    document.querySelector('.controls').style.display = 'flex';
}

// Обновление отображения корзины
function updateCartDisplay() {
    const cartItemsDiv = document.getElementById('cart-items');
    const emptyCartDiv = document.getElementById('empty-cart');
    const cartTotalDiv = document.getElementById('cart-total');

    if (cart.length === 0) {
        emptyCartDiv.classList.remove('hidden');
        cartItemsDiv.innerHTML = '';
        cartTotalDiv.classList.add('hidden');
    } else {
        emptyCartDiv.classList.add('hidden');
        cartTotalDiv.classList.remove('hidden');

        // Отображение товаров в корзине
        cartItemsDiv.innerHTML = '';
        cart.forEach(item => {
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            
            const currencySymbol = isUSD ? '$' : '₽';
            const itemPrice = isUSD ? item.price : (item.price * EXCHANGE_RATE);
            
            cartItem.innerHTML = `
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <p>${currencySymbol}${itemPrice} x ${item.quantity}</p>
                </div>
                <div class="cart-item-controls">
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                    <span class="quantity-display">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                    <button class="remove-btn" onclick="removeFromCart(${item.id})">Удалить</button>
                </div>
            `;
            
            cartItemsDiv.appendChild(cartItem);
        });

        // Обновление общей суммы
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const formattedTotal = isUSD ? total : (total * EXCHANGE_RATE);
        const currencySymbol = isUSD ? '$' : '₽';
        document.getElementById('total-amount').textContent = currencySymbol + formattedTotal;
    }
}

// Запуск инициализации при загрузке страницы
window.onload = init;
