<?php
/**
 * API: Get User Complaints
 * Method: GET
 * Requires: User session
 * Parameters: status (optional), type (optional), date (optional), month (optional)
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

// Get user ID
$userId = getLoggedInUserId();

// Get filter parameters
$status = isset($_GET['status']) ? sanitizeInput($_GET['status']) : '';
$type = isset($_GET['type']) ? sanitizeInput($_GET['type']) : '';
$date = isset($_GET['date']) ? sanitizeInput($_GET['date']) : '';
$month = isset($_GET['month']) ? sanitizeInput($_GET['month']) : '';
$searchName = isset($_GET['search_name']) ? sanitizeInput($_GET['search_name']) : '';

// Build base query
$query = "
    SELECT 
        c.ComplaintID,
        c.ComplaintCode,
        c.Description,
        ct.TypeName AS ComplaintType,
        c.Status,
        FORMAT(c.CreatedAt, 'MMM dd, yyyy hh:mm tt') AS CreatedAt,
        FORMAT(c.UpdatedAt, 'MMM dd, yyyy hh:mm tt') AS UpdatedAt,
        FORMAT(c.ResolvedAt, 'MMM dd, yyyy hh:mm tt') AS ResolvedAt,
        u.FullName,
        u.RoomNumber,
        (
            SELECT 
                rl.LogMessage,
                FORMAT(rl.LogTimestamp, 'MMM dd, yyyy hh:mm tt') AS LogTimestamp,
                rl.CreatedBy
            FROM RecordLogs rl
            WHERE rl.ComplaintID = c.ComplaintID
            ORDER BY rl.LogTimestamp ASC
            FOR JSON PATH
        ) AS RecordLogs
    FROM Complaints c
    INNER JOIN ComplaintTypes ct ON c.TypeID = ct.TypeID
    INNER JOIN Users u ON c.UserID = u.UserID
    WHERE c.UserID = ? AND c.IsDeleted = 0
";

$params = [$userId];

// Add status filter
if (!empty($status) && $status !== 'All') {
    $query .= " AND c.Status = ?";
    $params[] = $status;
}

// Add type filter
if (!empty($type) && $type !== 'All Types') {
    $query .= " AND ct.TypeName = ?";
    $params[] = $type;
}

// Add date filter
if (!empty($date)) {
    $query .= " AND CAST(c.CreatedAt AS DATE) = ?";
    $params[] = $date;
}

// Add month filter
if (!empty($month) && $month !== 'All Months') {
    $query .= " AND FORMAT(c.CreatedAt, 'MMMM yyyy') = ?";
    $params[] = $month;
}

// Add name search filter (for complaint history page)
if (!empty($searchName)) {
    $query .= " AND u.FullName LIKE ?";
    $params[] = "%$searchName%";
}

// Order by created date (newest first)
$query .= " ORDER BY c.CreatedAt DESC";

// Execute query
$result = executeQuery($query, $params);

if (!$result['success']) {
    sendResponse([
        'success' => false,
        'message' => 'Failed to retrieve complaints',
        'error' => $result['error']
    ]);
    exit;
}

// Parse JSON record logs
$complaints = $result['data'];
foreach ($complaints as &$complaint) {
    if (!empty($complaint['RecordLogs'])) {
        $complaint['RecordLogs'] = json_decode($complaint['RecordLogs'], true);
    } else {
        $complaint['RecordLogs'] = [];
    }
}

// Group complaints by status
$grouped = [
    'Pending' => [],
    'In Progress' => [],
    'Resolved' => []
];

foreach ($complaints as $complaint) {
    // Prevent undefined index if status is unexpected
    if (isset($grouped[$complaint['Status']])) {
        $grouped[$complaint['Status']][] = $complaint;
    }
}

// Send response
sendResponse([
    'success' => true,
    'data' => [
        'all' => $complaints,
        'grouped' => $grouped,
        'counts' => [
            'pending' => count($grouped['Pending']),
            'in_progress' => count($grouped['In Progress']),
            'resolved' => count($grouped['Resolved']),
            'total' => count($complaints)
        ]
    ]
]);
exit;
?>