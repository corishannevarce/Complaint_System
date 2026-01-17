<?php
session_start();
require_once '../config.php';

// Check if already logged in
if (isset($_SESSION['user_id'])) {
    header('Location: index.php');
    exit();
}

// Get first user from database
try {
    $stmt = $conn->prepare("SELECT TOP 1 * FROM users"); // SQL Server syntax
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    // Try MySQL syntax if SQL Server fails
    try {
        $stmt = $conn->prepare("SELECT * FROM users LIMIT 1");
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (PDOException $e2) {
        die("Database error: " . $e2->getMessage());
    }
}

if ($user) {
    // Set session variables
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_role'] = $user['role'] ?? 'user';
    $_SESSION['user_name'] = $user['name'] ?? $user['full_name'];
    $_SESSION['full_name'] = $user['full_name'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['room_number'] = $user['room_number'] ?? $user['room'];
    $_SESSION['phone_number'] = $user['phone_number'] ?? $user['phone'];
    
    echo "<!DOCTYPE html>
    <html>
    <head>
        <title>Quick Login</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .box { 
                background: white; 
                padding: 40px; 
                border-radius: 10px; 
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                text-align: center;
            }
            h2 { color: #333; margin-bottom: 10px; }
            p { color: #666; margin-bottom: 20px; }
            a { 
                display: inline-block;
                background: #667eea; 
                color: white; 
                padding: 10px 20px; 
                text-decoration: none; 
                border-radius: 5px;
                margin-top: 20px;
            }
            a:hover { background: #5568d3; }
            .info { 
                background: #f0f0f0; 
                padding: 15px; 
                border-radius: 5px; 
                margin-top: 20px;
                text-align: left;
            }
        </style>
        <meta http-equiv='refresh' content='2;url=index.php'>
    </head>
    <body>
        <div class='box'>
            <h2>✅ Successfully Logged In!</h2>
            <p>Logged in as: <strong>" . htmlspecialchars($user['full_name']) . "</strong></p>
            <div class='info'>
                <strong>User ID:</strong> " . $user['id'] . "<br>
                <strong>Email:</strong> " . htmlspecialchars($user['email']) . "<br>
                <strong>Room:</strong> " . htmlspecialchars($user['room_number'] ?? $user['room'] ?? 'N/A') . "
            </div>
            <p style='margin-top: 20px; color: #999;'>Redirecting to dashboard in 2 seconds...</p>
            <a href='index.php'>Click here if not redirected</a>
        </div>
    </body>
    </html>";
    exit();
} else {
    die("
    <!DOCTYPE html>
    <html>
    <head>
        <title>Error</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                margin: 0;
                background: #f5f5f5;
            }
            .box { 
                background: white; 
                padding: 40px; 
                border-radius: 10px; 
                box-shadow: 0 5px 20px rgba(0,0,0,0.1);
                text-align: center;
            }
            h2 { color: #e74c3c; }
            a { 
                display: inline-block;
                background: #3498db; 
                color: white; 
                padding: 10px 20px; 
                text-decoration: none; 
                border-radius: 5px;
                margin-top: 20px;
            }
        </style>
    </head>
    <body>
        <div class='box'>
            <h2>❌ No Users Found</h2>
            <p>Please create a user in your database first.</p>
            <a href='../login_create_forgot_account/login.php'>Go to Login/Register</a>
        </div>
    </body>
    </html>
    ");
}
?>