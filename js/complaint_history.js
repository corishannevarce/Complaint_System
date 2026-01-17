/**
 * Complaint History Page - JavaScript
 * Handles display and filtering of resolved complaints
 * PRODUCTION READY VERSION
 */

// ============================================
// GLOBAL VARIABLES
// ============================================
let resolvedComplaints = [];
let currentFilters = {
    search_name: '',
    type: 'All Types',
    date: '',
    month: 'All Months',
    sort_by: 'newest' // Added sorting
};
let csrfToken = '';
let exportInProgress = false;

// ============================================
// DOM ELEMENTS
// ============================================
const searchInput = document.getElementById('searchName');
const typeFilter = document.getElementById('typeFilter');
const dateFilter = document.getElementById('dateFilter');
const monthFilter = document.getElementById('monthFilter');
const sortFilter = document.getElementById('sortFilter');
const clearFiltersBtn = document.querySelector('.clear-filters-btn');
const resolvedCardsContainer = document.getElementById('resolvedCards');
const resolvedCount = document.querySelector('.column-count');
const exportAllBtn = document.querySelector('.export-all-btn');

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    loadResolvedComplaints();
    setupEventListeners();
    populateMonthFilter();
    setupSessionValidation();
});

// ============================================
// AUTHENTICATION CHECK
// ============================================
async function checkAuthentication() {
    try {
        const response = await fetch('backend/api/check_session.php', {
            credentials: 'include'
        });
        
        if (response.status === 401) {
            window.location.href = 'login.html';
            return false;
        }
        
        const result = await response.json();
        csrfToken = result.csrf_token || '';
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        return false;
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Search input with debounce
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            currentFilters.search_name = searchInput.value.trim();
            loadResolvedComplaints();
        }, 500));
    }
    
    // Filter changes
    if (typeFilter) typeFilter.addEventListener('change', applyFilters);
    if (dateFilter) dateFilter.addEventListener('change', applyFilters);
    if (monthFilter) monthFilter.addEventListener('change', applyFilters);
    if (sortFilter) sortFilter.addEventListener('change', applyFilters);
    
    // Clear filters
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }
    
    // Export all button
    if (exportAllBtn) {
        exportAllBtn.addEventListener('click', exportAllComplaints);
    }
    
    // Retry failed exports
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('retry-export')) {
            const complaintId = e.target.dataset.complaintId;
            exportToPDF(complaintId);
        }
    });
}

