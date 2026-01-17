<?php
/**
 * API: Export Complaint Record Logs to PDF
 * Method: GET
 * Requires: User session
 * Library: TCPDF (you need to install this)
 * Download: https://tcpdf.org/
 */

require_once '../config/db_config.php';
require_once '../vendor/tcpdf/tcpdf.php'; // Adjust path based on your installation

// Check if user is logged in
if (!isLoggedIn()) {
    header('Content-Type: text/plain');
    http_response_code(401);
    exit('Access denied. Please log in.');
}

// Get complaint ID
$complaintId = isset($_GET['complaint_id']) ? intval($_GET['complaint_id']) : 0;
$userId = getLoggedInUserId();

if ($complaintId <= 0) {
    header('Content-Type: text/plain');
    http_response_code(400);
    exit('Invalid complaint ID');
}

// Get complaint details
$query = "
    SELECT 
        c.ComplaintCode,
        c.Description,
        ct.TypeName AS ComplaintType,
        c.Status,
        FORMAT(c.CreatedAt, 'MMMM dd, yyyy hh:mm tt') AS CreatedAt,
        FORMAT(c.ResolvedAt, 'MMMM dd, yyyy hh:mm tt') AS ResolvedAt,
        u.FullName,
        u.RoomNumber,
        u.Email,
        u.PhoneNumber
    FROM Complaints c
    INNER JOIN ComplaintTypes ct ON c.TypeID = ct.TypeID
    INNER JOIN Users u ON c.UserID = u.UserID
    WHERE c.ComplaintID = ? AND c.UserID = ?
";

$result = executeQuery($query, [$complaintId, $userId]);

if (!$result['success'] || empty($result['data'])) {
    header('Content-Type: text/plain');
    http_response_code(404);
    exit('Complaint not found or access denied');
}

$complaint = $result['data'][0];

// Get record logs
$logsQuery = "
    SELECT 
        LogMessage,
        FORMAT(LogTimestamp, 'MMMM dd, yyyy hh:mm tt') AS LogTimestamp,
        CreatedBy
    FROM RecordLogs
    WHERE ComplaintID = ?
    ORDER BY LogTimestamp ASC
";

$logsResult = executeQuery($logsQuery, [$complaintId]);
$logs = $logsResult['success'] ? $logsResult['data'] : [];

// Create PDF
$pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);

// Set document information
$pdf->SetCreator('Complaint Desk System');
$pdf->SetAuthor($complaint['FullName']);
$pdf->SetTitle('Complaint Record - ' . $complaint['ComplaintCode']);
$pdf->SetSubject('Complaint Record Logs');

// Remove default header/footer
$pdf->setPrintHeader(false);
$pdf->setPrintFooter(false);

// Set margins
$pdf->SetMargins(15, 15, 15);
$pdf->SetAutoPageBreak(TRUE, 15);

// Add a page
$pdf->AddPage();

// Set font
$pdf->SetFont('helvetica', '', 10);

// Header with logo/title
$pdf->SetFont('helvetica', 'B', 20);
$pdf->SetTextColor(66, 165, 245);
$pdf->Cell(0, 10, 'COMPLAINT DESK', 0, 1, 'C');
$pdf->SetFont('helvetica', '', 12);
$pdf->SetTextColor(0, 0, 0);
$pdf->Cell(0, 6, 'Complaint Record Report', 0, 1, 'C');
$pdf->Ln(5);

// Draw line
$pdf->SetDrawColor(66, 165, 245);
$pdf->SetLineWidth(0.5);
$pdf->Line(15, $pdf->GetY(), 195, $pdf->GetY());
$pdf->Ln(8);

// Complaint Details Section
$pdf->SetFont('helvetica', 'B', 14);
$pdf->SetTextColor(66, 165, 245);
$pdf->Cell(0, 8, 'Complaint Details', 0, 1);
$pdf->Ln(2);

$pdf->SetFont('helvetica', '', 10);
$pdf->SetTextColor(0, 0, 0);

