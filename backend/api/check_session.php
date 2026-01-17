
<?php

/**
 * ============================================
 * FILE 2: check_session.php
 * Location: backend/api/check_session.php
 * ============================================
 */
require_once '../config/db_config.php';

header('Content-Type: application/json');

if (isLoggedIn()) {
    $userData = getLoggedInUserData();
    
    sendResponse([
        'success' => true,
        'logged_in' => true,
        'user' => $userData
    ]);
} else {
    sendResponse([
        'success' => false,
        'logged_in' => false,
        'message' => 'Not logged in'
    ]);
}
?>
