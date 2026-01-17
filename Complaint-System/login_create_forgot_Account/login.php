<?php require_once '../config.php'; ?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Complaint Desk - Login</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="login_style.css" />
  <script src="javascript.js" defer></script>
</head>
<body>
  <div class="container">
    <!-- LEFT PANEL (Your existing HTML) -->
    <div class="left-panel">
      <div class="logo-container">
        <img src="LOGO1.png" alt="LOGO" class="logo" />
        <span class="logo-text-complaint">Complaint</span>
        <span class="logo-text-desk">Desk</span>
      </div>
      <div class="left-content">
        <img src="BG.png" alt="Complaint Desk Illustration" class="background-image" />
        <p class="tagline">Your voice matters. <br />We're here to listen and <br />help resolve your concerns.</p>
      </div>
    </div>

    <!-- RIGHT PANEL -->
    <div class="right-panel">
      <div class="form-container">
        <div class="form-section active" id="loginForm">
          <div class="header-text">
            <h1>Welcome Back</h1>
            <p>Enter your credentials to access your account</p>
          </div>

          <form method="POST">
            <div class="form-group">
              <label for="login-email">Username or Email</label>
              <input type="text" id="login-email" name="email" placeholder="Enter your username or email" required />
            </div>

            <div class="form-group">
              <label for="login-password">Password</label>
              <input type="password" id="login-password" name="password" placeholder="Enter your password" required />
            </div>

            <div class="checkbox-group">
              <label><input type="checkbox" name="remember" /> Remember me</label>
              <a href="#" class="forgot-password" onclick="showForgotPasswordForm()">Forgot Password?</a>
            </div>

            <?php
            // LOGIN PROCESSING
            if ($_SERVER['REQUEST_METHOD'] == 'POST' && !isset($_POST['action'])) {
                $email = clean($_POST['email']);
                $password = $_POST['password'];
                
                // Use prepared statement to prevent SQL injection
                $stmt = $conn->prepare("SELECT * FROM users WHERE email = :email OR username = :email");
                $stmt->execute(['email' => $email]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($user && password_verify($password, $user['password_hash'])) {
                    $_SESSION['user_id'] = $user['id'];
                    $_SESSION['full_name'] = $user['full_name'];
                    $_SESSION['email'] = $user['email'];
                    $_SESSION['room_number'] = $user['room_number'];
                    $_SESSION['phone_number'] = $user['phone_number'];
                    
                    header("Location: ../user_page/index.php");
                    exit();
                } else {
                    echo "<div class='error-message'>Invalid credentials!</div>";
                }
            }
            ?>

            <button type="submit" class="submit-btn">Sign In</button>
          </form>

          <div class="toggle-form">
            Don't have an account? <a href="#" onclick="toggleForms()">Sign Up</a>
          </div>
        </div>

        <!-- SIGNUP FORM -->
        <div class="form-section" id="signupForm">
          <div class="header-text">
            <h1>Create Account</h1>
            <p>Fill in your details to get started</p>
          </div>

          <form method="POST">
            <input type="hidden" name="action" value="signup">
            
            <div class="form-group">
              <label for="signup-name">Full Name</label>
              <input type="text" id="signup-name" name="full_name" placeholder="Enter your full name" required />
            </div>

            <div class="form-group">
              <label for="signup-email">Email</label>
              <input type="email" id="signup-email" name="email" placeholder="Enter your email" required />
            </div>

            <div class="form-group">
              <label for="signup-password">Password</label>
              <input type="password" id="signup-password" name="password" placeholder="Create a password" required />
            </div>

            <div class="form-group">
              <label for="signup-phone">Phone Number</label>
              <input type="tel" id="signup-phone" name="phone" placeholder="Enter your phone number" required />
            </div>

            <div class="form-group">
              <label for="signup-room">Room Number</label>
              <input type="text" id="signup-room" name="room" placeholder="Enter your room number" required />
            </div>
            
            <?php
            // SIGNUP PROCESSING
            if (isset($_POST['action']) && $_POST['action'] == 'signup') {
                $full_name = clean($_POST['full_name']);
                $email = clean($_POST['email']);
                $password = $_POST['password'];
                $phone = clean($_POST['phone']);
                $room = clean($_POST['room']);
                
                // Check if room exists using prepared statement
                $stmt = $conn->prepare("SELECT id FROM users WHERE room_number = :room");
                $stmt->execute(['room' => $room]);
                
                if ($stmt->rowCount() > 0) {
                    echo "<div class='error-message'>Room already taken!</div>";
                } else {
                    // Check if email already exists
                    $stmt = $conn->prepare("SELECT id FROM users WHERE email = :email");
                    $stmt->execute(['email' => $email]);
                    
                    if ($stmt->rowCount() > 0) {
                        echo "<div class='error-message'>Email already registered!</div>";
                    } else {
                        $hash = password_hash($password, PASSWORD_DEFAULT);
                        $username = explode('@', $email)[0];
                        
                        // Insert with prepared statement
                        $stmt = $conn->prepare("INSERT INTO users (username, email, password_hash, full_name, phone_number, room_number, created_at, updated_at) 
                                VALUES (:username, :email, :hash, :full_name, :phone, :room, GETDATE(), GETDATE())");
                        
                        if ($stmt->execute([
                            'username' => $username,
                            'email' => $email,
                            'hash' => $hash,
                            'full_name' => $full_name,
                            'phone' => $phone,
                            'room' => $room
                        ])) {
                            echo "<div class='success-message'>Account created! Please login.</div>";
                        } else {
                            echo "<div class='error-message'>Error creating account. Please try again.</div>";
                        }
                    }
                }
            }
            ?>
            
            <button type="submit" class="submit-btn">Create Account</button>
          </form>

          <div class="toggle-form">
            Already have an account? <a href="#" onclick="toggleForms()">Sign In</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>