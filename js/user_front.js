/**
 * Complaint Desk - User Frontend JavaScript
 * Production Ready Version
 * Handles all user interactions and API calls
 */

// ============================================
// GLOBAL VARIABLES
// ============================================
let allComplaints = [];
let currentFilters = {
    status: '',
    type: 'All Types',
    date: '',
    month: 'All Months',
    sort_by: 'newest'
};
let csrfToken = '';
let isSubmitting = false;
let complaintModal = null;

// ============================================
// DOM ELEMENTS (Safe Access)
// ============================================
function getElement(selector) {
    return document.querySelector(selector);
}

function getElements(selector) {
    return document.querySelectorAll(selector);
}

// Lazy-loaded element references
const elements = {
    get modal() { return document.getElementById('complaintModal'); },
    get addComplaintBtn() { return document.querySelector('.add-complaint-btn'); },
    get closeModalBtn() { return document.querySelector('.btn-secondary[data-action="close-modal"]'); },
    get complaintForm() { return document.getElementById('complaintForm'); },
    get validateMessage() { return document.querySelector('.validate-message'); },
    get typeFilter() { return document.getElementById('typeFilter'); },
    get dateFilter() { return document.getElementById('dateFilter'); },
    get monthFilter() { return document.getElementById('monthFilter'); },
    get clearFiltersBtn() { return document.querySelector('.clear-filters-btn'); },
    get sortFilter() { return document.getElementById('sortFilter'); },
    get searchInput() { return document.getElementById('searchComplaint'); },
    get pendingCards() { return document.getElementById('pendingCards'); },
    get progressCards() { return document.getElementById('progressCards'); },
    get resolvedCards() { return document.getElementById('resolvedCards'); }
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Check session first
        await checkSession();
        
        // Load initial data
        await Promise.all([
            loadComplaints(),
            loadComplaintTypes(),
            loadUserProfile()
        ]);
        
        // Setup UI
        setupEventListeners();
        populateMonthFilter();
        populateTypeFilter();
        setupDragAndDrop();
        setupRealTimeUpdates();
        setupOfflineSupport();
        
        // Restore saved filters
        restoreFilters();
        
        // Initialize tooltips
        initTooltips();
        
    } catch (error) {
        console.error('Initialization failed:', error);
        showNotification('Failed to initialize application. Please refresh.', 'error');
    }
});

// ============================================
// SESSION CHECK
// ============================================
async function checkSession() {
    try {
        const response = await fetch('backend/api/check_session.php', {
            credentials: 'include',
            headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (response.status === 401) {
            showNotification('Session expired. Redirecting to login...', 'warning');
            setTimeout(() => window.location.href = 'login.html', 2000);
            throw new Error('Session expired');
        }
        
        const result = await response.json();
        if (result.csrf_token) {
            csrfToken = result.csrf_token;
        }
        
        return true;
    } catch (error) {
        throw error;
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Modal controls
    if (elements.addComplaintBtn) {
        elements.addComplaintBtn.addEventListener('click', () => openModal());
    }
    
    if (elements.closeModalBtn) {
        elements.closeModalBtn.addEventListener('click', () => closeModal());
    }
    
    // Click outside modal to close
    document.addEventListener('click', (e) => {
        if (elements.modal && e.target === elements.modal) {
            closeModal();
        }
    });
    
    // Form submission
    if (elements.complaintForm) {
        elements.complaintForm.addEventListener('submit', handleComplaintSubmit);
    }
    
    // Filter controls
    if (elements.typeFilter) {
        elements.typeFilter.addEventListener('change', applyFilters);
    }
    
    if (elements.dateFilter) {
        elements.dateFilter.addEventListener('change', applyFilters);
    }
    
    if (elements.monthFilter) {
        elements.monthFilter.addEventListener('change', applyFilters);
    }
    
    if (elements.sortFilter) {
        elements.sortFilter.addEventListener('change', applyFilters);
    }
    
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', debounce(() => {
            currentFilters.search = elements.searchInput.value.trim();
            applyFilters();
        }, 500));
    }
    
    if (elements.clearFiltersBtn) {
        elements.clearFiltersBtn.addEventListener('click', clearFilters);
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + N to open new complaint
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            if (elements.addComplaintBtn) {
                elements.addComplaintBtn.click();
            }
        }
        
        // Escape to close modal
        if (e.key === 'Escape' && elements.modal && elements.modal.classList.contains('active')) {
            closeModal();
        }
    });
    
    // Beforeunload - save state
    window.addEventListener('beforeunload', () => {
        saveCurrentState();
    });
}

