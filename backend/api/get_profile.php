<?php

/**
 * ============================================
 * GET USER PROFILE
 * File: get_profile.php
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

$userId = getLoggedInUserId();

$query = "
    SELECT 
        UserID,
        FullName,
        Email,
        PhoneNumber,
        RoomNumber,
        Role,
        AccountStatus,
        FORMAT(CreatedAt, 'MMMM dd, yyyy') AS MemberSince,
        FORMAT(LastLogin, 'MMMM dd, yyyy hh:mm tt') AS LastLogin,
        (SELECT COUNT(*) FROM Complaints WHERE UserID = ? AND IsDeleted = 0) AS TotalComplaints
    FROM Users
    WHERE UserID = ?
";

$result = executeQuery($query, [$userId, $userId]);

if (!$result['success']) {
    sendResponse([
        'success' => false,
        'message' => 'Failed to retrieve profile',
        'error' => $result['error']
    ]);
    exit;
}

if (empty($result['data'])) {
    sendResponse([
        'success' => false,
        'message' => 'User not found'
    ]);
    exit;
}

sendResponse([
    'success' => true,
    'data' => $result['data'][0]
]);
exit;