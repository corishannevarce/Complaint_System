<?php
require_once '../config.php';
// requireLogin(); // Temporarily disabled for testing

// Manual session for testing - REMOVE THIS AFTER TESTING
if (!isset($_SESSION['user_id'])) {
    $_SESSION['user_id'] = 1; // Use any existing user ID from your database
    $_SESSION['user_role'] = 'user';
    $_SESSION['full_name'] = 'Test User';
    $_SESSION['user_name'] = 'Test User';
    $_SESSION['email'] = 'test@example.com';
    $_SESSION['room_number'] = '101';
    $_SESSION['phone_number'] = '1234567890';
}

// Get user information
$stmt = $conn->prepare("SELECT * FROM users WHERE id = :user_id");
$stmt->execute(['user_id' => $_SESSION['user_id']]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

// Update user array with session data - FIX UNDEFINED KEYS
$user['name'] = $user['full_name'] ?? $user['name'] ?? 'User';
$user['room'] = $user['room_number'] ?? $user['room'] ?? 'N/A';
$user['phone'] = $user['phone_number'] ?? $user['phone'] ?? 'N/A';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Complaint Management System - User</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
    <link rel="stylesheet" href="main_user_sidebar_design.css">
</head>
<body>
    <!-- Top Bar -->
    <header class="top-bar">
        <div class="logo-container">
            <img src="LOGO1.png" alt="LOGO" class="logo" />
            <span class="logo-text-complaint">Complaint</span>
            <span class="logo-text-desk">Desk</span>
        </div>

        <div class="account-name-bar">
            <span class="account-name"><?php echo htmlspecialchars($user['name']); ?></span>
            <span class="material-symbols-rounded account-icon">account_circle</span>
        </div>

        <div class="menu-toggle" id="menuToggle" onclick="toggleSidebar()">
            <span></span>
            <span></span>
            <span></span>
        </div>
    </header>

    <!-- Sidebar Navigation -->
    <aside class="sidebar" id="sidebar">
        <a href="?page=home" class="sidebar-link <?php echo (!isset($_GET['page']) || $_GET['page'] == 'home') ? 'active' : ''; ?>">
            <span class="sidebar-icon material-symbols-rounded">home</span>
            <span class="sidebar-text">Home</span>
        </a>
        <a href="?page=history" class="sidebar-link <?php echo (isset($_GET['page']) && $_GET['page'] == 'history') ? 'active' : ''; ?>">
            <span class="sidebar-icon material-symbols-rounded">history</span>
            <span class="sidebar-text">Complaint History</span>
        </a>
        <a href="?page=about" class="sidebar-link <?php echo (isset($_GET['page']) && $_GET['page'] == 'about') ? 'active' : ''; ?>">
            <span class="sidebar-icon material-symbols-rounded">info</span>
            <span class="sidebar-text">About Us</span>
        </a>
        <a href="?page=help" class="sidebar-link <?php echo (isset($_GET['page']) && $_GET['page'] == 'help') ? 'active' : ''; ?>">
            <span class="sidebar-icon material-symbols-rounded">help</span>
            <span class="sidebar-text">Help & FAQs</span>
        </a>
        <a href="?page=account" class="sidebar-link <?php echo (isset($_GET['page']) && $_GET['page'] == 'account') ? 'active' : ''; ?>">
            <span class="sidebar-icon material-symbols-rounded">settings</span>
            <span class="sidebar-text">Account Settings</span>
        </a>
        <a href="logout.php" class="sidebar-link">
            <span class="sidebar-icon material-symbols-rounded">logout</span>
            <span class="sidebar-text">Logout</span>
        </a>
    </aside>

    <!-- Main Content Area -->
    <div class="main-wrapper">
        <div id="content-container">
            <?php
            $page = isset($_GET['page']) ? $_GET['page'] : 'home';
            
            switch($page) {
                case 'home':
                    if (file_exists('pages/user_front.php')) {
                        include 'pages/user_front.php';
                    } else {
                        echo "<div style='padding: 20px;'>user_front.php not found!</div>";
                    }
                    break;
                case 'history':
                    if (file_exists('pages/complaint_history.php')) {
                        include 'pages/complaint_history.php';
                    } else {
                        echo "<div style='padding: 20px;'>Page not found</div>";
                    }
                    break;
                case 'about':
                    if (file_exists('pages/about_us.php')) {
                        include 'pages/about_us.php';
                    } else {
                        echo "<div style='padding: 20px;'>Page not found</div>";
                    }
                    break;
                case 'help':
                    if (file_exists('pages/helps_and_faqs.php')) {
                        include 'pages/helps_and_faqs.php';
                    } else {
                        echo "<div style='padding: 20px;'>Page not found</div>";
                    }
                    break;
                case 'account':
                    if (file_exists('pages/account_setings.php')) {
                        include 'pages/account_setings.php';
                    } else {
                        echo "<div style='padding: 20px;'>Page not found</div>";
                    }
                    break;
                default:
                    if (file_exists('pages/user_front.php')) {
                        include 'pages/user_front.php';
                    } else {
                        echo "<div style='padding: 20px;'>Page not found</div>";
                    }
            }
            ?>
        </div>
    </div>

    <script>
        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.toggle('open');
        }

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function(event) {
            const sidebar = document.getElementById('sidebar');
            const menuToggle = document.getElementById('menuToggle');
            
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
                    sidebar.classList.remove('open');
                }
            }
        });
    </script>
</body>
</html>