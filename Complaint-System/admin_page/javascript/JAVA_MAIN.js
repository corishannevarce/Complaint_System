function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.main-content').forEach(page => {
        page.classList.add('page-hidden');
    });

    // Remove active state from all buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected page
    const selectedPage = document.getElementById(pageName + '-page');
    selectedPage.classList.remove('page-hidden');
    
    // Mark button as active
    event.target.classList.add('active');

    // Call page-specific initialization
    if (pageName === 'dashboard') {
        initDashboard();
    } else if (pageName === 'complaints') {
        initComplaints();
    } else if (pageName === 'users') {
        initUsers();
    } else if (pageName === 'account') {
        initAccount();
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});