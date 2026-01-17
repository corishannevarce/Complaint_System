/**
 * Session Check & Notification System
 * Production Ready Version
 * Include this script in ALL user pages BEFORE page-specific JavaScript
 */

// ============================================
// GLOBAL CONFIGURATION
// ============================================
const SESSION_CONFIG = {
    CHECK_INTERVAL: 5 * 60 * 1000, // Check every 5 minutes
    WARNING_THRESHOLD: 10 * 60 * 1000, // Warn 10 minutes before expiry
    REDIRECT_DELAY: 2000, // Wait 2 seconds before redirecting
    LOGIN_PAGE: 'login.html'
};

const NOTIFICATION_CONFIG = {
    DEFAULT_DURATION: 4000,
    ERROR_DURATION: 6000,
    WARNING_DURATION: 5000,
    MAX_NOTIFICATIONS: 3
};

// ============================================
// GLOBAL VARIABLES
// ============================================
let sessionCheckInterval = null;
let sessionExpiryTime = null;
let isSessionWarningShown = false;
let csrfToken = '';
let notifications = [];

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize session check
    initializeSessionCheck();
    
    // Initialize notification system
    createNotificationContainer();
    createLoadingOverlay();
    
    // Setup idle timeout detection
    setupIdleTimeoutDetection();
    
    // Setup connectivity monitoring
    setupConnectivityMonitoring();
    
    // Add CSS styles
    addGlobalStyles();
});

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Initialize session check system
 */
async function initializeSessionCheck() {
    try {
        // First check immediately
        const isLoggedIn = await checkSession();
        
        if (isLoggedIn) {
            // Start periodic checks
            sessionCheckInterval = setInterval(checkSessionBackground, SESSION_CONFIG.CHECK_INTERVAL);
            
            // Check for session warning
            checkSessionWarning();
        }
    } catch (error) {
        console.error('Session initialization failed:', error);
        showNotification('Unable to verify session. Please login again.', 'error');
        redirectToLogin();
    }
}

/**
 * Check if user is logged in
 */
