<?php
/**
 * Database Configuration for MS SQL Server
 * Complaint Desk System
 */

// Database connection parameters
define('DB_SERVER', 'localhost\SQLEXPRESS'); // Change to your SQL Server instance
define('DB_NAME', 'ComplaintDeskDB');
define('DB_USERNAME', 'sa'); // Change to your username
define('DB_PASSWORD', ''); // Change to your password

// Connection options
$connectionOptions = array(
    "Database" => DB_NAME,
    "Uid" => DB_USERNAME,
    "PWD" => DB_PASSWORD,
    "CharacterSet" => "UTF-8",
    "ReturnDatesAsStrings" => true
);

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Establish connection
$conn = sqlsrv_connect(DB_SERVER, $connectionOptions);

// Check connection
if ($conn === false) {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed',
        'error' => sqlsrv_errors()
    ]);
    exit;
}

/**
 * Function to execute SELECT queries
 * @param string $query SQL query
 * @param array $params Parameters for prepared statement
 * @return array Result set
 */
function executeQuery($query, $params = []) {
    global $conn;

    $stmt = sqlsrv_query($conn, $query, $params);

    if ($stmt === false) {
        return [
            'success' => false,
            'error' => sqlsrv_errors()
        ];
    }

    $results = [];
    while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        $results[] = $row;
    }

    sqlsrv_free_stmt($stmt);

    return [
        'success' => true,
        'data' => $results
    ];
}

/**
 * Function to execute INSERT/UPDATE/DELETE queries
 * @param string $query SQL query
 * @param array $params Parameters for prepared statement
 * @return array Result
 */
function executeNonQuery($query, $params = []) {
    global $conn;

    $stmt = sqlsrv_query($conn, $query, $params);

    if ($stmt === false) {
        return [
            'success' => false,
            'error' => sqlsrv_errors()
        ];
    }

    $rowsAffected = sqlsrv_rows_affected($stmt);
    sqlsrv_free_stmt($stmt);

    return [
        'success' => true,
        'rows_affected' => $rowsAffected
    ];
}

/**
 * Function to get last inserted ID
 * @return int|null Last inserted ID
 */
function getLastInsertId() {
    global $conn;

    $query = "SELECT SCOPE_IDENTITY() AS LastID";
    $stmt = sqlsrv_query($conn, $query);

    if ($stmt === false) {
        return null;
    }

    $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
    sqlsrv_free_stmt($stmt);

    return $row['LastID'] ?? null;
}

/**
 * Function to sanitize input
 * @param string $data Input data
 * @return string Sanitized data
 */
function sanitizeInput($data) {
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    return $data;
}

/**
 * Function to send JSON response
 * @param array $data Response data
 */
function sendResponse($data) {
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

/**
 * Function to check if user is logged in
 * @return bool True if logged in, false otherwise
 */
function isLoggedIn() {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

/**
 * Function to get logged in user ID
 * @return int|null User ID
 */
function getLoggedInUserId() {
    return $_SESSION['user_id'] ?? null;
}

/**
 * Function to get logged in user data
 * @return array User data
 */
function getLoggedInUserData() {
    return [
        'user_id' => $_SESSION['user_id'] ?? null,
        'full_name' => $_SESSION['full_name'] ?? null,
        'email' => $_SESSION['email'] ?? null,
        'room_number' => $_SESSION['room_number'] ?? null,
        'role' => $_SESSION['role'] ?? null
    ];
}
?>