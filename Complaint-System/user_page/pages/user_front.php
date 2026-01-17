<?php
// User data is already loaded in the main index file
// $conn is available from the parent index.php file
// $user is available from the parent index.php file

// Handle new complaint submission
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['submit_complaint'])) {
    $type = clean($_POST['complaint_type']);
    $description = clean($_POST['description']);
    
    if (empty($type) || empty($description)) {
        $error = "Please fill all fields";
    } else {
        $title = substr($description, 0, 50) . (strlen($description) > 50 ? '...' : '');
        
        $stmt = $conn->prepare("INSERT INTO complaints (user_id, complaint_type, title, description, status, created_at) 
                VALUES (:user_id, :type, :title, :description, 'pending', NOW())");
        
        if ($stmt->execute([
            'user_id' => $_SESSION['user_id'],
            'type' => $type,
            'title' => $title,
            'description' => $description
        ])) {
            $success = "Complaint submitted successfully!";
        } else {
            $error = "Error submitting complaint";
        }
    }
}

// Check for session messages from delete operation
if (isset($_SESSION['success_message'])) {
    $success = $_SESSION['success_message'];
    unset($_SESSION['success_message']);
}

if (isset($_SESSION['error_message'])) {
    $error = $_SESSION['error_message'];
    unset($_SESSION['error_message']);
}

// Get filter values
$filter_type = isset($_GET['type']) ? $_GET['type'] : '';
$filter_date = isset($_GET['date']) ? $_GET['date'] : '';
$filter_month = isset($_GET['month']) ? $_GET['month'] : 'all';

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo "<div style='padding: 20px; text-align: center;'>";
    echo "<h2>Please log in first</h2>";
    echo "<p><a href='../login_create_forgot_account/login.php'>Go to Login</a></p>";
    echo "<p>Or use: <a href='quick_login.php'>Quick Login (Testing)</a></p>";
    echo "</div>";
    return;
}

// Build query
$sql = "SELECT * FROM complaints WHERE user_id = :user_id";
$params = ['user_id' => $_SESSION['user_id']];

if (!empty($filter_type)) {
    $sql .= " AND complaint_type = :type";
    $params['type'] = $filter_type;
}

if (!empty($filter_date)) {
    $sql .= " AND DATE(created_at) = :filter_date";
    $params['filter_date'] = $filter_date;
}

if ($filter_month != 'all') {
    $month_parts = explode('_', $filter_month);
    $month_num = date('m', strtotime($month_parts[0]));
    $year = $month_parts[1];
    $sql .= " AND MONTH(created_at) = :month AND YEAR(created_at) = :year";
    $params['month'] = $month_num;
    $params['year'] = $year;
}

$sql .= " ORDER BY 
    CASE status 
        WHEN 'pending' THEN 1
        WHEN 'in_progress' THEN 2
        WHEN 'resolved' THEN 3
    END,
    created_at DESC";

$stmt = $conn->prepare($sql);
$stmt->execute($params);
$complaints = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Separate by status
$pending = array_filter($complaints, function($c) { return $c['status'] == 'pending'; });
$in_progress = array_filter($complaints, function($c) { return $c['status'] == 'in_progress'; });
$resolved = array_filter($complaints, function($c) { return $c['status'] == 'resolved'; });

// Sort resolved by newest first
usort($resolved, function($a, $b) {
    return strtotime($b['updated_at']) - strtotime($a['updated_at']);
});
?>

<link rel="stylesheet" href="styles/user_front.css">

