/**
 * Account Settings Page - JavaScript
 * Handles profile management and account actions
 * PRODUCTION READY VERSION
 */

// ============================================
// GLOBAL VARIABLES
// ============================================
let csrfToken = '';

// ============================================
// DOM ELEMENTS
// ============================================
const editProfileBtn = document.getElementById('editProfileBtn');
const changePasswordBtn = document.getElementById('changePasswordBtn');
const viewDetailsBtn = document.getElementById('viewDetailsBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Modals
const editProfileModal = document.getElementById('editProfileModal');
const changePasswordModal = document.getElementById('changePasswordModal');
const extrasModal = document.getElementById('extrasModal');

// Forms
const editProfileForm = document.getElementById('editProfileForm');
const changePasswordForm = document.getElementById('changePasswordForm');

// Profile data elements
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profilePhone = document.getElementById('profilePhone');
const profileRoom = document.getElementById('profileRoom');
const profileMemberSince = document.getElementById('profileMemberSince');

// Extras modal elements
const accountStatus = document.getElementById('accountStatus');
const memberSince = document.getElementById('memberSinceDetail');
const lastLogin = document.getElementById('lastLoginDetail');
const accountId = document.getElementById('accountId');
const totalComplaints = document.getElementById('totalComplaints');
const supportEmail = document.getElementById('supportEmail');
const supportPhone = document.getElementById('supportPhone');

// Error messages
const editProfileError = document.getElementById('editProfileError');
const changePasswordError = document.getElementById('changePasswordError');

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    loadUserProfile();
    setupEventListeners();
    setupSessionValidation();
    setupFormPersistence();
    setupConnectivityMonitor();
});

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Button clicks
    if (editProfileBtn) editProfileBtn.addEventListener('click', openEditProfileModal);
    if (changePasswordBtn) changePasswordBtn.addEventListener('click', openChangePasswordModal);
    if (viewDetailsBtn) viewDetailsBtn.addEventListener('click', openExtrasModal);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    // Form submissions
    if (editProfileForm) editProfileForm.addEventListener('submit', handleEditProfile);
    if (changePasswordForm) changePasswordForm.addEventListener('submit', handleChangePassword);
    
    // Cancel buttons
    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeAllModals();
        }
    });
    
    // Phone number formatting
    setupPhoneFormatting();
}

// ============================================
// LOAD USER PROFILE
// ============================================
async function loadUserProfile() {
    const profileCard = document.querySelector('.profile-card');
    if (!profileCard) return;
    
    const spinner = createLoadingSpinner();
    
    try {
        // Show loading state
        profileCard.style.opacity = '0.5';
        profileCard.appendChild(spinner);
        
        const response = await fetch('backend/api/get_profile.php', {
            credentials: 'include'
        });
        
        // Handle unauthorized (session expired)
        if (response.status === 401) {
            showNotification('Your session has expired. Redirecting to login...', 'warning');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        const result = await response.json();
        
        if (result.success) {
            displayUserProfile(result.data);
            csrfToken = result.csrf_token || '';
        } else {
            showNotification('Failed to load profile: ' + result.message, 'error');
        }
    } catch (error) {
        showNotification('Error loading profile. Please check your connection.', 'error');
    } finally {
        // Remove loading state
        profileCard.style.opacity = '1';
        if (profileCard.contains(spinner)) {
            profileCard.removeChild(spinner);
        }
    }
}

// ============================================
// DISPLAY USER PROFILE
// ============================================
function displayUserProfile(data) {
    // Main profile card
    if (profileName) profileName.textContent = data.FullName || 'N/A';
    if (profileEmail) profileEmail.textContent = data.Email || 'N/A';
    if (profilePhone) profilePhone.textContent = data.PhoneNumber || 'N/A';
    if (profileRoom) profileRoom.textContent = data.RoomNumber || 'N/A';
    if (profileMemberSince) profileMemberSince.textContent = data.MemberSince || 'N/A';
    
    // Extras modal data
    if (accountStatus) accountStatus.textContent = data.AccountStatus || 'N/A';
    if (memberSince) memberSince.textContent = data.MemberSince || 'N/A';
    if (lastLogin) lastLogin.textContent = data.LastLogin || 'Never';
    if (accountId) accountId.textContent = 'CD-ID-' + String(data.UserID).padStart(5, '0');
    if (totalComplaints) totalComplaints.textContent = data.TotalComplaints + ' complaints';
    
    // Store data for forms
    window.currentUserData = data;
}

// ============================================
// MODAL FUNCTIONS
// ============================================
function openEditProfileModal() {
    if (!window.currentUserData) return;
    
    // Pre-fill form with current data
    const editName = document.getElementById('editName');
    const editEmail = document.getElementById('editEmail');
    const editPhone = document.getElementById('editPhone');
    const editRoom = document.getElementById('editRoom');
    
    if (editName) editName.value = window.currentUserData.FullName || '';
    if (editEmail) editEmail.value = window.currentUserData.Email || '';
    if (editPhone) editPhone.value = window.currentUserData.PhoneNumber || '';
    if (editRoom) editRoom.value = window.currentUserData.RoomNumber || '';
    
    if (editProfileError) editProfileError.classList.remove('active');
    if (editProfileModal) editProfileModal.classList.add('active');
}

function openChangePasswordModal() {
    if (changePasswordForm) changePasswordForm.reset();
    if (changePasswordError) changePasswordError.classList.remove('active');
    if (changePasswordModal) changePasswordModal.classList.add('active');
}

function openExtrasModal() {
    if (extrasModal) extrasModal.classList.add('active');
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('active');
    });
}

