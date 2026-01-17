<?php

/**
 * ============================================
 * FILE 1: logout.php
 * Location: backend/api/logout.php
 * ============================================
 */

session_start();

// Destroy all session data
session_unset();
session_destroy();

// Remove session cookie
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Send JSON response
header('Content-Type: application/json');
echo json_encode([
    'success' => true,
    'message' => 'Logged out successfully'
]);
exit;