<div class="main-content">
    <h1 class="greeting">Good Morning, <?php echo htmlspecialchars($user['name']); ?>!</h1>
    <p class="subtitle">Hi there! Welcome to Complaint Desk where service meets responsibility.</p>

    <!-- Messages -->
    <?php if(isset($success)): ?>
        <div class="success-message" style="background: #d4edda; color: #155724; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #c3e6cb;">
            <?php echo $success; ?>
        </div>
    <?php endif; ?>
    
    <?php if(isset($error)): ?>
        <div class="error-message" style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #f5c6cb;">
            <?php echo $error; ?>
        </div>
    <?php endif; ?>

    <!-- Filter and Submit Section -->
    <div class="menu-wrapper">
        <!-- Filter Container -->
        <div class="filter-container">
            <div class="filter-header">
                <div class="filter-title">Filter Complaints</div>
                <button class="clear-filters-btn" onclick="window.location.href='?page=home'">Clear All</button>
            </div>

            <div class="filter-grid">
                <div class="filter-group">
                    <label for="filter-type">Complaint Type</label>
                    <select id="filter-type" onchange="applyFilters()">
                        <option value="">All Types</option>
                        <option value="maintenance" <?php echo $filter_type=='maintenance'?'selected':''; ?>>Maintenance</option>
                        <option value="facility" <?php echo $filter_type=='facility'?'selected':''; ?>>Facility</option>
                        <option value="noise" <?php echo $filter_type=='noise'?'selected':''; ?>>Noise</option>
                        <option value="billing" <?php echo $filter_type=='billing'?'selected':''; ?>>Billing</option>
                    </select>
                </div>

                <div class="filter-group">
                    <label for="filter-date">Specific Date</label>
                    <input type="date" id="filter-date" value="<?php echo $filter_date; ?>" onchange="applyFilters()">
                </div>

                <div class="filter-group">
                    <label for="monthFilter">Monthly</label>
                    <select id="monthFilter" onchange="applyFilters()">
                        <option value="all">All Months</option>
                        <?php
                        $months = ['January', 'February', 'March', 'April', 'May', 'June', 
                                  'July', 'August', 'September', 'October', 'November', 'December'];
                        foreach($months as $month_name):
                            $value = strtolower($month_name) . '_' . date('Y');
                            $selected = $filter_month == $value ? 'selected' : '';
                        ?>
                            <option value="<?php echo $value; ?>" <?php echo $selected; ?>>
                                <?php echo $month_name; ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>
        </div>

        <!-- Submit Complaint Button -->
        <div class="submit-complaints">
            <div class="submit-header">
                <div class="filter-title">Add New Complaint</div>
            </div>
            <button class="add-complaint-btn" onclick="openSubmitModal()">
                <span class="material-symbols-rounded">add</span>
            </button>
        </div>
    </div>

    <!-- Kanban Columns -->
    <h2 class="section-title">My Complaints</h2>
    <div class="kanban-container">
        <!-- Pending Column -->
        <div class="kanban-column">
            <div class="kanban-header pending">
                <h3>Pending</h3>
                <span class="column-count"><?php echo count($pending); ?></span>
            </div>
            <div class="kanban-cards">
                <?php if(empty($pending)): ?>
                    <p style="text-align: center; color: #999; padding: 20px;">No pending complaints</p>
                <?php else: ?>
                    <?php foreach($pending as $complaint): ?>
                        <div class="complaint-card">
                            <div class="card-id">C<?php echo $complaint['id']; ?></div>
                            <div class="card-info">
                                <span>🏠 Room <?php echo htmlspecialchars($user['room']); ?></span>
                                <span>👤 <?php echo htmlspecialchars($user['name']); ?></span>
                            </div>
                            <div class="type-badge"><?php echo ucfirst($complaint['complaint_type']); ?></div>
                            <div class="card-description"><?php echo htmlspecialchars($complaint['description']); ?></div>
                            <div class="card-date">📅 <?php echo date('M d, Y', strtotime($complaint['created_at'])); ?></div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>

        <!-- In Progress Column -->
        <div class="kanban-column">
            <div class="kanban-header progress">
                <h3>In Progress</h3>
                <span class="column-count"><?php echo count($in_progress); ?></span>
            </div>
            <div class="kanban-cards">
                <?php if(empty($in_progress)): ?>
                    <p style="text-align: center; color: #999; padding: 20px;">No complaints in progress</p>
                <?php else: ?>
                    <?php foreach($in_progress as $complaint): ?>
                        <div class="complaint-card">
                            <div class="card-id">C<?php echo $complaint['id']; ?></div>
                            <div class="card-info">
                                <span>🏠 Room <?php echo htmlspecialchars($user['room']); ?></span>
                                <span>👤 <?php echo htmlspecialchars($user['name']); ?></span>
                            </div>
                            <div class="type-badge"><?php echo ucfirst($complaint['complaint_type']); ?></div>
                            <div class="card-description"><?php echo htmlspecialchars($complaint['description']); ?></div>
                            <div class="card-date">📅 <?php echo date('M d, Y', strtotime($complaint['created_at'])); ?></div>
                            <div class="last-update">🔄 Updated: <?php echo date('M d, Y', strtotime($complaint['updated_at'])); ?></div>
                            
                            <?php if(!empty($complaint['admin_notes'])): ?>
                                <div class="records-title">Records</div>
                                <div class="record-logs-container">
                                    <?php echo nl2br(htmlspecialchars($complaint['admin_notes'])); ?>
                                </div>
                            <?php endif; ?>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>

        <!-- Resolved Column -->
        <div class="kanban-column">
            <div class="kanban-header resolved">
                <h3>Resolved</h3>
                <span class="column-count"><?php echo count($resolved); ?></span>
            </div>
            <div class="kanban-cards">
                <?php if(empty($resolved)): ?>
                    <p style="text-align: center; color: #999; padding: 20px;">No resolved complaints</p>
                <?php else: ?>
                    <?php foreach($resolved as $complaint): ?>
                        <div class="complaint-card">
                            <button class="delete-btn" onclick="deleteComplaint(<?php echo $complaint['id']; ?>)">
                                <span class="material-symbols-rounded">delete</span>
                                Delete
                            </button>
                            <div class="card-id">C<?php echo $complaint['id']; ?></div>
                            <div class="card-info">
                                <span>🏠 Room <?php echo htmlspecialchars($user['room']); ?></span>
                                <span>👤 <?php echo htmlspecialchars($user['name']); ?></span>
                            </div>
                            <div class="type-badge"><?php echo ucfirst($complaint['complaint_type']); ?></div>
                            <div class="card-description"><?php echo htmlspecialchars($complaint['description']); ?></div>
                            <div class="card-date">📅 <?php echo date('M d, Y', strtotime($complaint['created_at'])); ?></div>
                            <div class="last-update" style="color: #66BB6A;">✅ Resolved: <?php echo date('M d, Y', strtotime($complaint['resolved_date'] ?? $complaint['updated_at'])); ?></div>
                            
                            <?php if(!empty($complaint['admin_notes'])): ?>
                                <div class="records-title">Records</div>
                                <div class="record-logs-container">
                                    <?php echo nl2br(htmlspecialchars($complaint['admin_notes'])); ?>
                                </div>
                            <?php endif; ?>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<!-- Submit Complaint Modal -->
