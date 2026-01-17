<?php

/**
 * API: Create New Complaint
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
$complaintType = isset($_POST['complaint_type']) ? sanitizeInput($_POST['complaint_type']) : '';
$description = isset($_POST['description']) ? sanitizeInput($_POST['description']) : '';
$userId = getLoggedInUserId();

// Validation
$errors = [];

if (empty($complaintType)) {
    $errors[] = 'Complaint type is required';
}

if (empty($description)) {
    $errors[] = 'Description is required';
}

if (strlen($description) < 10) {
    $errors[] = 'Description must be at least 10 characters';
}

if (!empty($errors)) {
    sendResponse([
        'success' => false,
        'message' => 'Validation failed',
        'errors' => $errors
    ]);
    exit;
}

// Get TypeID from complaint type name
$typeQuery = "SELECT TypeID FROM ComplaintTypes WHERE TypeName = ?";
$typeResult = executeQuery($typeQuery, [$complaintType]);

if (!$typeResult['success'] || empty($typeResult['data'])) {
    sendResponse([
        'success' => false,
        'message' => 'Invalid complaint type'
    ]);
    exit;
}

$typeId = $typeResult['data'][0]['TypeID'];

// Generate complaint code
$codeQuery = "EXEC sp_GenerateComplaintCode";
$codeResult = executeQuery($codeQuery);

if (!$codeResult['success'] || empty($codeResult['data'])) {
    sendResponse([
        'success' => false,
        'message' => 'Failed to generate complaint code'
    ]);
    exit;
}

$complaintCode = $codeResult['data'][0]['ComplaintCode'];

// Insert complaint
$insertQuery = "
    INSERT INTO Complaints (ComplaintCode, UserID, TypeID, Description, Status, CreatedAt)
    VALUES (?, ?, ?, ?, 'Pending', GETDATE())
";

$insertResult = executeNonQuery($insertQuery, [
    $complaintCode,
    $userId,
    $typeId,
    $description
]);

if (!$insertResult['success']) {
    sendResponse([
        'success' => false,
        'message' => 'Failed to create complaint',
        'error' => $insertResult['error']
    ]);
    exit;
}

// Get the inserted complaint ID
$complaintId = getLastInsertId();

// Get user data for log
$userData = getLoggedInUserData();
$userName = $userData['full_name'];

// Insert initial record log
$logQuery = "
    INSERT INTO RecordLogs (ComplaintID, LogMessage, LogTimestamp, CreatedBy)
    VALUES (?, ?, GETDATE(), ?)
";

$logMessage = "Complaint received from tenant";
$logResult = executeNonQuery($logQuery, [
    $complaintId,
    $logMessage,
    $userName
]);

// Get the created complaint details
$detailQuery = "
    SELECT 
        c.ComplaintID,
        c.ComplaintCode,
        c.Description,
        ct.TypeName,
        c.Status,
        c.CreatedAt,
        u.FullName,
        u.RoomNumber
    FROM Complaints c
    INNER JOIN ComplaintTypes ct ON c.TypeID = ct.TypeID
    INNER JOIN Users u ON c.UserID = u.UserID
    WHERE c.ComplaintID = ?
";

$detailResult = executeQuery($detailQuery, [$complaintId]);

if (!$detailResult['success']) {
    sendResponse([
        'success' => false,
        'message' => 'Complaint created, but failed to fetch details',
        'complaint_code' => $complaintCode
    ]);
    exit;
}

// Send success response
sendResponse([
    'success' => true,
    'message' => 'Complaint created successfully',
    'data' => $detailResult['data'][0]
]);
exit;
?>