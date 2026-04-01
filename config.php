<?php
$conn = new mysqli("localhost", "root", "", "powergpu");
if ($conn->connect_error) {
    die("Ошибка подключения к БД: " . $conn->connect_error);
}
$conn->set_charset("utf8mb4");
?>
