// ТВОИ СТАРЫЕ ФУНКЦИИ (остаются без изменений)
function showLogin() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
}

function showRegister() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
}

function validateEmail(email) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) return false;
    
    const validDomains = [
        'gmail.com', 'mail.ru', 'yandex.ru', 'ya.ru',
        'yahoo.com', 'outlook.com', 'hotmail.com',
        'icloud.com', 'rambler.ru', 'bk.ru', 'list.ru', 'inbox.ru'
    ];
    const domain = email.split('@')[1].toLowerCase();
    return validDomains.includes(domain);
}

// НОВАЯ РЕГИСТРАЦИЯ С БАЗОЙ ДАННЫХ
async function register() {
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;

    // Проверка полей
    if (!username || !email || !password || !confirm) {
        alert('Заполните все поля!');
        return;
    }

    if (password !== confirm) {
        alert('Пароли не совпадают!');
        return;
    }

    if (password.length < 6) {
        alert('Пароль должен быть не короче 6 символов!');
        return;
    }

    if (!validateEmail(email)) {
        alert('Введите корректный email!');
        return;
    }

    try {
        const response = await fetch('api.php?action=register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const result = await response.json();

        if (result.success) {
            alert('✅ Регистрация успешна! Теперь войдите.');
            showLogin();
            // Очищаем форму
            document.getElementById('register-form').querySelectorAll('input').forEach(input => input.value = '');
        } else {
            alert('❌ ' + result.error);
        }
    } catch (error) {
        alert('❌ Ошибка сервера. Попробуйте позже.');
        console.error('Register error:', error);
    }
}

// НОВЫЙ ВХОД С БАЗОЙ ДАННЫХ
async function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
        alert('Заполните все поля!');
        return;
    }

    try {
        const response = await fetch('api.php?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (result.success) {
            localStorage.setItem('current_user', username);
            alert('✅ Вход успешен! Переходим в магазин...');
            window.location.href = 'index.html';
        } else {
            alert('❌ ' + result.error);
        }
    } catch (error) {
        alert('❌ Ошибка сервера. Попробуйте позже.');
        console.error('Login error:', error);
    }
}
