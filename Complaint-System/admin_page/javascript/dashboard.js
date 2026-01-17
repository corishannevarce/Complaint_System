// pages/dashboard.js - Dashboard page logic

function initDashboard() {
    const dashboardPage = document.getElementById('dashboard-page');
    
    // Clear existing content
    dashboardPage.innerHTML = '';
    
    // Add HTML content
    dashboardPage.innerHTML = `
        <h1 class="greeting">Good Morning, Admin!</h1>
        <p class="subtitle">Welcome to your complaint management dashboard</p>

        <h2 class="section-title">Summary</h2>
        <div class="stats-container">
            <div class="stat-card all">
                <div class="stat-title">All Complaints</div>
                <div class="stat-number">24</div>
            </div>
            <div class="stat-card pending">
                <div class="stat-title">Pending</div>
                <div class="stat-number">8</div>
            </div>
            <div class="stat-card progress">
                <div class="stat-title">In Progress</div>
                <div class="stat-number">6</div>
            </div>
            <div class="stat-card resolved">
                <div class="stat-title">Resolved</div>
                <div class="stat-number">10</div>
            </div>
            <div class="stat-card recent">
                <div class="stat-title">Recent (7 days)</div>
                <div class="stat-number">5</div>
            </div>
        </div>

        <h2 class="section-title">Recent Complaints</h2>
        <div class="kanban-container" id="dashboard-kanban">
            <!-- Kanban will be rendered here -->
        </div>
    `;
    
    // Initialize dashboard-specific logic
    updateGreeting();
    renderDashboardKanban();
}

function updateGreeting() {
    const hour = new Date().getHours();
    let greeting;

    if (hour >= 5 && hour < 12) {
        greeting = "Good Morning, Admin!";
    } else if (hour >= 12 && hour < 18) {
        greeting = "Good Afternoon, Admin!";
    } else {
        greeting = "Good Evening, Admin!";
    }

    const greetingElement = document.querySelector('#dashboard-page .greeting');
    if (greetingElement) {
        greetingElement.textContent = greeting;
    }
}

function renderDashboardKanban() {
    const kanbanContainer = document.getElementById('dashboard-kanban');
    
    // Sample data - replace with actual API call
    const complaints = {
        pending: [
            {
                id: 'C1',
                room: '101',
                resident: 'John Doe',
                type: 'Maintenance',
                description: 'Leaking faucet in bathroom needs immediate repair',
                date: 'Oct 15, 2025 09:30 AM'
            },
            {
                id: 'C4',
                room: '403',
                resident: 'Sarah Lee',
                type: 'Other',
                description: 'Air conditioning not working properly',
                date: 'Oct 16, 2025 01:00 PM'
            }
        ],
        inProgress: [
            {
                id: 'C2',
                room: '205',
                resident: 'Jane Smith',
                type: 'Noise',
                description: 'Loud noise from neighboring unit during late hours',
                date: 'Oct 14, 2025 02:15 PM',
                updated: 'Oct 16, 2025 11:20 AM',
                records: [
                    { timestamp: 'Oct 14, 2025 02:15 PM', message: 'Complaint received from tenant' },
                    { timestamp: 'Oct 14, 2025 03:45 PM', message: 'Investigation started' }
                ]
            }
        ],
        resolved: [
            {
                id: 'C3',
                room: '302',
                resident: 'Bob Wilson',
                type: 'Billing',
                description: 'Incorrect charges on monthly statement',
                date: 'Oct 13, 2025 10:00 AM',
                resolved: 'Oct 17, 2025 03:45 PM'
            }
        ]
    };

    kanbanContainer.innerHTML = `
        ${renderKanbanColumn('Pending', 'pending', complaints.pending)}
        ${renderKanbanColumn('In Progress', 'progress', complaints.inProgress)}
        ${renderKanbanColumn('Resolved', 'resolved', complaints.resolved)}
    `;
}

function renderKanbanColumn(title, status, items) {
    return `
        <div class="kanban-column">
            <div class="kanban-header ${status}">
                <h3>${title}</h3>
                <span class="column-count">${items.length}</span>
            </div>
            <div class="kanban-cards">
                ${items.map(item => renderComplaintCard(item, status)).join('')}
            </div>
        </div>
    `;
}

function renderComplaintCard(complaint, status) {
    let updatedHTML = '';
    let recordsHTML = '';
    
    if (status === 'progress' || status === 'resolved') {
        const updateDate = status === 'resolved' ? complaint.resolved : complaint.updated;
        const updateLabel = status === 'resolved' ? '✅ Resolved' : '📝 Updated';
        const updateColor = status === 'resolved' ? 'color: #66BB6A;' : '';
        
        updatedHTML = `<div class="last-update" style="${updateColor}">${updateLabel}: ${updateDate}</div>`;
        
        if (complaint.records) {
            recordsHTML = `
                <div class="records-title">Records</div>
                <div class="record-logs-container">
                    ${complaint.records.map(record => `
                        <div class="record-log">
                            <span class="log-timestamp">${record.timestamp}:</span>
                            <span class="log-message">${record.message}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }
    
    return `
        <div class="complaint-card">
            <div class="card-id">${complaint.id}</div>
            <div class="card-info">
                <span>🏠 Room ${complaint.room}</span>
                <span>👤 ${complaint.resident}</span>
            </div>
            <div class="type-badge">${complaint.type}</div>
            <div class="card-description">${complaint.description}</div>
            <div class="card-date">📅 ${complaint.date}</div>
            ${updatedHTML}
            ${recordsHTML}
        </div>
    `;
}