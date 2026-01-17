# Complaint System

A comprehensive web-based complaint management system built with PHP, HTML, CSS, and SQL Server.

## Features

✅ User Registration & Login
✅ Submit Complaints (Maintenance, Facility, Noise, Billing)
✅ Track Complaint Status (Pending, In Progress, Resolved)
✅ View Complaint History
✅ Export PDF Receipts
✅ Update Profile & Password
✅ Admin Notes & Records
✅ Responsive Design

## Tech Stack

- **Backend:** PHP with PDO
- **Frontend:** HTML, CSS, JavaScript
- **Database:** SQL Server
- **Server:** Apache (XAMPP)

## Setup Instructions

### 1. Prerequisites

- XAMPP with Apache & SQL Server
- SQL Server Management Studio (SSMS)

### 2. Clone Repository

```bash
git clone <repository-url>
cd Complaint-System
```

### 3. Create Database

1. Open **SQL Server Management Studio**
2. Right-click on **Databases** → **New Query**
3. Open and run `database_setup.sql`
4. Verify tables are created:
   - `users`
   - `complaints`

### 4. Configure Database Connection

Edit `config.php` and update these lines:

```php
$serverName = "localhost";
$database = "complaint_system";
$uid = "sa";  // Your SQL Server username
$pwd = "";    // Your SQL Server password
```

### 5. Start Application

1. Start XAMPP (Apache & SQL Server)
2. Open browser and navigate to:
   ```
   http://localhost/Complaint-System/login_create_forgot_Account/login.php
   ```

3. Create a new account and start using!

## File Structure

```
Complaint-System/
├── config.php                          # Database configuration
├── database_setup.sql                  # Database creation script
├── login_create_forgot_Account/
│   ├── login.php                       # Login & Signup page
│   ├── login_style.css                 # Login styling
│   └── javascript.js                   # Login JavaScript
├── user_page/
│   ├── index.php                       # Main dashboard
│   ├── logout.php                      # Logout handler
│   ├── delete_complaint.php            # Delete complaint handler
│   ├── exportpdf.php                   # PDF export
│   ├── main_user_sidebar_design.css    # Main layout
│   ├── pages/
│   │   ├── user_front.php              # Home page
│   │   ├── complaint_history.php       # History page
│   │   ├── account_setings.php         # Settings page
│   │   ├── about_us.php                # About page
│   │   └── helps_and_faqs.php          # FAQ page
│   └── styles/
│       ├── user_front.css
│       ├── complaint_history.css
│       ├── account_settings.css
│       ├── about_us.css
│       └── helps_and_faqs.css
└── admin_page/                         # Admin section (future)
```

## Default Test Account

After running the database setup script, you can create a test account:

1. Go to Sign Up
2. Fill in details:
   - **Full Name:** Test User
   - **Email:** test@example.com
   - **Password:** testpass123
   - **Phone:** 1234567890
   - **Room:** 101

## Security Features

✅ Password hashing with `password_hash()`
✅ SQL injection prevention with prepared statements
✅ Session security with HttpOnly cookies
✅ Input sanitization with `htmlspecialchars()`
✅ CSRF protection ready

## Troubleshooting

### Database Connection Error
- Verify SQL Server is running
- Check database name matches `config.php`
- Confirm username and password

### Session Errors
- Clear browser cookies
- Restart Apache
- Check PHP error logs

## Future Enhancements

- [ ] Admin dashboard
- [ ] Email notifications
- [ ] Advanced filtering
- [ ] User role management
- [ ] Complaint analytics

## Support

For issues or questions, please create an issue in the repository.

## License

This project is open source and available under the MIT License.
