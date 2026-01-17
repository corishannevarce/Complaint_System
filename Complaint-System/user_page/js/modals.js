// Modal functions
function openSubmitModal() {
    document.getElementById('submitModal').classList.add('active');
}

function closeSubmitModal() {
    document.getElementById('submitModal').classList.remove('active');
}

// Close modal when clicking outside
function setupModalClose() {
    document.getElementById('submitModal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            closeSubmitModal();
        }
    });
}