// ============================================
// LOAD RESOLVED COMPLAINTS
// ============================================
async function loadResolvedComplaints() {
    try {
        showLoadingState();
        
        // Build query parameters
        const params = new URLSearchParams({
            ...currentFilters,
            status: 'Resolved',
            csrf_token: csrfToken
        });
        
        const response = await fetch(`backend/api/get_complaints.php?${params}`, {
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        // Handle unauthorized
        if (response.status === 401) {
            showNotification('Session expired. Redirecting to login...', 'warning');
            setTimeout(() => window.location.href = 'login.html', 2000);
            return;
        }
        
        const result = await response.json();
        
        if (result.success) {
            resolvedComplaints = result.data.grouped.Resolved || [];
            applyClientSideFilters();
            updateCount(resolvedComplaints.length);
            
            // Store for offline access
            if (navigator.onLine) {
                localStorage.setItem('cachedComplaints', JSON.stringify(resolvedComplaints));
                localStorage.setItem('cachedComplaintsTimestamp', Date.now());
            }
        } else {
            if (result.code === 'csrf_invalid') {
                showNotification('Security token expired. Refreshing...', 'error');
                setTimeout(() => location.reload(), 1500);
            } else {
                // Try to load cached data
                const cached = loadCachedComplaints();
                if (cached.length > 0) {
                    resolvedComplaints = cached;
                    displayResolvedComplaints(cached);
                    showNotification('Showing cached data. Some features may be limited.', 'warning');
                } else {
                    throw new Error(result.message || 'Failed to load complaints');
                }
            }
        }
    } catch (error) {
        console.error('Load complaints error:', error);
        
        // Try to load cached data
        const cached = loadCachedComplaints();
        if (cached.length > 0) {
            resolvedComplaints = cached;
            displayResolvedComplaints(cached);
            showNotification('Showing cached data. Connection error: ' + error.message, 'warning');
        } else {
            showErrorState('Failed to load complaints. Please check your connection.');
        }
    } finally {
        hideLoadingState();
    }
}

// ============================================
// CLIENT-SIDE FILTERING
// ============================================
function applyClientSideFilters() {
    let filtered = [...resolvedComplaints];
    
    // Apply text search
    if (currentFilters.search_name) {
        const searchTerm = currentFilters.search_name.toLowerCase();
        filtered = filtered.filter(complaint => 
            complaint.FullName.toLowerCase().includes(searchTerm) ||
            complaint.RoomNumber.toLowerCase().includes(searchTerm) ||
            complaint.ComplaintCode.toLowerCase().includes(searchTerm) ||
            complaint.Description.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
        const dateA = new Date(a.ResolvedAt || a.CreatedAt);
        const dateB = new Date(b.ResolvedAt || b.CreatedAt);
        
        switch (currentFilters.sort_by) {
            case 'newest':
                return dateB - dateA;
            case 'oldest':
                return dateA - dateB;
            case 'room':
                return a.RoomNumber.localeCompare(b.RoomNumber);
            case 'name':
                return a.FullName.localeCompare(b.FullName);
            default:
                return dateB - dateA;
        }
    });
    
    displayResolvedComplaints(filtered);
}

// ============================================
// DISPLAY RESOLVED COMPLAINTS
// ============================================
function displayResolvedComplaints(complaints) {
    if (!resolvedCardsContainer) return;
    
    resolvedCardsContainer.innerHTML = '';
    
    if (!complaints || complaints.length === 0) {
        resolvedCardsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>No resolved complaints found</h3>
                <p>Try adjusting your filters or search criteria</p>
                ${currentFilters.search_name || currentFilters.type !== 'All Types' || currentFilters.date || currentFilters.month !== 'All Months' ? 
                    '<button class="btn-secondary" onclick="clearFilters()">Clear All Filters</button>' : ''}
            </div>
        `;
        return;
    }
    
    complaints.forEach(complaint => {
        const card = createComplaintCard(complaint);
        resolvedCardsContainer.appendChild(card);
    });
    
    // Add lazy loading for images if present
    setupLazyLoading();
}

// ============================================
// CREATE COMPLAINT CARD
// ============================================
function createComplaintCard(complaint) {
    const card = document.createElement('article');
    card.className = 'complaint-card';
    card.dataset.complaintId = complaint.ComplaintID;
    card.dataset.resolvedDate = complaint.ResolvedAt;
    
    const statusClass = complaint.Status.toLowerCase();
    const formattedDate = formatDate(complaint.CreatedAt);
    const resolvedDate = complaint.ResolvedAt ? formatDate(complaint.ResolvedAt) : 'N/A';
    
    let cardHTML = `
        <header class="card-header">
            <div class="card-id-badge">
                <span class="material-symbols-rounded">description</span>
                ${complaint.ComplaintCode}
            </div>
            <div class="card-actions">
                <button class="btn-icon export-pdf-btn" onclick="exportToPDF(${complaint.ComplaintID})" 
                        title="Export as PDF" ${exportInProgress ? 'disabled' : ''}>
                    <span class="material-symbols-rounded">download</span>
                </button>
                <button class="btn-icon details-btn" onclick="showComplaintDetails(${complaint.ComplaintID})" title="View Details">
                    <span class="material-symbols-rounded">visibility</span>
                </button>
            </div>
        </header>
        
        <div class="card-body">
            <div class="card-meta">
                <span class="meta-item">
                    <span class="material-symbols-rounded">location_home</span>
                    Room ${complaint.RoomNumber}
                </span>
                <span class="meta-item">
                    <span class="material-symbols-rounded">person</span>
                    ${complaint.FullName}
                </span>
            </div>
            
            <div class="type-badge type-${complaint.ComplaintType.replace(/\s+/g, '-').toLowerCase()}">
                ${complaint.ComplaintType}
            </div>
            
            <div class="card-description">
                <h4>Description</h4>
                <p>${escapeHtml(complaint.Description || 'No description provided')}</p>
            </div>
            
            <div class="card-timeline">
                <div class="timeline-item">
                    <span class="material-symbols-rounded">schedule</span>
                    Filed: ${formattedDate}
                </div>
                <div class="timeline-item resolved">
                    <span class="material-symbols-rounded">check_circle</span>
                    Resolved: ${resolvedDate}
                </div>
            </div>
    `;
    
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
                    Resolution History (${complaint.RecordLogs.length})
                    <span class="toggle-icon"></span>
                </button>
                <div class="record-logs-container" style="display: none;">
        `;
        
        // Show only last 3 logs by default
        const logsToShow = complaint.RecordLogs.slice(0, 3);
        logsToShow.forEach(log => {
            cardHTML += `
                <div class="record-log">
                    <time class="log-timestamp">${formatDateTime(log.LogTimestamp)}</time>
                    <span class="log-message">${escapeHtml(log.LogMessage)}</span>
                </div>
            `;
        });
        
        // Show "show more" if there are more logs
        if (complaint.RecordLogs.length > 3) {
            cardHTML += `
                <button class="show-more-logs" onclick="showAllLogs(this, ${complaint.ComplaintID})">
                    Show ${complaint.RecordLogs.length - 3} more entries
                </button>
            `;
        }
        
        cardHTML += `</div></div>`;
    }
    
    // Add attachments if available
    if (complaint.Attachments && complaint.Attachments.length > 0) {
        cardHTML += `
            <div class="attachments-section">
                <h4>Attachments</h4>
                <div class="attachments-grid">
        `;
        
        complaint.Attachments.slice(0, 3).forEach((attachment, index) => {
            cardHTML += `
                <div class="attachment-thumbnail" onclick="viewAttachment('${attachment.url}', '${attachment.type}')">
                    ${attachment.type.startsWith('image/') ? 
                        `<img src="${attachment.thumbnail}" alt="Attachment ${index + 1}" loading="lazy">` :
                        `<span class="material-symbols-rounded">description</span>`
                    }
                    <span class="attachment-name">${attachment.name}</span>
                </div>
            `;
        });
        
        if (complaint.Attachments.length > 3) {
            cardHTML += `
                <div class="attachment-more">
                    +${complaint.Attachments.length - 3} more
                </div>
            `;
        }
        
        cardHTML += `</div></div>`;
    }
    
    cardHTML += `</div></article>`;
    card.innerHTML = cardHTML;
    
    return card;
}

// ============================================
// EXPORT TO PDF
// ============================================
async function exportToPDF(complaintId) {
    if (exportInProgress) {
        showNotification('Another export is in progress. Please wait.', 'warning');
        return;
    }
    
    exportInProgress = true;
    
    try {
        showNotification('Preparing PDF export...', 'info');
        
        // Update button states
        document.querySelectorAll(`.export-pdf-btn`).forEach(btn => {
            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-rounded">pending</span>';
        });
        
        const params = new URLSearchParams({
            complaint_id: complaintId,
            csrf_token: csrfToken
        });
        
        const response = await fetch(`backend/api/export_pdf.php?${params}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }
        
        const blob = await response.blob();
        
        if (blob.size === 0) {
            throw new Error('Empty PDF generated');
        }
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Complaint-${complaintId}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification('PDF downloaded successfully!', 'success');
        
        // Log export activity
        logExportActivity(complaintId, 'success');
        
    } catch (error) {
        console.error('Export error:', error);
        
        // Show retry button on the specific card
        const card = document.querySelector(`[data-complaint-id="${complaintId}"]`);
        if (card) {
            const exportBtn = card.querySelector('.export-pdf-btn');
            if (exportBtn) {
                exportBtn.innerHTML = '<span class="material-symbols-rounded">error</span>';
                exportBtn.title = 'Export failed. Click to retry';
                exportBtn.onclick = () => exportToPDF(complaintId);
                exportBtn.disabled = false;
            }
        }
        
        showNotification('Export failed: ' + error.message, 'error');
        logExportActivity(complaintId, 'failed', error.message);
        
    } finally {
        exportInProgress = false;
        
        // Reset all export buttons
        document.querySelectorAll(`.export-pdf-btn:not([data-retry])`).forEach(btn => {
            btn.disabled = false;
            btn.innerHTML = '<span class="material-symbols-rounded">download</span>';
        });
    }
}

// ============================================
// EXPORT ALL COMPLAINTS
// ============================================
async function exportAllComplaints() {
    if (resolvedComplaints.length === 0) {
        showNotification('No complaints to export', 'warning');
        return;
    }
    
    const confirmed = await showConfirmationDialog(
        'Export All Complaints',
        `This will export ${resolvedComplaints.length} complaints as a ZIP file. This may take a while.`,
        'Export All',
        'Cancel'
    );
    
    if (!confirmed) return;
    
    try {
        showNotification('Preparing bulk export...', 'info');
        exportAllBtn.disabled = true;
        exportAllBtn.innerHTML = '<span class="spinner-small"></span> Processing...';
        
        const params = new URLSearchParams({
            csrf_token: csrfToken,
            filters: JSON.stringify(currentFilters)
        });
        
        const response = await fetch(`backend/api/export_bulk.php?${params}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Export failed: ${response.status}`);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Complaints-Export-${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification(`Exported ${resolvedComplaints.length} complaints successfully!`, 'success');
        
    } catch (error) {
        console.error('Bulk export error:', error);
        showNotification('Bulk export failed: ' + error.message, 'error');
    } finally {
        exportAllBtn.disabled = false;
        exportAllBtn.innerHTML = 'Export All as ZIP';
    }
}

// ============================================
// FILTER FUNCTIONS
// ============================================
function applyFilters() {
    currentFilters = {
        search_name: searchInput ? searchInput.value.trim() : '',
        type: typeFilter ? typeFilter.value : 'All Types',
        date: dateFilter ? dateFilter.value : '',
        month: monthFilter ? monthFilter.value : 'All Months',
        sort_by: sortFilter ? sortFilter.value : 'newest'
    };
    
    // Save filters to localStorage
    localStorage.setItem('complaintFilters', JSON.stringify(currentFilters));
    
    // Check if we need to reload from server or can filter client-side
    if (dateFilter.value || monthFilter.value !== 'All Months') {
        loadResolvedComplaints(); // Server-side filtering needed
    } else {
        applyClientSideFilters(); // Client-side filtering
    }
}

function clearFilters() {
    if (searchInput) searchInput.value = '';
    if (typeFilter) typeFilter.value = 'All Types';
    if (dateFilter) dateFilter.value = '';
    if (monthFilter) monthFilter.value = 'All Months';
    if (sortFilter) sortFilter.value = 'newest';
    
    currentFilters = {
        search_name: '',
        type: 'All Types',
        date: '',
        month: 'All Months',
        sort_by: 'newest'
    };
    
    localStorage.removeItem('complaintFilters');
    loadResolvedComplaints();
}

// ============================================
// POPULATE MONTH FILTER
// ============================================
function populateMonthFilter() {
    if (!monthFilter) return;
    
    // Clear existing options except the first one
    while (monthFilter.options.length > 1) {
        monthFilter.remove(1);
    }
    
    // Generate last 12 months
    const months = [];
    const today = new Date();
    
    for (let i = 0; i < 12; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        const monthValue = date.toISOString().substring(0, 7); // YYYY-MM format
        
        months.push({ name: monthName, value: monthValue });
    }
    
    // Add months to dropdown
    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month.value;
        option.textContent = month.name;
        monthFilter.appendChild(option);
    });
    
    // Load saved filter
    const savedFilters = localStorage.getItem('complaintFilters');
    if (savedFilters) {
        try {
            const filters = JSON.parse(savedFilters);
            if (filters.month && monthFilter.querySelector(`option[value="${filters.month}"]`)) {
                monthFilter.value = filters.month;
                currentFilters.month = filters.month;
            }
        } catch (e) {
            console.error('Error loading saved filters:', e);
        }
    }
}

// ============================================
// UPDATE COUNT
// ============================================
function updateCount(count) {
    if (!resolvedCount) return;
    
    resolvedCount.textContent = count;
    resolvedCount.setAttribute('title', `${count} resolved complaint${count !== 1 ? 's' : ''}`);
    
    // Update export button text
    if (exportAllBtn) {
        exportAllBtn.innerHTML = `Export All (${count}) as ZIP`;
        exportAllBtn.disabled = count === 0;
    }
}

// ============================================
// DETAILS MODAL
// ============================================
async function showComplaintDetails(complaintId) {
    try {
        const complaint = resolvedComplaints.find(c => c.ComplaintID == complaintId);
        if (!complaint) {
            throw new Error('Complaint not found');
        }
        
        // Create modal
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
                            <label>Resident Name</label>
                            <span class="detail-value">${complaint.FullName}</span>
                        </div>
                        <div class="detail-item">
                            <label>Room Number</label>
                            <span class="detail-value">${complaint.RoomNumber}</span>
                        </div>
                        <div class="detail-item">
                            <label>Complaint Type</label>
                            <span class="type-badge">${complaint.ComplaintType}</span>
                        </div>
                        <div class="detail-item">
                            <label>Filed Date</label>
                            <span class="detail-value">${formatDate(complaint.CreatedAt)}</span>
                        </div>
                        <div class="detail-item">
                            <label>Resolved Date</label>
                            <span class="detail-value">${complaint.ResolvedAt ? formatDate(complaint.ResolvedAt) : 'N/A'}</span>
                        </div>
                        <div class="detail-item full-width">
                            <label>Description</label>
                            <div class="detail-text">${escapeHtml(complaint.Description || 'No description')}</div>
                        </div>
                        ${complaint.ResolutionNotes ? `
                        <div class="detail-item full-width">
                            <label>Resolution Notes</label>
                            <div class="detail-text">${escapeHtml(complaint.ResolutionNotes)}</div>
                        </div>
                        ` : ''}
                    </div>
                    
                    ${complaint.RecordLogs && complaint.RecordLogs.length > 0 ? `
                    <div class="details-section">
                        <h3>Resolution History</h3>
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
                    <button class="btn-primary" onclick="exportToPDF(${complaintId})">
                        <span class="material-symbols-rounded">download</span>
                        Export as PDF
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        showNotification('Failed to load complaint details: ' + error.message, 'error');
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function loadCachedComplaints() {
    try {
        const cached = localStorage.getItem('cachedComplaints');
        const timestamp = localStorage.getItem('cachedComplaintsTimestamp');
        
        if (cached && timestamp) {
            const age = Date.now() - parseInt(timestamp);
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            
            if (age < maxAge) {
                return JSON.parse(cached);
            } else {
                localStorage.removeItem('cachedComplaints');
                localStorage.removeItem('cachedComplaintsTimestamp');
            }
        }
    } catch (e) {
        console.error('Error loading cached complaints:', e);
    }
    return [];
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

function formatDateTime(dateTimeString) {
    if (!dateTimeString) return 'N/A';
    
    try {
        const date = new Date(dateTimeString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateTimeString;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
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

function showLoadingState() {
    if (!resolvedCardsContainer) return;
    
    resolvedCardsContainer.innerHTML = `
        <div class="loading-state">
            <div class="spinner-large"></div>
            <p>Loading resolved complaints...</p>
        </div>
    `;
}

function hideLoadingState() {
    // Loading state is removed when content is displayed
}

function showErrorState(message) {
    if (!resolvedCardsContainer) return;
    
    resolvedCardsContainer.innerHTML = `
        <div class="error-state">
            <div class="error-icon">⚠️</div>
            <h3>Unable to Load Complaints</h3>
            <p>${message}</p>
            <button class="btn-primary" onclick="loadResolvedComplaints()">
                <span class="material-symbols-rounded">refresh</span>
                Try Again
            </button>
            ${loadCachedComplaints().length > 0 ? `
            <button class="btn-secondary" onclick="displayResolvedComplaints(loadCachedComplaints())">
                Show Cached Data
            </button>
            ` : ''}
        </div>
    `;
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

function viewAttachment(url, type) {
    if (type.startsWith('image/')) {
        // Open image in lightbox
        const lightbox = document.createElement('div');
        lightbox.className = 'lightbox-overlay';
        lightbox.innerHTML = `
            <div class="lightbox-content">
                <button class="lightbox-close">&times;</button>
                <img src="${url}" alt="Attachment">
            </div>
        `;
        
        document.body.appendChild(lightbox);
        
        lightbox.querySelector('.lightbox-close').addEventListener('click', () => {
            lightbox.remove();
        });
        
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                lightbox.remove();
            }
        });
    } else {
        // Open document in new tab
        window.open(url, '_blank');
    }
}

function setupLazyLoading() {
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            });
        });
        
        images.forEach(img => {
            if (img.dataset.src) {
                imageObserver.observe(img);
            }
        });
    } else {
        // Fallback for browsers without IntersectionObserver
        images.forEach(img => {
            if (img.dataset.src) {
                img.src = img.dataset.src;
            }
        });
    }
}

function logExportActivity(complaintId, status, error = null) {
    const log = {
        complaintId,
        status,
        error,
        timestamp: new Date().toISOString(),
        filters: currentFilters
    };
    
    // Store in localStorage for debugging
    const exports = JSON.parse(localStorage.getItem('exportLogs') || '[]');
    exports.push(log);
    
    // Keep only last 100 logs
    if (exports.length > 100) {
        exports.shift();
    }
    
    localStorage.setItem('exportLogs', JSON.stringify(exports));
}

function setupSessionValidation() {
    // Check session every 4 minutes
    setInterval(async () => {
        try {
            const response = await fetch('backend/api/check_session.php', {
                credentials: 'include'
            });
            
            if (response.status === 401) {
                showNotification('Your session will expire soon. Save your work.', 'warning');
            }
        } catch (error) {
            // Silent fail
        }
    }, 240000);
}

// Import notification and dialog functions from previous file
function showNotification(message, type = 'info') {
    // Implementation from previous file
}

async function showConfirmationDialog(title, message, confirmText = 'Confirm', cancelText = 'Cancel') {
    // Implementation from previous file
}