// ============================================
// EDIT PROFILE
// ============================================
async function handleEditProfile(e) {
    e.preventDefault();
    
    if (!editProfileForm) return;
    
    const formData = new FormData(editProfileForm);
    
    // Add CSRF token
    if (csrfToken) {
        formData.append('csrf_token', csrfToken);
    }
    
    // Basic validation
    const name = formData.get('full_name');
    const email = formData.get('email');
    const phone = formData.get('phone');
    
    if (!name || name.trim().length < 2) {
        showEditProfileError('Name must be at least 2 characters');
        return;
    }
    
    if (!email || !isValidEmail(email)) {
        showEditProfileError('Please enter a valid email address');
        return;
    }
    
    if (phone && !isValidPhone(phone)) {
        showEditProfileError('Please enter a valid phone number');
        return;
    }
    
    // Show loading state
    const submitBtn = editProfileForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Updating...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('backend/api/update_profile.php', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeAllModals();
            showNotification('Profile updated successfully!', 'success');
            localStorage.removeItem('editProfileDraft'); // Clear saved draft
            loadUserProfile(); // Reload profile data
        } else {
            if (result.code === 'csrf_invalid') {
                showEditProfileError('Security token expired. Please refresh the page.');
                csrfToken = ''; // Clear invalid token
            } else {
                showEditProfileError(result.message || 'Failed to update profile');
            }
        }
    } catch (error) {
        showEditProfileError('Network error. Please check your connection.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// ============================================
// CHANGE PASSWORD
// ============================================
async function handleChangePassword(e) {
    e.preventDefault();
    
    if (!changePasswordForm) return;
    
    const formData = new FormData(changePasswordForm);
    
    // Add CSRF token
    if (csrfToken) {
        formData.append('csrf_token', csrfToken);
    }
    
    const currentPassword = formData.get('current_password');
    const newPassword = formData.get('new_password');
    const confirmPassword = formData.get('confirm_password');
    
    // Validation
    if (!currentPassword) {
        showPasswordError('Current password is required');
        return;
    }
    
    if (!newPassword || newPassword.length < 8) {
        showPasswordError('New password must be at least 8 characters');
        return;
    }
    
    if (!/[A-Z]/.test(newPassword)) {
        showPasswordError('Password must contain at least one uppercase letter');
        return;
    }
    
    if (!/[a-z]/.test(newPassword)) {
        showPasswordError('Password must contain at least one lowercase letter');
        return;
    }
    
    if (!/[0-9]/.test(newPassword)) {
        showPasswordError('Password must contain at least one number');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showPasswordError('Passwords do not match');
        return;
    }
    
    // Show loading state
    const submitBtn = changePasswordForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Changing...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('backend/api/change_password.php', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeAllModals();
            showNotification('Password changed successfully!', 'success');
            changePasswordForm.reset();
        } else {
            if (result.code === 'csrf_invalid') {
                showPasswordError('Security token expired. Please refresh the page.');
                csrfToken = '';
            } else {
                showPasswordError(result.message || 'Failed to change password');
            }
        }
    } catch (error) {
        showPasswordError('Network error. Please check your connection.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// ============================================
// LOGOUT
// ============================================
async function handleLogout() {
    const confirmed = await showConfirmationDialog(
        'Logout Confirmation',
        'Are you sure you want to logout?',
        'Logout',
        'Cancel'
    );
    
    if (!confirmed) return;
    
    try {
        // Show loading state
        if (logoutBtn) {
            logoutBtn.innerHTML = '<span class="spinner-small"></span> Logging out...';
            logoutBtn.disabled = true;
        }
        
        const response = await fetch('backend/api/logout.php', {
            method: 'POST',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Clear all stored data
            localStorage.clear();
            sessionStorage.clear();
            csrfToken = '';
            
            // Redirect with delay for better UX
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 500);
        } else {
            showNotification('Failed to logout: ' + result.message, 'error');
            if (logoutBtn) {
                logoutBtn.innerHTML = 'Logout';
                logoutBtn.disabled = false;
            }
        }
    } catch (error) {
        showNotification('Network error. Please try again.', 'error');
        if (logoutBtn) {
            logoutBtn.innerHTML = 'Logout';
            logoutBtn.disabled = false;
        }
    }
}

// ============================================
// FORM PERSISTENCE
// ============================================
function setupFormPersistence() {
    if (!editProfileForm) return;
    
    // Save form data on input
    editProfileForm.addEventListener('input', debounce(() => {
        const formData = {};
        new FormData(editProfileForm).forEach((value, key) => {
            formData[key] = value;
        });
        localStorage.setItem('editProfileDraft', JSON.stringify(formData));
    }, 500));
    
    // Load saved data on modal open
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            setTimeout(() => {
                const savedData = localStorage.getItem('editProfileDraft');
                if (savedData) {
                    try {
                        const data = JSON.parse(savedData);
                        Object.keys(data).forEach(key => {
                            const input = editProfileForm.querySelector(`[name="${key}"]`);
                            if (input) input.value = data[key];
                        });
                    } catch (e) {
                        localStorage.removeItem('editProfileDraft');
                    }
                }
            }, 100);
        });
    }
}

// ============================================
// SESSION VALIDATION
// ============================================
function setupSessionValidation() {
    // Check every 5 minutes
    setInterval(async () => {
        try {
            const response = await fetch('backend/api/check_session.php', {
                credentials: 'include'
            });
            
            if (response.status === 401) {
                showNotification('Your session will expire soon. Please save your work.', 'warning');
            }
        } catch (error) {
            // Silent fail - don't disturb user for network errors
        }
    }, 240000); // 4 minutes (check before session expires)
}

// ============================================
// CONNECTIVITY MONITOR
// ============================================
function setupConnectivityMonitor() {
    window.addEventListener('online', () => {
        showNotification('Back online. Syncing data...', 'success');
        // Reload profile when coming back online
        loadUserProfile();
    });
    
    window.addEventListener('offline', () => {
        showNotification('You are offline. Some features may be unavailable.', 'warning');
    });
    
    // Initial check
    if (!navigator.onLine) {
        showNotification('You are offline. Some features may be unavailable.', 'warning');
    }
}

// ============================================
// PHONE NUMBER FORMATTING
// ============================================
function setupPhoneFormatting() {
    const phoneInput = document.getElementById('editPhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            
            if (value.length > 0) {
                value = '(' + value.substring(0, 3);
                if (value.length > 3) {
                    value = value + ') ' + value.substring(3, 6);
                }
                if (value.length > 9) {
                    value = value + '-' + value.substring(9, 13);
                }
            }
            
            e.target.value = value.substring(0, 14);
        });
    }
}

