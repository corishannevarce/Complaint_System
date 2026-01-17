<?php
require_once '../config.php';
requireLogin();

if (!isset($_GET['id'])) {
    $_SESSION['error_message'] = "No complaint ID provided";
    header("Location: index.php?page=home");
    exit();
}

$complaint_id = clean($_GET['id']);

// Verify the complaint belongs to the user and is resolved
$stmt = $conn->prepare("SELECT status FROM complaints WHERE id = :id AND user_id = :user_id");
$stmt->execute(['id' => $complaint_id, 'user_id' => $_SESSION['user_id']]);
$complaint = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$complaint) {
    $_SESSION['error_message'] = "Complaint not found or you don't have permission to delete it";
    header("Location: index.php?page=home");
    exit();
}

if ($complaint['status'] != 'resolved') {
    $_SESSION['error_message'] = "You can only delete resolved complaints!";
    header("Location: index.php?page=home");
    exit();
}

// Delete the complaint only if all checks pass
$stmt = $conn->prepare("DELETE FROM complaints WHERE id = :id AND user_id = :user_id");
if ($stmt->execute(['id' => $complaint_id, 'user_id' => $_SESSION['user_id']])) {
    $_SESSION['success_message'] = "Complaint deleted successfully!";
} else {
    $_SESSION['error_message'] = "Error deleting complaint. Please try again.";
}

header("Location: index.php?page=home");
exit();
?>