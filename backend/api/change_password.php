<?php

/**
 * ============================================
 * CHANGE PASSWORD
 * File: change_password.php
 * ============================================
 */

require_once '../config/db_config.php';

header('Content-Type: application/json');

if (!isLoggedIn()) {
    sendResponse([
        'success' => false,
        'message' => 'User not logged in'
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse([
        'success' => false,
        'message' => 'Invalid request method'
    ]);
}

$userId = getLoggedInUserId();
$currentPassword = isset($_POST['current_password']) ? $_POST['current_password'] : '';
$newPassword = isset($_POST['new_password']) ? $_POST['new_password'] : '';
$confirmPassword = isset($_POST['confirm_password']) ? $_POST['confirm_password'] : '';

// Validation
$errors = [];

if (empty($currentPassword)) {
    $errors[] = 'Current password is required';
}

if (empty($newPassword)) {
    $errors[] = 'New password is required';
} elseif (strlen($newPassword) < 8) {
    $errors[] = 'New password must be at least 8 characters';
} elseif (!preg_match('/[A-Z]/', $newPassword)) {
    $errors[] = 'New password must contain at least one uppercase letter';
} elseif (!preg_match('/[a-z]/', $newPassword)) {
    $errors[] = 'New password must contain at least one lowercase letter';
} elseif (!preg_match('/[0-9]/', $newPassword)) {
    $errors[] = 'New password must contain at least one number';
}

if (empty($confirmPassword)) {
    $errors[] = 'Please confirm your new password';
} elseif ($newPassword !== $confirmPassword) {
    $errors[] = 'Passwords do not match';
}

if (!empty($errors)) {
    sendResponse([
        'success' => false,
        'message' => 'Validation failed',
        'errors' => $errors
    ]);
}

// Verify current password
$query = "SELECT Password FROM Users WHERE UserID = ?";
$result = executeQuery($query, [$userId]);

if (!$result['success'] || empty($result['data'])) {
    sendResponse([
        'success' => false,
        'message' => 'User not found'
    ]);
}

$storedPassword = $result['data'][0]['Password'];

// Use password_verify() with hashed passwords
if (!password_verify($currentPassword, $storedPassword)) {
    sendResponse([
        'success' => false,
        'message' => 'Current password is incorrect'
    ]);
}

// Update password using password_hash()
$hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
$updateQuery = "UPDATE Users SET Password = ? WHERE UserID = ?";
$updateResult = executeNonQuery($updateQuery, [$hashedPassword, $userId]);

if (!$updateResult['success']) {
    sendResponse([
        'success' => false,
        'message' => 'Failed to update password',
        'error' => $updateResult['error']
    ]);
}

sendResponse([
    'success' => true,
    'message' => 'Password changed successfully'
]);
?>