// Details table
$details = [
    ['Complaint Code:', $complaint['ComplaintCode']],
    ['Type:', $complaint['ComplaintType']],
    ['Status:', $complaint['Status']],
    ['Description:', $complaint['Description']],
    ['Filed Date:', $complaint['CreatedAt']],
    ['Resolved Date:', $complaint['ResolvedAt'] ?? 'Not yet resolved'],
];

foreach ($details as $detail) {
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->Cell(45, 6, $detail[0], 0, 0);
    $pdf->SetFont('helvetica', '', 10);
    $pdf->MultiCell(0, 6, $detail[1], 0, 'L');
}

$pdf->Ln(5);

// User Information Section
$pdf->SetFont('helvetica', 'B', 14);
$pdf->SetTextColor(66, 165, 245);
$pdf->Cell(0, 8, 'Tenant Information', 0, 1);
$pdf->Ln(2);

$pdf->SetFont('helvetica', '', 10);
$pdf->SetTextColor(0, 0, 0);

$userInfo = [
    ['Name:', $complaint['FullName']],
    ['Room Number:', $complaint['RoomNumber']],
    ['Email:', $complaint['Email']],
    ['Phone:', $complaint['PhoneNumber']],
];

foreach ($userInfo as $info) {
    $pdf->SetFont('helvetica', 'B', 10);
    $pdf->Cell(45, 6, $info[0], 0, 0);
    $pdf->SetFont('helvetica', '', 10);
    $pdf->Cell(0, 6, $info[1], 0, 1);
}

$pdf->Ln(5);

// Record Logs Section
$pdf->SetFont('helvetica', 'B', 14);
$pdf->SetTextColor(66, 165, 245);
$pdf->Cell(0, 8, 'Record Logs', 0, 1);
$pdf->Ln(2);

if (!empty($logs)) {
    $pdf->SetFont('helvetica', '', 9);
    $pdf->SetTextColor(0, 0, 0);
    
    foreach ($logs as $index => $log) {
        // Log number
        $pdf->SetFont('helvetica', 'B', 9);
        $pdf->SetFillColor(243, 248, 255);
        $pdf->Cell(0, 6, 'Log #' . ($index + 1), 0, 1, 'L', true);
        
        $pdf->SetFont('helvetica', '', 9);
        
        // Timestamp
        $pdf->SetFont('helvetica', 'B', 9);
        $pdf->Cell(30, 5, 'Timestamp:', 0, 0);
        $pdf->SetFont('helvetica', '', 9);
        $pdf->Cell(0, 5, $log['LogTimestamp'], 0, 1);
        
        // Created by
        $pdf->SetFont('helvetica', 'B', 9);
        $pdf->Cell(30, 5, 'Created by:', 0, 0);
        $pdf->SetFont('helvetica', '', 9);
        $pdf->Cell(0, 5, $log['CreatedBy'], 0, 1);
        
        // Message
        $pdf->SetFont('helvetica', 'B', 9);
        $pdf->Cell(30, 5, 'Message:', 0, 0);
        $pdf->SetFont('helvetica', '', 9);
        $pdf->MultiCell(0, 5, $log['LogMessage'], 0, 'L');
        
        $pdf->Ln(3);
    }
} else {
    $pdf->SetFont('helvetica', 'I', 10);
    $pdf->Cell(0, 6, 'No record logs available', 0, 1);
}

// Footer
$pdf->Ln(10);
$pdf->SetDrawColor(66, 165, 245);
$pdf->Line(15, $pdf->GetY(), 195, $pdf->GetY());
$pdf->Ln(3);
$pdf->SetFont('helvetica', 'I', 8);
$pdf->SetTextColor(128, 128, 128);
$pdf->Cell(0, 5, 'Generated on: ' . date('F d, Y h:i A'), 0, 1, 'C');
$pdf->Cell(0, 5, 'Complaint Desk System - Where Service Meets Responsibility', 0, 1, 'C');

// Output PDF
$filename = 'Complaint_' . $complaint['ComplaintCode'] . '_' . date('Ymd_His') . '.pdf';
$pdf->Output($filename, 'D'); // D = Download
exit;
?>