// Delete complaint function - used in user_front.php AND complaint_history.php
function deleteComplaint(id) {
    if (confirm('Are you sure you want to delete this complaint?')) {
        window.location.href = 'delete_complaint.php?id=' + id;
    }
}

// Export PDF function - used in complaint_history.php
function exportPDF(complaintId) {
    window.location.href = 'exportpdf.php?id=' + complaintId;
}

// Common validation
function validateComplaintForm() {
    // Shared validation logic
}