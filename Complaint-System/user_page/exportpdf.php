<?php
require_once '../config.php';
requireLogin();

if (!isset($_GET['id'])) {
    die("Complaint ID not provided");
}

$complaint_id = clean($_GET['id']);

// Get complaint details
$stmt = $conn->prepare("
    SELECT c.*, u.full_name, u.room_number, u.email, u.phone_number 
    FROM complaints c 
    JOIN users u ON c.user_id = u.id 
    WHERE c.id = :id AND c.user_id = :user_id
");
$stmt->execute(['id' => $complaint_id, 'user_id' => $_SESSION['user_id']]);
$complaint = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$complaint) {
    die("Complaint not found");
}

// Set headers for PDF download
header('Content-Type: application/pdf');
header('Content-Disposition: attachment; filename="complaint_' . $complaint_id . '_receipt.pdf"');

// Simple PDF generation (you can use libraries like TCPDF or FPDF for better formatting)
// For now, we'll create an HTML version that can be printed to PDF

header('Content-Type: text/html');
?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Complaint Receipt - C<?php echo $complaint['id']; ?></title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            background: white;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #42a5f5;
            padding-bottom: 20px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #42a5f5;
        }
        .receipt-info {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .info-row {
            display: flex;
            margin-bottom: 10px;
        }
        .info-label {
            font-weight: bold;
            width: 150px;
        }
        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 5px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-resolved {
            background: #66BB6A;
            color: white;
        }
        .complaint-details {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 8px;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
        @media print {
            body {
                margin: 0;
            }
        }
    </style>
</head>
<body onload="window.print();">
    <div class="header">
        <div class="logo">COMPLAINT DESK</div>
        <h2>Complaint Receipt</h2>
    </div>

    <div class="receipt-info">
        <div class="info-row">
            <span class="info-label">Complaint ID:</span>
            <span>C<?php echo $complaint['id']; ?></span>
        </div>
        <div class="info-row">
            <span class="info-label">Status:</span>
            <span class="status-badge status-resolved"><?php echo ucfirst($complaint['status']); ?></span>
        </div>
        <div class="info-row">
            <span class="info-label">Submitted Date:</span>
            <span><?php echo date('F d, Y h:i A', strtotime($complaint['created_at'])); ?></span>
        </div>
        <?php if($complaint['resolved_date']): ?>
        <div class="info-row">
            <span class="info-label">Resolved Date:</span>
            <span><?php echo date('F d, Y h:i A', strtotime($complaint['resolved_date'])); ?></span>
        </div>
        <?php endif; ?>
    </div>

    <div class="complaint-details">
        <h3>User Information</h3>
        <div class="info-row">
            <span class="info-label">Name:</span>
            <span><?php echo htmlspecialchars($complaint['full_name']); ?></span>
        </div>
        <div class="info-row">
            <span class="info-label">Room Number:</span>
            <span><?php echo htmlspecialchars($complaint['room_number']); ?></span>
        </div>
        <div class="info-row">
            <span class="info-label">Email:</span>
            <span><?php echo htmlspecialchars($complaint['email']); ?></span>
        </div>
        <div class="info-row">
            <span class="info-label">Phone:</span>
            <span><?php echo htmlspecialchars($complaint['phone_number']); ?></span>
        </div>
    </div>

    <div class="complaint-details">
        <h3>Complaint Details</h3>
        <div class="info-row">
            <span class="info-label">Type:</span>
            <span><?php echo ucfirst($complaint['complaint_type']); ?></span>
        </div>
        <div class="info-row">
            <span class="info-label">Description:</span>
        </div>
        <p><?php echo nl2br(htmlspecialchars($complaint['description'])); ?></p>
    </div>

    <?php if(!empty($complaint['admin_notes'])): ?>
    <div class="complaint-details">
        <h3>Admin Notes / Resolution Records</h3>
        <p><?php echo nl2br(htmlspecialchars($complaint['admin_notes'])); ?></p>
    </div>
    <?php endif; ?>

    <div class="footer">
        <p>This is an official receipt from Complaint Desk</p>
        <p>Generated on <?php echo date('F d, Y h:i A'); ?></p>
    </div>
</body>
</html>