// ============================================
// LOAD COMPLAINT TYPES
// ============================================
async function loadComplaintTypes() {
    try {
        const response = await fetch('backend/api/get_complaint_types.php', {
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            window.complaintTypes = result.data;
            
            // Update form dropdown
            const typeSelect = document.getElementById('complaint_type');
            if (typeSelect) {
                typeSelect.innerHTML = '<option value="">Select Type</option>';
                result.data.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.type_id || type.type_name;
                    option.textContent = type.type_name;
                    typeSelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Failed to load complaint types:', error);
    }
}

// ============================================
// LOAD USER PROFILE
// ============================================
async function loadUserProfile() {
    try {
        const response = await fetch('backend/api/get_profile.php', {
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            window.userProfile = result.data;
            
            // Pre-fill form with user data
            const nameInput = document.getElementById('full_name');
            const roomInput = document.getElementById('room_number');
            
            if (nameInput && result.data.FullName) {
                nameInput.value = result.data.FullName;
                nameInput.readOnly = true;
            }
            
            if (roomInput && result.data.RoomNumber) {
                roomInput.value = result.data.RoomNumber;
                roomInput.readOnly = true;
            }
        }
    } catch (error) {
        console.error('Failed to load user profile:', error);
    }
}

// ============================================
// MODAL FUNCTIONS
// ============================================
function openModal() {
    if (!elements.modal) return;
    
    elements.modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    if (elements.validateMessage) {
        elements.validateMessage.classList.remove('active');
    }
    
    if (elements.complaintForm) {
        elements.complaintForm.reset();
        
        // Restore draft if exists
        const draft = localStorage.getItem('complaintDraft');
        if (draft) {
            try {
                const data = JSON.parse(draft);
                Object.keys(data).forEach(key => {
                    const input = elements.complaintForm.querySelector(`[name="${key}"]`);
                    if (input) input.value = data[key];
                });
            } catch (e) {
                localStorage.removeItem('complaintDraft');
            }
        }
    }
    
    // Set focus
    setTimeout(() => {
        const firstInput = elements.complaintForm?.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus();
    }, 100);
}

function closeModal() {
    if (!elements.modal) return;
    
    elements.modal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Clear draft
    localStorage.removeItem('complaintDraft');
}

// ============================================
// LOAD COMPLAINTS
// ============================================
async function loadComplaints() {
    try {
        showLoadingState();
        
        // Build query parameters
        const params = new URLSearchParams({
            ...currentFilters,
            csrf_token: csrfToken
        });
        
        const response = await fetch(`backend/api/get_complaints.php?${params}`, {
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        // Handle session expiry
        if (response.status === 401) {
            showNotification('Session expired. Please login again.', 'error');
            setTimeout(() => window.location.href = 'login.html', 2000);
            return;
        }
        
        const result = await response.json();
        
        if (result.success) {
            allComplaints = result.data.all || [];
            displayComplaints(result.data.grouped);
            updateCounts(result.data.counts);
            
            // Cache data for offline use
            if (navigator.onLine) {
                localStorage.setItem('cachedComplaints', JSON.stringify(allComplaints));
                localStorage.setItem('cachedComplaintsTime', Date.now());
            }
        } else {
            if (result.code === 'csrf_invalid') {
                showNotification('Security token expired. Refreshing...', 'error');
                setTimeout(() => location.reload(), 1500);
            } else {
                // Try cached data
                const cached = getCachedComplaints();
                if (cached.length > 0) {
                    allComplaints = cached;
                    groupAndDisplayComplaints(cached);
                    showNotification('Showing cached data. Connection issue detected.', 'warning');
                } else {
                    throw new Error(result.message || 'Failed to load complaints');
                }
            }
        }
    } catch (error) {
        console.error('Load complaints error:', error);
        
        // Try cached data
        const cached = getCachedComplaints();
        if (cached.length > 0) {
            allComplaints = cached;
            groupAndDisplayComplaints(cached);
            showNotification('Showing cached data. ' + error.message, 'warning');
        } else {
            showErrorState('Failed to load complaints. Please check your connection.');
        }
    } finally {
        hideLoadingState();
    }
}

// ============================================
// GET CACHED COMPLAINTS
// ============================================
function getCachedComplaints() {
    try {
        const cached = localStorage.getItem('cachedComplaints');
        const cachedTime = localStorage.getItem('cachedComplaintsTime');
        
        if (cached && cachedTime) {
            const age = Date.now() - parseInt(cachedTime);
            const maxAge = 2 * 60 * 60 * 1000; // 2 hours
            if (age < maxAge) {
                return JSON.parse(cached);
            }
        }
    } catch (e) {
        console.error('Error loading cached complaints:', e);
    }
    return [];
}

// ============================================
// DISPLAY COMPLAINTS
// ============================================
function displayComplaints(grouped) {
    if (!elements.pendingCards || !elements.progressCards || !elements.resolvedCards) return;
    
    // Clear all columns
    [elements.pendingCards, elements.progressCards, elements.resolvedCards].forEach(container => {
        if (container) container.innerHTML = '';
    });
    
    // Display each status group
    const statusMap = {
        'Pending': { container: elements.pendingCards, type: 'pending' },
        'In Progress': { container: elements.progressCards, type: 'progress' },
        'Resolved': { container: elements.resolvedCards, type: 'resolved' }
    };
    
    Object.entries(statusMap).forEach(([status, config]) => {
        const complaints = grouped[status] || [];
        const container = config.container;
        
        if (!container) return;
        
        if (complaints.length === 0) {
            container.innerHTML = createEmptyState(status);
            return;
        }
        
        // Sort complaints
        const sortedComplaints = sortComplaints([...complaints]);
        
        // Create and append cards
        sortedComplaints.forEach(complaint => {
            const card = createComplaintCard(complaint, config.type);
            container.appendChild(card);
        });
    });
    
    // Initialize card interactions
    initCardInteractions();
}

// ============================================
// GROUP AND DISPLAY COMPLAINTS (Client-side)
// ============================================
function groupAndDisplayComplaints(complaints) {
    const grouped = {
        'Pending': [],
        'In Progress': [],
        'Resolved': []
    };
    
    complaints.forEach(complaint => {
        if (grouped[complaint.Status]) {
            grouped[complaint.Status].push(complaint);
        }
    });
    
    displayComplaints(grouped);
    
    // Update counts
    updateCounts({
        pending: grouped['Pending'].length,
        in_progress: grouped['In Progress'].length,
        resolved: grouped['Resolved'].length
    });
}

// ============================================
// SORT COMPLAINTS
// ============================================
function sortComplaints(complaints) {
    const sortBy = currentFilters.sort_by || 'newest';
    
    return complaints.sort((a, b) => {
        const dateA = new Date(a.CreatedAt || a.UpdatedAt);
        const dateB = new Date(b.CreatedAt || b.UpdatedAt);
        
        switch (sortBy) {
            case 'newest':
                return dateB - dateA;
            case 'oldest':
                return dateA - dateB;
            case 'room':
                return (a.RoomNumber || '').localeCompare(b.RoomNumber || '');
            case 'type':
                return (a.ComplaintType || '').localeCompare(b.ComplaintType || '');
            default:
                return dateB - dateA;
        }
    });
}

// ============================================
// CREATE EMPTY STATE
// ============================================
function createEmptyState(status) {
    const messages = {
        'Pending': 'No pending complaints',
        'In Progress': 'No complaints in progress',
        'Resolved': 'No resolved complaints'
    };
    
    const icons = {
        'Pending': '⏳',
        'In Progress': '🔄',
        'Resolved': '✅'
    };
    
    return `
        <div class="empty-column-state">
            <div class="empty-icon">${icons[status] || '📋'}</div>
            <p class="empty-title">${messages[status] || 'No complaints'}</p>
            <p class="empty-subtitle">Try adjusting your filters</p>
            ${Object.keys(currentFilters).some(key => 
                currentFilters[key] && 
                !['status', 'sort_by'].includes(key) &&
                currentFilters[key] !== 'All Types'
            ) ? '<button class="btn-text" onclick="clearFilters()">Clear Filters</button>' : ''}
        </div>
    `;
}

// ============================================
// CREATE COMPLAINT CARD
// ============================================
function createComplaintCard(complaint, columnType) {
    const card = document.createElement('article');
    card.className = 'complaint-card';
    card.dataset.complaintId = complaint.ComplaintID;
    card.dataset.status = complaint.Status;
    card.dataset.updated = complaint.UpdatedAt || complaint.CreatedAt;
    
    // Format dates
    const createdDate = formatDate(complaint.CreatedAt);
    const updatedDate = formatDate(complaint.UpdatedAt);
    const resolvedDate = formatDate(complaint.ResolvedAt);
    
    // Status colors
    const statusColors = {
        pending: '#f59e0b',
        progress: '#3b82f6',
        resolved: '#10b981'
    };
    
    // Create card HTML
    let cardHTML = `
        <div class="card-header">
            <div class="card-id-badge" style="border-left-color: ${statusColors[columnType]}">
                <span class="material-symbols-rounded">description</span>
                ${complaint.ComplaintCode || `CD-${String(complaint.ComplaintID).padStart(5, '0')}`}
            </div>
            <div class="card-actions">
                <button class="btn-icon btn-view-details" title="View Details" onclick="viewComplaintDetails(${complaint.ComplaintID})">
                    <span class="material-symbols-rounded">visibility</span>
                </button>
                ${columnType === 'resolved' ? `
                <button class="btn-icon btn-delete" title="Delete Complaint" onclick="deleteComplaint(${complaint.ComplaintID})">
                    <span class="material-symbols-rounded">delete</span>
                </button>
                ` : ''}
            </div>
        </div>
        
        <div class="card-body">
            <div class="card-meta">
                <span class="meta-item">
                    <span class="material-symbols-rounded">location_home</span>
                    Room ${complaint.RoomNumber || 'N/A'}
                </span>
                <span class="meta-item">
                    <span class="material-symbols-rounded">person</span>
                    ${complaint.FullName || 'N/A'}
                </span>
            </div>
            
            <div class="type-badge type-${(complaint.ComplaintType || '').replace(/\s+/g, '-').toLowerCase()}">
                ${complaint.ComplaintType || 'Unknown Type'}
            </div>
            
            <div class="card-description">
                <h4>Description</h4>
                <p>${escapeHtml(complaint.Description || 'No description provided')}</p>
            </div>
            
            <div class="card-timeline">
                <div class="timeline-item">
                    <span class="material-symbols-rounded">schedule</span>
                    Filed: ${createdDate}
                </div>
    `;
    
    // Add update timeline if not pending
    if (columnType !== 'pending' && updatedDate !== createdDate) {
        cardHTML += `
            <div class="timeline-item">
                <span class="material-symbols-rounded">update</span>
                Updated: ${updatedDate}
            </div>
        `;
    }
    
    // Add resolved timeline
    if (columnType === 'resolved' && resolvedDate) {
        cardHTML += `
            <div class="timeline-item resolved">
                <span class="material-symbols-rounded">check_circle</span>
                Resolved: ${resolvedDate}
            </div>
        `;
    }
    
    cardHTML += `</div>`;
    
    // Add resolution notes if available
    if (complaint.ResolutionNotes) {
        cardHTML += `
            <div class="resolution-notes">
                <h4>Resolution Notes</h4>
                <p>${escapeHtml(complaint.ResolutionNotes)}</p>
            </div>
        `;
    }
    
    // Add record logs if available
    if (complaint.RecordLogs && complaint.RecordLogs.length > 0) {
        cardHTML += `
            <div class="records-section">
                <button class="toggle-logs-btn" onclick="toggleLogs(this)">
                    <span class="material-symbols-rounded">history</span>
                    History (${complaint.RecordLogs.length})
                    <span class="toggle-icon">▼</span>
                </button>
                <div class="record-logs-container" style="display: none;">
        `;
        
        complaint.RecordLogs.slice(0, 3).forEach(log => {
            cardHTML += `
                <div class="record-log">
                    <time class="log-timestamp">${formatDateTime(log.LogTimestamp)}</time>
                    <span class="log-message">${escapeHtml(log.LogMessage)}</span>
                </div>
            `;
        });
        
        if (complaint.RecordLogs.length > 3) {
            cardHTML += `
                <button class="show-more-logs" onclick="showAllLogs(this, ${complaint.ComplaintID})">
                    Show ${complaint.RecordLogs.length - 3} more
                </button>
            `;
        }
        
        cardHTML += `</div></div>`;
    }
    
    // Add priority indicator if high priority
    if (complaint.Priority === 'High' || complaint.Priority === 'Urgent') {
        cardHTML += `
            <div class="priority-indicator priority-${complaint.Priority.toLowerCase()}">
                <span class="material-symbols-rounded">priority_high</span>
                ${complaint.Priority} Priority
            </div>
        `;
    }
    
    // Add attachments preview if available
    if (complaint.Attachments && complaint.Attachments.length > 0) {
        cardHTML += `
            <div class="attachments-preview">
                <span class="material-symbols-rounded">attach_file</span>
                ${complaint.Attachments.length} attachment${complaint.Attachments.length !== 1 ? 's' : ''}
            </div>
        `;
    }
    
    cardHTML += `</div></article>`;
    card.innerHTML = cardHTML;
    
    return card;
}

// ============================================
// UPDATE COUNTS
// ============================================
function updateCounts(counts) {
    const pendingCount = document.querySelector('#pendingColumn .column-count');
    const progressCount = document.querySelector('#progressColumn .column-count');
    const resolvedCount = document.querySelector('#resolvedColumn .column-count');
    
    if (pendingCount) pendingCount.textContent = counts.pending || 0;
    if (progressCount) progressCount.textContent = counts.in_progress || 0;
    if (resolvedCount) resolvedCount.textContent = counts.resolved || 0;
    
    // Update tooltips
    [pendingCount, progressCount, resolvedCount].forEach(el => {
        if (el) {
            const count = parseInt(el.textContent) || 0;
            el.title = `${count} complaint${count !== 1 ? 's' : ''}`;
        }
    });
}

// ============================================
// SUBMIT COMPLAINT
// ============================================
async function handleComplaintSubmit(e) {
    e.preventDefault();
    
    if (isSubmitting) {
        showNotification('Please wait, submission in progress...', 'warning');
        return;
    }
    
    const form = elements.complaintForm;
    if (!form) return;
    
    const formData = new FormData(form);
    
    // Add CSRF token
    if (csrfToken) {
        formData.append('csrf_token', csrfToken);
    }
    
    // Get form values
    const type = formData.get('complaint_type');
    const description = formData.get('description');
    const attachments = formData.get('attachments');
    
    // Validation
    if (!type || type.trim() === '') {
        showValidationError('Please select a complaint type');
        return;
    }
    
    if (!description || description.trim().length < 10) {
        showValidationError('Description must be at least 10 characters');
        return;
    }
    
    if (description.trim().length > 1000) {
        showValidationError('Description must not exceed 1000 characters');
        return;
    }
    
    // Validate attachments
    if (attachments) {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        
        for (let file of attachments.files) {
            if (file.size > maxSize) {
                showValidationError(`File "${file.name}" exceeds 10MB limit`);
                return;
            }
            
            if (!allowedTypes.includes(file.type)) {
                showValidationError(`File "${file.name}" has unsupported type. Allowed: JPG, PNG, GIF, PDF`);
                return;
            }
        }
    }
    
    // Show loading state
    isSubmitting = true;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('backend/api/create_complaint.php', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Clear draft
            localStorage.removeItem('complaintDraft');
            
            // Close modal and show success
            closeModal();
            showNotification('Complaint submitted successfully!', 'success');
            
            // Reload complaints
            await loadComplaints();
            
            // Clear form
            form.reset();
        } else {
            if (result.code === 'csrf_invalid') {
                showValidationError('Security token expired. Please refresh the page.');
                csrfToken = '';
            } else if (result.code === 'validation_error') {
                showValidationError(result.message || 'Validation failed');
            } else {
                showValidationError(result.message || 'Failed to submit complaint');
            }
            
            // Save draft
            const draft = {};
            formData.forEach((value, key) => {
                if (key !== 'attachments') draft[key] = value;
            });
            localStorage.setItem('complaintDraft', JSON.stringify(draft));
        }
    } catch (error) {
        console.error('Submit error:', error);
        
        // Check if offline
        if (!navigator.onLine) {
            showValidationError('You are offline. Complaint saved as draft.');
            
            // Save offline draft
            const draft = {
                type,
                description: description.trim(),
                timestamp: new Date().toISOString(),
                offline: true
            };
            
            const offlineComplaints = JSON.parse(localStorage.getItem('offlineComplaints') || '[]');
            offlineComplaints.push(draft);
            localStorage.setItem('offlineComplaints', JSON.stringify(offlineComplaints));
            
            // Clear form draft
            localStorage.removeItem('complaintDraft');
        } else {
            showValidationError('Network error. Please try again.');
        }
    } finally {
        // Reset button state
        isSubmitting = false;
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// ============================================
// VIEW COMPLAINT DETAILS
// ============================================
async function viewComplaintDetails(complaintId) {
    try {
        showLoading('Loading complaint details...');
        
        const response = await fetch(`backend/api/get_complaint_details.php?id=${complaintId}`, {
            credentials: 'include',
            headers: {
                'X-CSRF-Token': csrfToken
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showComplaintModal(result.data);
        } else {
            throw new Error(result.message || 'Failed to load details');
        }
    } catch (error) {
        showNotification('Failed to load complaint details: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ============================================
// SHOW COMPLAINT MODAL
// ============================================
function showComplaintModal(complaint) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    
    modal.innerHTML = `
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h2>Complaint Details</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="details-grid">
                    <div class="detail-item">
                        <label>Complaint ID</label>
                        <span class="detail-value">${complaint.ComplaintCode}</span>
                    </div>
                    <div class="detail-item">
                        <label>Status</label>
                        <span class="status-badge status-${complaint.Status.toLowerCase().replace(' ', '-')}">
                            ${complaint.Status}
                        </span>
                    </div>
                    <div class="detail-item">
                        <label>Resident</label>
                        <span class="detail-value">${complaint.FullName}</span>
                    </div>
                    <div class="detail-item">
                        <label>Room</label>
                        <span class="detail-value">${complaint.RoomNumber}</span>
                    </div>
                    <div class="detail-item">
                        <label>Type</label>
                        <span class="type-badge">${complaint.ComplaintType}</span>
                    </div>
                    <div class="detail-item">
                        <label>Priority</label>
                        <span class="priority-badge priority-${complaint.Priority?.toLowerCase() || 'normal'}">
                            ${complaint.Priority || 'Normal'}
                        </span>
                    </div>
                    <div class="detail-item">
                        <label>Filed</label>
                        <span class="detail-value">${formatDateTime(complaint.CreatedAt)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Last Updated</label>
                        <span class="detail-value">${formatDateTime(complaint.UpdatedAt)}</span>
                    </div>
                    ${complaint.ResolvedAt ? `
                    <div class="detail-item">
                        <label>Resolved</label>
                        <span class="detail-value">${formatDateTime(complaint.ResolvedAt)}</span>
                    </div>
                    ` : ''}
                    <div class="detail-item full-width">
                        <label>Description</label>
                        <div class="detail-text">${escapeHtml(complaint.Description)}</div>
                    </div>
                    ${complaint.ResolutionNotes ? `
                    <div class="detail-item full-width">
                        <label>Resolution Notes</label>
                        <div class="detail-text">${escapeHtml(complaint.ResolutionNotes)}</div>
                    </div>
                    ` : ''}
                </div>
                
                ${complaint.Attachments && complaint.Attachments.length > 0 ? `
                <div class="details-section">
                    <h3>Attachments (${complaint.Attachments.length})</h3>
                    <div class="attachments-grid">
                        ${complaint.Attachments.map(attachment => `
                            <div class="attachment-item" onclick="viewAttachment('${attachment.url}', '${attachment.type}')">
                                ${attachment.type.startsWith('image/') ? 
                                    `<img src="${attachment.thumbnail}" alt="${attachment.name}">` :
                                    `<span class="material-symbols-rounded">description</span>`
                                }
                                <span class="attachment-name">${attachment.name}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                ${complaint.RecordLogs && complaint.RecordLogs.length > 0 ? `
                <div class="details-section">
                    <h3>Activity Log</h3>
                    <div class="timeline">
                        ${complaint.RecordLogs.map(log => `
                            <div class="timeline-item">
                                <div class="timeline-time">${formatDateTime(log.LogTimestamp)}</div>
                                <div class="timeline-content">${escapeHtml(log.LogMessage)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                ${complaint.Status === 'Resolved' ? `
                <button class="btn-primary" onclick="exportComplaintPDF(${complaint.ComplaintID})">
                    <span class="material-symbols-rounded">download</span>
                    Export PDF
                </button>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// ============================================
// DELETE COMPLAINT
// ============================================
async function deleteComplaint(complaintId) {
    const confirmed = await showConfirmationDialog(
        'Delete Complaint',
        'Are you sure you want to delete this complaint? This action cannot be undone.',
        'Delete',
        'Cancel'
    );
    
    if (!confirmed) return;
    
    try {
        showLoading('Deleting complaint...');
        
        const formData = new FormData();
        formData.append('complaint_id', complaintId);
        formData.append('csrf_token', csrfToken);
        
        const response = await fetch('backend/api/delete_complaint.php', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Complaint deleted successfully!', 'success');
            await loadComplaints();
        } else {
            throw new Error(result.message || 'Failed to delete complaint');
        }
    } catch (error) {
        showNotification('Failed to delete complaint: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ============================================
// FILTER FUNCTIONS
// ============================================
function applyFilters() {
    currentFilters = {
        status: '',
        type: elements.typeFilter ? elements.typeFilter.value : 'All Types',
        date: elements.dateFilter ? elements.dateFilter.value : '',
        month: elements.monthFilter ? elements.monthFilter.value : 'All Months',
        sort_by: elements.sortFilter ? elements.sortFilter.value : 'newest',
        search: elements.searchInput ? elements.searchInput.value.trim() : ''
    };
    
    // Save filters
    localStorage.setItem('complaintFilters', JSON.stringify(currentFilters));
    
    // Check if we need server-side filtering
    if (currentFilters.date || currentFilters.month !== 'All Months') {
        loadComplaints();
    } else {
        // Client-side filtering
        const filtered = allComplaints.filter(complaint => {
            // Type filter
            if (currentFilters.type !== 'All Types' && complaint.ComplaintType !== currentFilters.type) {
                return false;
            }
            
            // Search filter
            if (currentFilters.search) {
                const searchTerm = currentFilters.search.toLowerCase();
                const searchable = [
                    complaint.FullName,
                    complaint.RoomNumber,
                    complaint.Description,
                    complaint.ComplaintCode,
                    complaint.ComplaintType
                ].join(' ').toLowerCase();
                
                if (!searchable.includes(searchTerm)) {
                    return false;
                }
            }
            
            return true;
        });
        
        groupAndDisplayComplaints(filtered);
    }
}

function clearFilters() {
    if (elements.typeFilter) elements.typeFilter.value = 'All Types';
    if (elements.dateFilter) elements.dateFilter.value = '';
    if (elements.monthFilter) elements.monthFilter.value = 'All Months';
    if (elements.sortFilter) elements.sortFilter.value = 'newest';
    if (elements.searchInput) elements.searchInput.value = '';
    
    currentFilters = {
        status: '',
        type: 'All Types',
        date: '',
        month: 'All Months',
        sort_by: 'newest',
        search: ''
    };
    
    localStorage.removeItem('complaintFilters');
    loadComplaints();
}

function restoreFilters() {
    try {
        const saved = localStorage.getItem('complaintFilters');
        if (saved) {
            const filters = JSON.parse(saved);
            
            if (elements.typeFilter && filters.type) elements.typeFilter.value = filters.type;
            if (elements.dateFilter && filters.date) elements.dateFilter.value = filters.date;
            if (elements.monthFilter && filters.month) elements.monthFilter.value = filters.month;
            if (elements.sortFilter && filters.sort_by) elements.sortFilter.value = filters.sort_by;
            if (elements.searchInput && filters.search) elements.searchInput.value = filters.search;
            
            currentFilters = { ...currentFilters, ...filters };
        }
    } catch (e) {
        console.error('Error restoring filters:', e);
        localStorage.removeItem('complaintFilters');
    }
}

// ============================================
// POPULATE FILTERS
// ============================================
function populateMonthFilter() {
    const filter = elements.monthFilter;
    if (!filter) return;
    
    // Clear existing options except first
    while (filter.options.length > 1) {
        filter.remove(1);
    }
    
    // Generate last 12 months
    const months = [];
    const today = new Date();
    
    for (let i = 0; i < 12; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const monthValue = date.toISOString().substring(0, 7); // YYYY-MM
        
        months.push({ name: monthName, value: monthValue });
    }
    
    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month.value;
        option.textContent = month.name;
        filter.appendChild(option);
    });
}

function populateTypeFilter() {
    const filter = elements.typeFilter;
    if (!filter) return;
    
    // Clear existing options except first
    while (filter.options.length > 1) {
        filter.remove(1);
    }
    
    // Add complaint types from window.complaintTypes or default ones
    const types = window.complaintTypes || [
        'Electrical', 'Plumbing', 'Cleaning', 'Maintenance', 'Furniture', 'Other'
    ];
    
    types.forEach(type => {
        const typeName = type.type_name || type;
        const option = document.createElement('option');
        option.value = typeName;
        option.textContent = typeName;
        filter.appendChild(option);
    });
}

// ============================================
// DRAG AND DROP
// ============================================
function setupDragAndDrop() {
    const columns = document.querySelectorAll('.complaint-column');
    
    columns.forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
            column.classList.add('drag-over');
        });
        
        column.addEventListener('dragleave', () => {
            column.classList.remove('drag-over');
        });
        
        column.addEventListener('drop', async (e) => {
            e.preventDefault();
            column.classList.remove('drag-over');
            
            const complaintId = e.dataTransfer.getData('text/plain');
            const newStatus = column.id.replace('Column', '').toUpperCase();
            
            if (complaintId && newStatus) {
                await updateComplaintStatus(complaintId, newStatus);
            }
        });
    });
    
    // Add drag handlers to cards
    document.addEventListener('dragstart', (e) => {
        if (e.target.closest('.complaint-card')) {
            const card = e.target.closest('.complaint-card');
            e.dataTransfer.setData('text/plain', card.dataset.complaintId);
            card.classList.add('dragging');
        }
    });
    
    document.addEventListener('dragend', (e) => {
        document.querySelectorAll('.complaint-card.dragging').forEach(card => {
            card.classList.remove('dragging');
        });
    });
}

async function updateComplaintStatus(complaintId, newStatus) {
    try {
        const response = await fetch('backend/api/update_complaint_status.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            credentials: 'include',
            body: JSON.stringify({
                complaint_id: complaintId,
                status: newStatus
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`Status updated to ${newStatus}`, 'success');
            await loadComplaints();
        } else {
            throw new Error(result.message || 'Failed to update status');
        }
    } catch (error) {
        showNotification('Failed to update status: ' + error.message, 'error');
    }
}

// ============================================
// REAL-TIME UPDATES
// ============================================
function setupRealTimeUpdates() {
    // Poll for updates every 30 seconds
    setInterval(async () => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
            try {
                const response = await fetch(`backend/api/check_updates.php?last_update=${window.lastUpdate || 0}`, {
                    credentials: 'include',
                    headers: { 'X-CSRF-Token': csrfToken }
                });
                
                const result = await response.json();
                
                if (result.success && result.has_updates) {
                    // Show notification
                    if (result.updates_count > 0) {
                        showNotification(`You have ${result.updates_count} new update${result.updates_count !== 1 ? 's' : ''}`, 'info', 3000, {
                            onClick: () => loadComplaints()
                        });
                    }
                    
                    // Auto-refresh if major changes
                    if (result.refresh_needed) {
                        loadComplaints();
                    }
                    
                    window.lastUpdate = result.timestamp;
                }
            } catch (error) {
                // Silent fail for background checks
            }
        }
    }, 30000); // 30 seconds
}

// ============================================
// OFFLINE SUPPORT
// ============================================
function setupOfflineSupport() {
    // Check for offline submissions when coming online
    window.addEventListener('online', async () => {
        const offlineComplaints = JSON.parse(localStorage.getItem('offlineComplaints') || '[]');
        
        if (offlineComplaints.length > 0) {
            showNotification(`You have ${offlineComplaints.length} offline complaint${offlineComplaints.length !== 1 ? 's' : ''} to submit`, 'warning', 5000, {
                onClick: () => submitOfflineComplaints()
            });
        }
    });
}

async function submitOfflineComplaints() {
    const offlineComplaints = JSON.parse(localStorage.getItem('offlineComplaints') || '[]');
    
    if (offlineComplaints.length === 0) return;
    
    try {
        showLoading(`Submitting ${offlineComplaints.length} offline complaint${offlineComplaints.length !== 1 ? 's' : ''}...`);
        
        // Submit each complaint
        for (const complaint of offlineComplaints) {
            const formData = new FormData();
            formData.append('complaint_type', complaint.type);
            formData.append('description', complaint.description);
            formData.append('csrf_token', csrfToken);
            
            await fetch('backend/api/create_complaint.php', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
        }
        
        // Clear offline complaints
        localStorage.removeItem('offlineComplaints');
        
        showNotification('Offline complaints submitted successfully!', 'success');
        await loadComplaints();
        
    } catch (error) {
        showNotification('Failed to submit offline complaints: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function showValidationError(message) {
    if (elements.validateMessage) {
        elements.validateMessage.textContent = message;
        elements.validateMessage.classList.add('active');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            elements.validateMessage.classList.remove('active');
        }, 5000);
    } else {
        showNotification(message, 'error');
    }
}

function showLoadingState() {
    const loading = document.createElement('div');
    loading.id = 'complaints-loading';
    loading.innerHTML = `
        <div class="loading-overlay">
            <div class="loading-spinner">
                <div class="spinner"></div>
                <div>Loading complaints...</div>
            </div>
        </div>
    `;
    document.body.appendChild(loading);
}

function hideLoadingState() {
    const loading = document.getElementById('complaints-loading');
    if (loading) loading.remove();
}

function showErrorState(message) {
    const mainContainer = document.querySelector('.complaints-board');
    if (!mainContainer) return;
    
    mainContainer.innerHTML = `
        <div class="error-state">
            <div class="error-icon">⚠️</div>
            <h3>Unable to Load Complaints</h3>
            <p>${message}</p>
            <button class="btn-primary" onclick="loadComplaints()">
                <span class="material-symbols-rounded">refresh</span>
                Try Again
            </button>
            <button class="btn-secondary" onclick="clearFilters()">
                Clear Filters
            </button>
        </div>
    `;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

function formatDateTime(dateTimeString) {
    if (!dateTimeString) return 'N/A';
    try {
        return new Date(dateTimeString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateTimeString;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

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

function toggleLogs(button) {
    const container = button.nextElementSibling;
    const isHidden = container.style.display === 'none';
    
    container.style.display = isHidden ? 'block' : 'none';
    button.querySelector('.toggle-icon').textContent = isHidden ? '▲' : '▼';
}

async function showAllLogs(button, complaintId) {
    try {
        const response = await fetch(`backend/api/get_complaint_logs.php?id=${complaintId}`, {
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            const logsContainer = button.closest('.record-logs-container');
            button.remove();
            
            result.data.forEach(log => {
                const logElement = document.createElement('div');
                logElement.className = 'record-log';
                logElement.innerHTML = `
                    <time class="log-timestamp">${formatDateTime(log.LogTimestamp)}</time>
                    <span class="log-message">${escapeHtml(log.LogMessage)}</span>
                `;
                logsContainer.appendChild(logElement);
            });
        }
    } catch (error) {
        showNotification('Failed to load additional logs', 'error');
    }
}

function initTooltips() {
    // Initialize any tooltips
    const tooltips = document.querySelectorAll('[title]');
    tooltips.forEach(el => {
        el.addEventListener('mouseenter', showTooltip);
        el.addEventListener('mouseleave', hideTooltip);
    });
}

function showTooltip(e) {
    // Tooltip implementation
}

function hideTooltip(e) {
    // Tooltip implementation
}

function initCardInteractions() {
    // Add hover effects and click handlers
    document.querySelectorAll('.complaint-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-icon') && !e.target.closest('.toggle-logs-btn')) {
                const complaintId = card.dataset.complaintId;
                viewComplaintDetails(complaintId);
            }
        });
    });
}

function saveCurrentState() {
    // Save current scroll position
    localStorage.setItem('scrollPosition', window.scrollY);
    
    // Save form draft
    if (elements.complaintForm && elements.modal?.classList.contains('active')) {
        const draft = {};
        new FormData(elements.complaintForm).forEach((value, key) => {
            if (key !== 'attachments') draft[key] = value;
        });
        localStorage.setItem('complaintDraft', JSON.stringify(draft));
    }
}

function restoreScrollPosition() {
    const saved = localStorage.getItem('scrollPosition');
    if (saved) {
        setTimeout(() => window.scrollTo(0, parseInt(saved)), 100);
        localStorage.removeItem('scrollPosition');
    }
}

// Call on page load
window.addEventListener('load', restoreScrollPosition);

// ============================================
// EXPORT FUNCTIONS FOR GLOBAL USE
// ============================================
window.ComplaintManager = {
    loadComplaints,
    openModal,
    closeModal,
    applyFilters,
    clearFilters,
    viewComplaintDetails,
    deleteComplaint,
    getCSRFToken: () => csrfToken
};

// Import notification functions from previous files
// These should be available if session-check.js is loaded first