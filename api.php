<?php
session_start();
require_once 'config.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

// 1. Получение товаров
if ($action == 'products') {
    $result = $conn->query("SELECT * FROM products ORDER BY release_date DESC");
    $products = [];
    while($row = $result->fetch_assoc()) {
        $row['id'] = (int)$row['id'];
        $row['price'] = (int)$row['price'];
        $row['inStock'] = (int)$row['inStock'];
        $products[] = $row;
    }
    echo json_encode($products);
    exit;
}

// 2. Проверка входа
if ($action == 'check') {
    echo json_encode([
        'loggedin' => isset($_SESSION['loggedin']),
        'username' => $_SESSION['username'] ?? ''
    ]);
    exit;
}

// 3. Вход
if ($action == 'login') {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = trim($data['username'] ?? '');
    $password = $data['password'] ?? '';
    
    $stmt = $conn->prepare("SELECT id, password FROM users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    
    if ($user && password_verify($password, $user['password'])) {
        $_SESSION['loggedin'] = true;
        $_SESSION['username'] = $username;
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Неверный логин или пароль']);
    }
    exit;
}

// 4. Выход
if ($action == 'logout') {
    session_destroy();
    echo json_encode(['success' => true]);
    exit;
}

// 5. Регистрация
if ($action == 'register') {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = trim($data['username'] ?? '');
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';
    
    $hashed = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $conn->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $username, $email, $hashed);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Ошибка или юзер уже есть']);
    }
    exit;
}

// 6. Оформление заказа (ТЕПЕРЬ ВНЕ РЕГИСТРАЦИИ)
if ($action == 'create_order') {
    if (!isset($_SESSION['loggedin'])) {
        echo json_encode(['success' => false, 'error' => 'Нужна авторизация']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $username = $_SESSION['username'];
    $items = json_encode($data['items'], JSON_UNESCAPED_UNICODE);
    $total = $data['total'];
    $address = $data['address'];

    $stmt = $conn->prepare("INSERT INTO orders (username, items, total_price, address) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("ssis", $username, $items, $total, $address);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Ошибка БД']);
    }
    exit;
}

// 7. Получение истории заказов
if ($action == 'get_history') {
    if (!isset($_SESSION['loggedin'])) {
        echo json_encode([]);
        exit;
    }

    $username = $_SESSION['username'];
    // Защита от SQL-инъекции: используем переменную из сессии в кавычках
    $result = $conn->query("SELECT * FROM orders WHERE username = '$username' ORDER BY created_at DESC");
    
    $orders = [];
    while($row = $result->fetch_assoc()) {
        $orders[] = $row;
    }
    echo json_encode($orders);
    exit;
}

if ($action == 'get_all_orders') {
    // Проверяем, залогинен ли юзер и является ли он админом
    if (!isset($_SESSION['loggedin']) || $_SESSION['username'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Доступ запрещен']);
        exit;
    }

    // Выбираем все заказы, сортируем по дате (новые сверху)
    $result = $conn->query("SELECT * FROM orders ORDER BY created_at DESC");
    
    $orders = [];
    while($row = $result->fetch_assoc()) {
        $orders[] = $row;
    }
    echo json_encode($orders);
    exit;
}

// 9. Удаление заказа (ТОЛЬКО ДЛЯ АДМИНА)
if ($action == 'delete_order') {
    if (!isset($_SESSION['loggedin']) || $_SESSION['username'] !== 'admin') {
        echo json_encode(['success' => false, 'error' => 'Доступ запрещен']);
        exit;
    }

    $id = (int)($_GET['id'] ?? 0);

    if ($id > 0) {
        $stmt = $conn->prepare("DELETE FROM orders WHERE id = ?");
        $stmt->bind_param("i", $id);
        
        if ($stmt->execute()) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Ошибка удаления']);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'Неверный ID']);
    }
    exit;
}
?>