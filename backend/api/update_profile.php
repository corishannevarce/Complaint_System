<?php

/**
 * ============================================
 * UPDATE USER PROFILE
 * File: update_profile.php
 * ============================================
 */

require_once '../config/db_config.php';

header('Content-Type: application/json');

if (!isLoggedIn()) {
    sendResponse([
        'success' => false,
        'message' => 'User not logged in'
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse([
        'success' => false,
        'message' => 'Invalid request method'
    ]);
    exit;
}

$userId = getLoggedInUserId();
$fullName = isset($_POST['full_name']) ? sanitizeInput($_POST['full_name']) : '';
$email = isset($_POST['email']) ? sanitizeInput($_POST['email']) : '';
$phoneNumber = isset($_POST['phone_number']) ? sanitizeInput($_POST['phone_number']) : '';
$roomNumber = isset($_POST['room_number']) ? sanitizeInput($_POST['room_number']) : '';

// Validation
$errors = [];

if (empty($fullName)) {
    $errors[] = 'Full name is required';
}

if (empty($email)) {
    $errors[] = 'Email is required';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Invalid email format';
}

if (!empty($errors)) {
    sendResponse([
        'success' => false,
        'message' => 'Validation failed',
        'errors' => $errors
    ]);
    exit;
}

// Check if email is already taken by another user
$emailCheckQuery = "SELECT UserID FROM Users WHERE Email = ? AND UserID != ?";
$emailCheck = executeQuery($emailCheckQuery, [$email, $userId]);

if (!empty($emailCheck['data'])) {
    sendResponse([
        'success' => false,
        'message' => 'Email is already taken by another user'
    ]);
    exit;
}

// Update profile
$updateQuery = "
    UPDATE Users 
    SET FullName = ?, 
        Email = ?, 
        PhoneNumber = ?, 
        RoomNumber = ?
    WHERE UserID = ?
";

$updateResult = executeNonQuery($updateQuery, [
    $fullName,
    $email,
    $phoneNumber,
    $roomNumber,
    $userId
]);

if (!$updateResult['success']) {
    sendResponse([
        'success' => false,
        'message' => 'Failed to update profile',
        'error' => $updateResult['error']
    ]);
    exit;
}

// Update session data
$_SESSION['full_name'] = $fullName;
$_SESSION['email'] = $email;
$_SESSION['room_number'] = $roomNumber;

sendResponse([
    'success' => true,
    'message' => 'Profile updated successfully'
]);
exit;