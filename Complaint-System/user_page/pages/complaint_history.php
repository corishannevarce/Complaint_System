<?php
// Get filter values
$filter_type = isset($_GET['type']) ? $_GET['type'] : '';
$filter_date = isset($_GET['date']) ? $_GET['date'] : '';
$filter_month = isset($_GET['month']) ? $_GET['month'] : 'all';

// Get resolved complaints
$sql = "SELECT * FROM complaints WHERE user_id = :user_id AND status = 'resolved'";
$params = ['user_id' => $user['id']];

if (!empty($filter_type)) {
    $sql .= " AND complaint_type = :type";
    $params['type'] = $filter_type;
}

if (!empty($filter_date)) {
    $sql .= " AND CAST(created_at AS DATE) = :filter_date";
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

// Order by newest first (resolved date or updated date)
$sql .= " ORDER BY COALESCE(resolved_date, updated_at) DESC, created_at DESC";

$stmt = $conn->prepare($sql);
$stmt->execute($params);
$complaints = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>
<link rel="stylesheet" href="styles/complaint_history.css">

<div class="main-content">
    <h1 class="greeting">Complaint History</h1>
    <p class="subtitle">See your complaint logs here.</p>
    
    <!-- Filter Container -->
    <div class="filter-container">
        <div class="filter-header">
            <div class="filter-title">Filter Complaints</div>
            <button class="clear-filters-btn" onclick="window.location.href='?page=history'">Clear All</button>
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

    <!-- Resolved Column -->
    <div class="kanban-column">
        <div class="kanban-header resolved">
            <h3>Resolved Complaint Records</h3>
            <span class="column-count"><?php echo count($complaints); ?></span>
        </div>

        <div class="kanban-cards">
            <?php foreach($complaints as $complaint): ?>
                <div class="complaint-card">
                    <div class="card-header">
                        <div class="card-id">C<?php echo $complaint['id']; ?></div>
                        <button class="export-pdf-btn" onclick="exportToPDF(<?php echo $complaint['id']; ?>)">
                            <span class="material-symbols-rounded">download</span>
                            Export PDF
                        </button>
                    </div>

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
        </div>
    </div>
</div>

<script>
function applyFilters() {
    const type = document.getElementById('filter-type').value;
    const date = document.getElementById('filter-date').value;
    const month = document.getElementById('monthFilter').value;
    
    let url = '?page=history';
    if (type) url += '&type=' + type;
    if (date) url += '&date=' + date;
    if (month !== 'all') url += '&month=' + month;
    
    window.location.href = url;
}

function exportToPDF(id) {
    window.open('../exportpdf.php?id=' + id, '_blank');
}
</script>