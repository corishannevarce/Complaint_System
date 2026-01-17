<?php
// Handle profile update
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['update_profile'])) {
    $full_name = clean($_POST['full_name']);
    $phone = clean($_POST['phone']);
    $email = clean($_POST['email']);
    
    $stmt = $conn->prepare("UPDATE users SET full_name = :name, phone_number = :phone, email = :email WHERE id = :id");
    if ($stmt->execute(['name' => $full_name, 'phone' => $phone, 'email' => $email, 'id' => $user['id']])) {
        $success = "Profile updated successfully!";
        // Refresh user data
        $stmt = $conn->prepare("SELECT * FROM users WHERE id = :user_id");
        $stmt->execute(['user_id' => $_SESSION['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        $user['name'] = $user['full_name'];
        $user['room'] = $user['room_number'];
        $user['phone'] = $user['phone_number'];
    }
}

// Handle password change
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['change_password'])) {
    $current_password = $_POST['current_password'];
    $new_password = $_POST['new_password'];
    $confirm_password = $_POST['confirm_password'];
    
    if ($new_password !== $confirm_password) {
        $error = "New passwords do not match!";
    } else {
        $stmt = $conn->prepare("SELECT password_hash FROM users WHERE id = :id");
        $stmt->execute(['id' => $user['id']]);
        $db_user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (password_verify($current_password, $db_user['password_hash'])) {
            $new_hash = password_hash($new_password, PASSWORD_DEFAULT);
            $stmt = $conn->prepare("UPDATE users SET password_hash = :hash WHERE id = :id");
            if ($stmt->execute(['hash' => $new_hash, 'id' => $user['id']])) {
                $success = "Password changed successfully!";
            }
        } else {
            $error = "Current password is incorrect!";
        }
    }
}
?>
<link rel="stylesheet" href="styles/account_settings.css">

<div class="main-content">
    <h1 class="greeting">Account Settings</h1>
    <p class="subtitle">Welcome to your profile!</p>
    
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
    
    <div class="container">
        <!-- Profile Card -->
        <div class="profile-card">
            <div class="profile-header">
                <div class="avatar">
                    <span class="material-symbols-rounded">account_circle</span>
                </div>
                <h2 class="profile-name"><?php echo htmlspecialchars($user['name']); ?></h2>
                <div class="profile-role">
                    <span class="material-symbols-rounded">badge</span>
                    User
                </div>
            </div>

            <div class="info-grid">
                <div class="info-item">
                    <div class="info-icon">
                        <span class="material-symbols-rounded">email</span>
                    </div>
                    <div class="info-content">
                        <div class="info-label">Email</div>
                        <div class="info-value"><?php echo htmlspecialchars($user['email']); ?></div>
                    </div>
                </div>

                <div class="info-item">
                    <div class="info-icon">
                        <span class="material-symbols-rounded">call</span>
                    </div>
                    <div class="info-content">
                        <div class="info-label">Phone</div>
                        <div class="info-value"><?php echo htmlspecialchars($user['phone']); ?></div>
                    </div>
                </div>

                <div class="info-item">
                    <div class="info-icon">
                        <span class="material-symbols-rounded">home</span>
                    </div>
                    <div class="info-content">
                        <div class="info-label">Room Number</div>
                        <div class="info-value"><?php echo htmlspecialchars($user['room']); ?></div>
                    </div>
                </div>

                <div class="info-item">
                    <div class="info-icon">
                        <span class="material-symbols-rounded">person</span>
                    </div>
                    <div class="info-content">
                        <div class="info-label">Username</div>
                        <div class="info-value"><?php echo htmlspecialchars($user['username']); ?></div>
                    </div>
                </div>
            </div>

            <button class="edit-profile-btn" onclick="openEditModal()">
                <span class="material-symbols-rounded">edit</span>
                Edit Profile
            </button>
        </div>

        <!-- Actions Card -->
        <div class="actions-card">
            <!-- Change Password -->
            <div class="action-item">
                <div class="action-header">
                    <div class="action-icon-circle security">
                        <span class="material-symbols-rounded">lock</span>
                    </div>
                    <div class="action-content">
                        <h3 class="action-title">Change Password</h3>
                        <p class="action-subtitle">Update your password to keep your account secure</p>
                    </div>
                </div>
                <button class="action-btn security" onclick="openPasswordModal()">
                    <span class="material-symbols-rounded">vpn_key</span>
                    Change Password
                </button>
            </div>

            <!-- Account Info -->
            <div class="action-item info">
                <div class="action-header">
                    <div class="action-icon-circle info">
                        <span class="material-symbols-rounded">info</span>
                    </div>
                    <div class="action-content">
                        <h3 class="action-title">Account Information</h3>
                        <p class="action-subtitle">View additional account details</p>
                    </div>
                </div>
                <button class="action-btn info" onclick="openExtrasModal()">
                    <span class="material-symbols-rounded">visibility</span>
                    View Details
                </button>
            </div>

            <!-- Logout -->
            <div class="action-item logout">
                <div class="action-header">
                    <div class="action-icon-circle logout">
                        <span class="material-symbols-rounded">logout</span>
                    </div>
                    <div class="action-content">
                        <h3 class="action-title">Sign Out</h3>
                        <p class="action-subtitle">Logout from your account</p>
                    </div>
                </div>
                <button class="action-btn logout-btn" onclick="window.location.href='../logout.php'">
                    <span class="material-symbols-rounded">power_settings_new</span>
                    Logout
                </button>
            </div>
        </div>
    </div>
</div>

<!-- Edit Profile Modal -->
<div class="modal-overlay" id="editModal">
    <div class="modal">
        <div class="modal-header">
            <h2 class="modal-title">
                <span class="material-symbols-rounded">edit</span>
                Edit Your Profile
            </h2>
        </div>
        <form method="POST">
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">
                        <span class="material-symbols-rounded">person</span>
                        Full Name
                    </label>
                    <input type="text" class="form-input" name="full_name" value="<?php echo htmlspecialchars($user['name']); ?>" required>
                </div>
                <div class="form-group">
                    <label class="form-label">
                        <span class="material-symbols-rounded">email</span>
                        Email
                    </label>
                    <input type="email" class="form-input" name="email" value="<?php echo htmlspecialchars($user['email']); ?>" required>
                </div>
                <div class="form-group">
                    <label class="form-label">
                        <span class="material-symbols-rounded">call</span>
                        Phone
                    </label>
                    <input type="tel" class="form-input" name="phone" value="<?php echo htmlspecialchars($user['phone']); ?>" required>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-cancel" onclick="closeEditModal()">
                    <span class="material-symbols-rounded">close</span>
                    Cancel
                </button>
                <button type="submit" name="update_profile" class="btn-save">
                    <span class="material-symbols-rounded">save</span>
                    Save
                </button>
            </div>
        </form>
    </div>
</div>

<!-- Change Password Modal -->
<div class="modal-overlay" id="passwordModal">
    <div class="modal">
        <div class="modal-header">
            <h2 class="modal-title">
                <span class="material-symbols-rounded">lock</span>
                Change Password
            </h2>
        </div>
        <form method="POST">
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">
                        <span class="material-symbols-rounded">lock</span>
                        Current Password
                    </label>
                    <input type="password" class="form-input" name="current_password" required>
                </div>
                <div class="form-group">
                    <label class="form-label">
                        <span class="material-symbols-rounded">vpn_key</span>
                        New Password
                    </label>
                    <input type="password" class="form-input" name="new_password" required>
                </div>
                <div class="form-group">
                    <label class="form-label">
                        <span class="material-symbols-rounded">check_circle</span>
                        Confirm Password
                    </label>
                    <input type="password" class="form-input" name="confirm_password" required>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-cancel" onclick="closePasswordModal()">
                    <span class="material-symbols-rounded">close</span>
                    Cancel
                </button>
                <button type="submit" name="change_password" class="btn-save">
                    <span class="material-symbols-rounded">save</span>
                    Update
                </button>
            </div>
        </form>
    </div>
</div>

<!-- Account Extras Modal -->
<div class="modal-overlay" id="extrasModal">
    <div class="modal">
        <div class="modal-header">
            <h2 class="modal-title">
                <span class="material-symbols-rounded">info</span>
                Account Information
            </h2>
            <p class="modal-subtitle">Additional details about your account</p>
        </div>
        <div class="modal-body">
            <div class="extras-content">
                <div class="extras-section-title">
                    <span class="material-symbols-rounded">calendar_today</span>
                    Account Dates
                </div>
                <div class="extras-grid">
                    <div class="extras-card">
                        <span class="extras-icon material-symbols-rounded">event</span>
                        <div>
                            <div class="extras-item-title">Member Since</div>
                            <div class="extras-item-value"><?php echo date('F d, Y', strtotime($user['created_at'])); ?></div>
                        </div>
                    </div>
                    <div class="extras-card">
                        <span class="extras-icon material-symbols-rounded">update</span>
                        <div>
                            <div class="extras-item-title">Last Updated</div>
                            <div class="extras-item-value"><?php echo date('F d, Y', strtotime($user['updated_at'])); ?></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn-cancel" onclick="closeExtrasModal()">
                <span class="material-symbols-rounded">close</span>
                Close
            </button>
        </div>
    </div>
</div>

<script>
function openEditModal() {
    document.getElementById('editModal').classList.add('active');
}
function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
}
function openPasswordModal() {
    document.getElementById('passwordModal').classList.add('active');
}
function closePasswordModal() {
    document.getElementById('passwordModal').classList.remove('active');
}
function openExtrasModal() {
    document.getElementById('extrasModal').classList.add('active');
}
function closeExtrasModal() {
    document.getElementById('extrasModal').classList.remove('active');
}

// Close modals when clicking outside
document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
        }
    });
});
</script>