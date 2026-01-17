// pages/complaints.js - Manage Complaints page logic

function initComplaints() {
    const complaintsPage = document.getElementById('complaints-page');
    
    // Clear existing content
    complaintsPage.innerHTML = '';
    
    // Add HTML content
    complaintsPage.innerHTML = `
        <h1 class="greeting">Manage Complaints</h1>

        <div class="top-section">
            <!-- Handle Complaint -->
            <div class="handle-menu">
                <div class="menu-title">Handle Complaint</div>
                <form class="menu-form" id="complaint-form" onsubmit="handleComplaint(event)">
                    <div class="form-group">
                        <label for="complaint-id">Complaint ID</label>
                        <input type="text" id="complaint-id" placeholder="Enter ID (e.g., C1)" required>
                    </div>

                    <div class="form-group">
                        <label for="status">Status</label>
                        <select id="status" required>
                            <option value="">Select status</option>
                            <option value="in-progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                        </select>
                    </div>

                    <div class="form-group notes-group">
                        <label for="notes">Notes</label>
                        <textarea id="notes" placeholder="Add notes..." required></textarea>
                    </div>

                    <button type="submit" class="submit-btn">Submit</button>
                </form>
            </div>

            <!-- Filter Container -->
            <div class="filter-container">
                <div class="filter-title">Filter By</div>
                <div class="filter-grid">
                    <div class="filter-group">
                        <label for="filter-type">Complaint Type</label>
                        <select id="filter-type" onchange="applyFilters()">
                            <option value="">All Types</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="noise">Noise</option>
                            <option value="billing">Billing</option>
                            <option value="neighbor">Neighbor</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="filter-date">Date</label>
                        <input type="date" id="filter-date" onchange="applyFilters()">
                    </div>
                    <div class="filter-group">
                        <label for="filter-room">Room Number</label>
                        <select id="filter-room" onchange="applyFilters()">
                            <option value="">All Rooms</option>
                            ${generateRoomOptions()}
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <h2 class="section-title">Complaints Overview</h2>
        <div class="kanban-container" id="complaints-kanban">
            <!-- Kanban will be rendered here -->
        </div>
    `;
    
    // Initialize complaints-specific logic
    renderComplaintsKanban();
}

function handleComplaint(event) {
    event.preventDefault();

    const complaintId = document.getElementById('complaint-id').value;
    const status = document.getElementById('status').value;
    const notes = document.getElementById('notes').value;

    console.log('Complaint Submitted:', {
        id: complaintId,
        status: status,
        notes: notes
    });

    alert(`Complaint ${complaintId} updated to "${status}" with notes: "${notes}"`);

    event.target.reset();
}

function applyFilters() {
    const filterType = document.getElementById('filter-type').value;
    const filterDate = document.getElementById('filter-date').value;
    const filterRoom = document.getElementById('filter-room').value;

    console.log('Filters applied:', { filterType, filterDate, filterRoom });
    
    // TODO: Implement filtering logic
    // renderComplaintsKanban(filterType, filterDate, filterRoom);
}

function generateRoomOptions() {
    const floors = 5;
    const roomsPerFloor = 10;
    let options = '';

    for (let floor = 1; floor <= floors; floor++) {
        options += `<optgroup label="${floor}${getOrdinalSuffix(floor)} Floor">`;
        for (let room = 1; room <= roomsPerFloor; room++) {
            const roomNumber = floor * 100 + room;
            options += `<option>${roomNumber}</option>`;
        }
        options += '</optgroup>';
    }

    return options;
}

function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
}

function renderComplaintsKanban() {
    const kanbanContainer = document.getElementById('complaints-kanban');
    
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

// Reuse kanban rendering functions from dashboard
// In a real project, these would be in a shared utilities file