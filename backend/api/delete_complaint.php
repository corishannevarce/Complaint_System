<?php

/**
 * API: Delete Complaint (Soft Delete)
 * Method: POST
 * Requires: User session
 */

require_once '../config/db_config.php';

// Set headers
header('Content-Type: application/json');

// Check if user is logged in
if (!isLoggedIn()) {
    sendResponse([
        'success' => false,
        'message' => 'User not logged in'
    ]);
    exit;
}

// Check request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse([
        'success' => false,
        'message' => 'Invalid request method'
    ]);
    exit;
}

// Get POST data
$complaintId = isset($_POST['complaint_id']) ? intval($_POST['complaint_id']) : 0;
$userId = getLoggedInUserId();

// Validation
if ($complaintId <= 0) {
    sendResponse([
        'success' => false,
        'message' => 'Invalid complaint ID'
    ]);
    exit;
}

// Check if complaint exists and belongs to user
$checkQuery = "
    SELECT ComplaintID, Status 
    FROM Complaints 
    WHERE ComplaintID = ? AND UserID = ? AND IsDeleted = 0
";

$checkResult = executeQuery($checkQuery, [$complaintId, $userId]);

if (!$checkResult['success'] || empty($checkResult['data'])) {
    sendResponse([
        'success' => false,
        'message' => 'Complaint not found or access denied'
    ]);
    exit;
}

// Check if complaint is resolved (only resolved complaints can be deleted)
$complaint = $checkResult['data'][0];
if ($complaint['Status'] !== 'Resolved') {
    sendResponse([
        'success' => false,
        'message' => 'Only resolved complaints can be deleted'
    ]);
    exit;
}

// Soft delete the complaint
$deleteQuery = "
    UPDATE Complaints 
    SET IsDeleted = 1, UpdatedAt = GETDATE() 
    WHERE ComplaintID = ?
";

$deleteResult = executeNonQuery($deleteQuery, [$complaintId]);

if (!$deleteResult['success']) {
    sendResponse([
        'success' => false,
        'message' => 'Failed to delete complaint',
        'error' => $deleteResult['error']
    ]);
    exit;
}

// Send success response
sendResponse([
    'success' => true,
    'message' => 'Complaint deleted successfully'
]);
exit;
?>