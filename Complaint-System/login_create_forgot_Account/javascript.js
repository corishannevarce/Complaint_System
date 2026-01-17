// Toggle between Login and Signup forms
function toggleForms() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    loginForm.classList.toggle('active');
    signupForm.classList.toggle('active');
}

// Show Forgot Password form
function showForgotPasswordForm() {
    const loginForm = document.getElementById('loginForm');
    const forgotForm = document.getElementById('forgotForm');
    
    if (forgotForm) {
        loginForm.classList.remove('active');
        forgotForm.classList.add('active');
    } else {
        alert('Password reset feature coming soon!');
    }
}

// Back to Login from Forgot Password
function backToLogin() {
    const loginForm = document.getElementById('loginForm');
    const forgotForm = document.getElementById('forgotForm');
    
    if (forgotForm) {
        forgotForm.classList.remove('active');
        loginForm.classList.add('active');
    }
}

// Form validation (optional)
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}