// ============================================
// VALIDATION HELPERS
// ============================================
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

// ============================================
// UI COMPONENTS
// ============================================
function createLoadingSpinner() {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.innerHTML = `
        <div class="spinner"></div>
        <span>Loading...</span>
    `;
    return spinner;
}

async function showConfirmationDialog(title, message, confirmText = 'Confirm', cancelText = 'Cancel') {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'confirmation-dialog-overlay';
        dialog.innerHTML = `
            <div class="confirmation-dialog">
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="dialog-buttons">
                    <button class="btn-cancel">${cancelText}</button>
                    <button class="btn-confirm">${confirmText}</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        dialog.querySelector('.btn-confirm').addEventListener('click', () => {
            dialog.remove();
            resolve(true);
        });
        
        dialog.querySelector('.btn-cancel').addEventListener('click', () => {
            dialog.remove();
            resolve(false);
        });
    });
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
    
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
}

// ============================================
// ERROR/SUCCESS MESSAGES
// ============================================
function showEditProfileError(message) {
    if (editProfileError) {
        editProfileError.textContent = message;
        editProfileError.classList.add('active');
    } else {
        showNotification(message, 'error');
    }
}

function showPasswordError(message) {
    if (changePasswordError) {
        changePasswordError.textContent = message;
        changePasswordError.classList.add('active');
    } else {
        showNotification(message, 'error');
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}