<div class="modal-overlay" id="submitModal">
    <div class="modal-content">
        <h2 class="modal-header">Submit New Complaint</h2>
        <p class="modal-subtitle">Please provide details about your complaint</p>
        
        <form method="POST" action="?page=home">
            <div class="form-group">
                <label>Complaint Type:</label>
                <select class="form-input" name="complaint_type" required>
                    <option value="">Select Type</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="facility">Facility</option>
                    <option value="noise">Noise</option>
                    <option value="billing">Billing</option>
                </select>
            </div>

            <div class="form-group">
                <label>Description:</label>
                <textarea class="form-textarea" name="description" placeholder="Please describe your complaint in detail..." required></textarea>
            </div>

            <div class="modal-buttons">
                <button type="button" class="btn btn-secondary" onclick="closeSubmitModal()">Cancel</button>
                <button type="submit" name="submit_complaint" class="btn btn-primary">Submit Complaint</button>
            </div>
        </form>
    </div>
</div>

<script>
function openSubmitModal() {
    document.getElementById('submitModal').classList.add('active');
}

function closeSubmitModal() {
    document.getElementById('submitModal').classList.remove('active');
}

function applyFilters() {
    const type = document.getElementById('filter-type').value;
    const date = document.getElementById('filter-date').value;
    const month = document.getElementById('monthFilter').value;
    
    let url = '?page=home';
    if (type) url += '&type=' + type;
    if (date) url += '&date=' + date;
    if (month !== 'all') url += '&month=' + month;
    
    window.location.href = url;
}

function deleteComplaint(id) {
    if (confirm('Are you sure you want to delete this complaint?')) {
        window.location.href = 'delete_complaint.php?id=' + id;
    }
}

// Close modal when clicking outside
document.getElementById('submitModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closeSubmitModal();
    }
});
</script>