async function checkSession() {
    try {
        const response = await fetch('backend/api/check_session.php', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        // Handle network errors
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        // Check for expired session
        if (!result.logged_in || result.session_expired) {
            showNotification('Session expired. Redirecting to login...', 'warning');
            await new Promise(resolve => setTimeout(resolve, SESSION_CONFIG.REDIRECT_DELAY));
            redirectToLogin(result.redirect_url);
            return false;
        }
        
        // Store session data
        if (result.user) {
            updateUserDisplay(result.user);
        }
        
        if (result.csrf_token) {
            csrfToken = result.csrf_token;
            // Update all forms with CSRF token
            updateFormsWithCSRFToken();
        }
        
        if (result.expiry_time) {
            sessionExpiryTime = new Date(result.expiry_time);
        }
        
        // Store session data for offline use
        if (result.user) {
            localStorage.setItem('user_session_data', JSON.stringify({
                user: result.user,
                expiry_time: result.expiry_time,
                last_updated: new Date().toISOString()
            }));
        }
        
        return true;
        
    } catch (error) {
        console.error('Session check error:', error);
        
        // Try to use cached session data
        const cachedData = getCachedSessionData();
        if (cachedData && !isSessionExpired(cachedData.expiry_time)) {
            updateUserDisplay(cachedData.user);
            showNotification('Using cached session data. Some features may be limited.', 'warning');
            return true;
        }
        
        // If we're offline and have no cached data, show warning
        if (!navigator.onLine) {
            showNotification('You are offline. Please reconnect to continue.', 'warning');
            return false;
        }
        
        showNotification('Session verification failed. Please login again.', 'error');
        redirectToLogin();
        return false;
    }
}

/**
 * Background session check (no UI interruption)
 */
async function checkSessionBackground() {
    try {
        const response = await fetch('backend/api/check_session.php?background=1', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            // Don't show error for background checks
            return;
        }
        
        const result = await response.json();
        
        if (!result.logged_in) {
            // Session expired in background
            clearInterval(sessionCheckInterval);
            showNotification('Your session has ended. Please login again.', 'warning');
            setTimeout(() => redirectToLogin(), SESSION_CONFIG.REDIRECT_DELAY);
        } else if (result.csrf_token && result.csrf_token !== csrfToken) {
            // CSRF token refreshed
            csrfToken = result.csrf_token;
            updateFormsWithCSRFToken();
        }
        
    } catch (error) {
        // Silent fail for background checks
    }
}

/**
 * Check if session is about to expire and show warning
 */
function checkSessionWarning() {
    if (!sessionExpiryTime || isSessionWarningShown) return;
    
    const now = new Date();
    const timeUntilExpiry = sessionExpiryTime - now;
    
    if (timeUntilExpiry <= SESSION_CONFIG.WARNING_THRESHOLD && timeUntilExpiry > 0) {
        showSessionWarning(timeUntilExpiry);
        isSessionWarningShown = true;
        
        // Check again after warning
        setTimeout(() => {
            isSessionWarningShown = false;
            checkSessionWarning();
        }, SESSION_CONFIG.WARNING_THRESHOLD);
    }
}

/**
 * Show session expiry warning
 */
function showSessionWarning(timeUntilExpiry) {
    const minutes = Math.ceil(timeUntilExpiry / (60 * 1000));
    
    // Create warning modal
    const modal = document.createElement('div');
    modal.className = 'session-warning-overlay';
    modal.innerHTML = `
        <div class="session-warning-modal">
            <div class="warning-header">
                <span class="material-symbols-rounded">warning</span>
                <h3>Session Expiring Soon</h3>
            </div>
            <div class="warning-body">
                <p>Your session will expire in <strong>${minutes} minute${minutes !== 1 ? 's' : ''}</strong>.</p>
                <p>Would you like to extend your session?</p>
            </div>
            <div class="warning-footer">
                <button class="btn-secondary" onclick="handleSessionExpire()">Logout Now</button>
                <button class="btn-primary" onclick="extendSession()">Extend Session</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-close after 30 seconds if no action
    setTimeout(() => {
        if (modal.parentNode) {
            modal.remove();
            isSessionWarningShown = false;
        }
    }, 30000);
}

/**
 * Handle session extension
 */
async function extendSession() {
    try {
        showLoading('Extending session...');
        
        const response = await fetch('backend/api/extend_session.php', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            sessionExpiryTime = new Date(result.new_expiry_time);
            isSessionWarningShown = false;
            
            // Remove warning modal
            const modal = document.querySelector('.session-warning-overlay');
            if (modal) modal.remove();
            
            showNotification('Session extended successfully!', 'success');
        } else {
            throw new Error(result.message || 'Failed to extend session');
        }
        
    } catch (error) {
        showNotification('Failed to extend session: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * Handle session expiry
 */
function handleSessionExpire() {
    logoutUser();
}

/**
 * Logout user
 */
async function logoutUser() {
    try {
        showLoading('Logging out...');
        
        await fetch('backend/api/logout.php', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'X-CSRF-Token': csrfToken
            }
        });
        
        // Clear all stored data
        clearUserData();
        
        showNotification('Logged out successfully', 'success');
        setTimeout(() => redirectToLogin(), 1000);
        
    } catch (error) {
        console.error('Logout error:', error);
        // Still redirect even if logout fails
        redirectToLogin();
    }
}

/**
 * Clear all user data
 */
function clearUserData() {
    // Clear local storage
    localStorage.removeItem('user_session_data');
    localStorage.removeItem('cached_data');
    localStorage.removeItem('form_drafts');
    
    // Clear session storage
    sessionStorage.clear();
    
    // Clear global variables
    csrfToken = '';
    sessionExpiryTime = null;
    isSessionWarningShown = false;
    
    // Stop session checks
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
    }
}

/**
 * Redirect to login page
 */
function redirectToLogin(customUrl = null) {
    const loginUrl = customUrl || SESSION_CONFIG.LOGIN_PAGE;
    window.location.href = loginUrl;
}

/**
 * Update user display in UI
 */
function updateUserDisplay(userData) {
    // Update account name in top bar
    const accountNameElements = document.querySelectorAll('.account-name, .user-name-display, .profile-name');
    accountNameElements.forEach(element => {
        if (userData.full_name) {
            element.textContent = userData.full_name;
        }
    });
    
    // Update user avatar/initials
    const avatarElements = document.querySelectorAll('.user-avatar, .profile-initials');
    avatarElements.forEach(element => {
        if (userData.full_name) {
            const initials = userData.full_name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);
            
            if (element.classList.contains('profile-initials')) {
                element.textContent = initials;
            } else if (!element.hasAttribute('data-initials')) {
                element.setAttribute('data-initials', initials);
            }
        }
    });
    
    // Update any role-specific elements
    if (userData.role) {
        document.querySelectorAll('[data-role]').forEach(element => {
            const role = element.getAttribute('data-role');
            if (role !== userData.role) {
                element.style.display = 'none';
            } else {
                element.style.display = '';
            }
        });
    }
    
    // Store user data globally
    window.currentUser = userData;
}

/**
 * Update forms with CSRF token
 */
function updateFormsWithCSRFToken() {
    if (!csrfToken) return;
    
    document.querySelectorAll('form').forEach(form => {
        // Check if CSRF field already exists
        let csrfField = form.querySelector('input[name="csrf_token"]');
        
        if (!csrfField) {
            csrfField = document.createElement('input');
            csrfField.type = 'hidden';
            csrfField.name = 'csrf_token';
            form.appendChild(csrfField);
        }
        
        csrfField.value = csrfToken;
    });
}

/**
 * Get cached session data
 */
function getCachedSessionData() {
    try {
        const cached = localStorage.getItem('user_session_data');
        if (cached) {
            const data = JSON.parse(cached);
            
            // Check if cache is still valid (less than 24 hours old)
            const cacheAge = new Date() - new Date(data.last_updated);
            const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours
            
            if (cacheAge < maxCacheAge) {
                return data;
            } else {
                localStorage.removeItem('user_session_data');
            }
        }
    } catch (error) {
        console.error('Error reading cached session:', error);
    }
    return null;
}

/**
 * Check if session is expired
 */
function isSessionExpired(expiryTimeString) {
    if (!expiryTimeString) return true;
    
    const expiryTime = new Date(expiryTimeString);
    const now = new Date();
    
    return now >= expiryTime;
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================

/**
 * Create notification container
 */
function createNotificationContainer() {
    if (!document.getElementById('notificationContainer')) {
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
}

/**
 * Show notification
 */
function showNotification(message, type = 'info', duration = null, options = {}) {
    // Check if similar notification already exists
    if (options.preventDuplicate) {
        const existing = notifications.find(n => 
            n.message === message && n.type === type
        );
        if (existing) {
            // Update existing notification timer
            clearTimeout(existing.timer);
            existing.timer = setTimeout(() => removeNotification(existing.id), existing.duration);
            return existing.id;
        }
    }
    
    // Create notification ID
    const id = 'notification-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Get duration
    const actualDuration = duration || 
        (type === 'error' ? NOTIFICATION_CONFIG.ERROR_DURATION :
         type === 'warning' ? NOTIFICATION_CONFIG.WARNING_DURATION :
         NOTIFICATION_CONFIG.DEFAULT_DURATION);
    
    // Create notification element
    const notification = document.createElement('div');
    notification.id = id;
    notification.className = `notification notification-${type}`;
    
    // Set content
    const icon = getNotificationIcon(type);
    notification.innerHTML = `
        <div class="notification-icon">${icon}</div>
        <div class="notification-content">${escapeHtml(message)}</div>
        <button class="notification-close" aria-label="Close notification">×</button>
    `;
    
    // Add to container
    const container = document.getElementById('notificationContainer');
    container.appendChild(notification);
    
    // Set auto-remove timer
    const timer = setTimeout(() => removeNotification(id), actualDuration);
    
    // Store notification info
    notifications.push({
        id,
        message,
        type,
        duration: actualDuration,
        timer,
        element: notification
    });
    
    // Limit number of notifications
    if (notifications.length > NOTIFICATION_CONFIG.MAX_NOTIFICATIONS) {
        const oldest = notifications.shift();
        removeNotification(oldest.id);
    }
    
    // Setup close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        removeNotification(id);
    });
    
    // Add click handler if callback provided
    if (options.onClick) {
        notification.style.cursor = 'pointer';
        notification.addEventListener('click', options.onClick);
    }
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 10);
    
    return id;
}

/**
 * Remove notification
 */
function removeNotification(id) {
    const index = notifications.findIndex(n => n.id === id);
    if (index === -1) return;
    
    const notification = notifications[index];
    
    // Clear timer
    if (notification.timer) {
        clearTimeout(notification.timer);
    }
    
    // Animate out
    notification.element.classList.remove('show');
    notification.element.classList.add('hide');
    
    // Remove after animation
    setTimeout(() => {
        if (notification.element.parentNode) {
            notification.element.remove();
        }
        notifications.splice(index, 1);
    }, 300);
}

/**
 * Clear all notifications
 */
function clearAllNotifications() {
    notifications.forEach(notification => {
        removeNotification(notification.id);
    });
}

/**
 * Get notification icon
 */
function getNotificationIcon(type) {
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    return icons[type] || icons.info;
}

/**
 * Convenience functions
 */
function showSuccess(message, options = {}) {
    return showNotification(message, 'success', null, options);
}

function showError(message, options = {}) {
    return showNotification(message, 'error', NOTIFICATION_CONFIG.ERROR_DURATION, options);
}

function showWarning(message, options = {}) {
    return showNotification(message, 'warning', NOTIFICATION_CONFIG.WARNING_DURATION, options);
}

function showInfo(message, options = {}) {
    return showNotification(message, 'info', null, options);
}

// ============================================
// LOADING OVERLAY
// ============================================

/**
 * Create loading overlay
 */
function createLoadingOverlay() {
    if (!document.getElementById('loadingOverlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <div class="loading-text">Loading...</div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
}

/**
 * Show loading overlay
 */
function showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    
    // Update message if provided
    if (message) {
        const textElement = overlay.querySelector('.loading-text');
        if (textElement) textElement.textContent = message;
    }
    
    overlay.classList.add('active');
    
    // Set timeout to prevent hanging loading state
    overlay.dataset.timeout = setTimeout(() => {
        if (overlay.classList.contains('active')) {
            hideLoading();
            showWarning('Operation is taking longer than expected', {
                onClick: () => location.reload()
            });
        }
    }, 30000); // 30 second timeout
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    
    // Clear timeout
    if (overlay.dataset.timeout) {
        clearTimeout(overlay.dataset.timeout);
        delete overlay.dataset.timeout;
    }
    
    overlay.classList.remove('active');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Setup idle timeout detection
 */
function setupIdleTimeoutDetection() {
    let idleTimeout = null;
    const idleDuration = 15 * 60 * 1000; // 15 minutes
    
    const resetIdleTimer = () => {
        if (idleTimeout) clearTimeout(idleTimeout);
        idleTimeout = setTimeout(() => {
            // User is idle, check if we should show warning
            if (document.visibilityState === 'visible') {
                showWarning('You have been idle for a while. Your session may expire soon.');
            }
        }, idleDuration);
    };
    
    // Events that reset idle timer
    ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, resetIdleTimer, { passive: true });
    });
    
    resetIdleTimer(); // Start the timer
}

/**
 * Setup connectivity monitoring
 */
function setupConnectivityMonitoring() {
    window.addEventListener('online', () => {
        showSuccess('Back online. Syncing data...');
        
        // Re-check session when coming back online
        setTimeout(checkSession, 1000);
    });
    
    window.addEventListener('offline', () => {
        showWarning('You are offline. Some features may be unavailable.');
    });
    
    // Initial check
    if (!navigator.onLine) {
        showWarning('You are offline. Some features may be unavailable.');
    }
}

/**
 * Add global styles
 */
function addGlobalStyles() {
    if (document.getElementById('global-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'global-styles';
    styles.textContent = `
        /* Notification Styles */
        .notification-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9998;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
        }
        
        .notification {
            background: white;
            border-radius: 12px;
            padding: 16px 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            display: flex;
            align-items: center;
            gap: 14px;
            transform: translateX(400px);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border-left: 5px solid;
            max-height: 0;
            overflow: hidden;
        }
        
        .notification.show {
            transform: translateX(0);
            opacity: 1;
            max-height: 200px;
            margin-bottom: 0;
        }
        
        .notification.hide {
            transform: translateX(400px);
            opacity: 0;
            max-height: 0;
            margin-bottom: -10px;
        }
        
        .notification-icon {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: bold;
            flex-shrink: 0;
        }
        
        .notification-content {
            flex: 1;
            font-family: 'Poppins', sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: #0a1128;
        }
        
        .notification-close {
            background: transparent;
            border: none;
            color: #9ca3af;
            cursor: pointer;
            font-size: 24px;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: color 0.2s;
        }
        
        .notification-close:hover {
            color: #6b7280;
        }
        
        /* Notification Types */
        .notification-success {
            border-left-color: #10b981;
            background: linear-gradient(to right, #f0fdf4, white);
        }
        
        .notification-success .notification-icon {
            background: #10b981;
            color: white;
        }
        
        .notification-error {
            border-left-color: #ef4444;
            background: linear-gradient(to right, #fef2f2, white);
        }
        
        .notification-error .notification-icon {
            background: #ef4444;
            color: white;
        }
        
        .notification-warning {
            border-left-color: #f59e0b;
            background: linear-gradient(to right, #fffbeb, white);
        }
        
        .notification-warning .notification-icon {
            background: #f59e0b;
            color: white;
        }
        
        .notification-info {
            border-left-color: #3b82f6;
            background: linear-gradient(to right, #eff6ff, white);
        }
        
        .notification-info .notification-icon {
            background: #3b82f6;
            color: white;
        }
        
        /* Loading Overlay */
        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 9999;
            display: none;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(4px);
        }
        
        .loading-overlay.active {
            display: flex;
            animation: fadeIn 0.3s ease;
        }
        
        .loading-spinner {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            text-align: center;
            animation: slideUp 0.3s ease;
        }
        
        .loading-spinner .spinner {
            width: 60px;
            height: 60px;
            border: 4px solid #e5e7eb;
            border-top: 4px solid #3b82f6;
            border-radius: 50%;
            margin: 0 auto 20px;
            animation: spin 1s linear infinite;
        }
        
        .loading-text {
            font-family: 'Poppins', sans-serif;
            font-size: 16px;
            font-weight: 600;
            color: #0a1128;
        }
        
        /* Session Warning Modal */
        .session-warning-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
            backdrop-filter: blur(4px);
        }
        
        .session-warning-modal {
            background: white;
            border-radius: 20px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            animation: slideUp 0.3s ease;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        
        .warning-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            color: #f59e0b;
        }
        
        .warning-header h3 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        
        .warning-body {
            margin-bottom: 30px;
        }
        
        .warning-body p {
            margin: 10px 0;
            color: #4b5563;
            line-height: 1.6;
        }
        
        .warning-footer {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
        }
        
        /* Buttons */
        .btn-primary, .btn-secondary {
            padding: 12px 24px;
            border-radius: 8px;
            font-family: 'Poppins', sans-serif;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
            font-size: 14px;
        }
        
        .btn-primary {
            background: #3b82f6;
            color: white;
        }
        
        .btn-primary:hover {
            background: #2563eb;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        
        .btn-secondary {
            background: #f3f4f6;
            color: #4b5563;
        }
        
        .btn-secondary:hover {
            background: #e5e7eb;
            transform: translateY(-2px);
        }
        
        /* Animations */
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes slideUp {
            from {
                transform: translateY(30px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .notification-container {
                top: 10px;
                right: 10px;
                left: 10px;
                max-width: none;
            }
            
            .notification {
                border-left-width: 4px;
            }
            
            .session-warning-modal {
                padding: 20px;
                width: 95%;
            }
            
            .warning-footer {
                flex-direction: column;
            }
            
            .warning-footer button {
                width: 100%;
            }
        }
    `;
    
    document.head.appendChild(styles);
}

/**
 * HTML escape function
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Get CSRF token for API calls
 */
function getCSRFToken() {
    return csrfToken;
}

/**
 * Make authenticated API call
 */
async function authenticatedFetch(url, options = {}) {
    const defaultOptions = {
        credentials: 'include',
        headers: {
            'X-CSRF-Token': csrfToken,
            'Content-Type': 'application/json',
            ...options.headers
        }
    };
    
    return fetch(url, { ...defaultOptions, ...options });
}

// ============================================
// EXPORT FUNCTIONS FOR GLOBAL USE
// ============================================
window.SessionManager = {
    checkSession,
    logoutUser,
    getCSRFToken,
    authenticatedFetch,
    clearUserData
};

window.NotificationManager = {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAllNotifications
};

window.LoadingManager = {
    showLoading,
    hideLoading
};

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    showError('An unexpected error occurred. Please refresh the page.');
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    showError('An operation failed. Please try again.');
});