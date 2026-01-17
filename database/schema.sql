-- ============================================
-- COMPLAINT DESK - DATABASE SCHEMA (MS SQL)
-- ============================================

-- Create Database
CREATE DATABASE ComplaintDeskDB;
GO

USE ComplaintDeskDB;
GO

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    FullName NVARCHAR(100) NOT NULL,
    Email NVARCHAR(100) UNIQUE NOT NULL,
    PhoneNumber NVARCHAR(20),
    RoomNumber NVARCHAR(20),
    Password NVARCHAR(255) NOT NULL,
    Role NVARCHAR(20) DEFAULT 'User' CHECK (Role IN ('User', 'Admin')),
    AccountStatus NVARCHAR(20) DEFAULT 'Active' CHECK (AccountStatus IN ('Active', 'Inactive')),
    CreatedAt DATETIME DEFAULT GETDATE(),
    LastLogin DATETIME,
    CONSTRAINT CHK_Email CHECK (Email LIKE '%@%.%')
);
GO

-- ============================================
-- 2. COMPLAINT TYPES TABLE
-- ============================================
CREATE TABLE ComplaintTypes (
    TypeID INT IDENTITY(1,1) PRIMARY KEY,
    TypeName NVARCHAR(50) NOT NULL UNIQUE,
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- Insert default complaint types
INSERT INTO ComplaintTypes (TypeName) VALUES 
    ('Maintenance'),
    ('Facility'),
    ('Noise'),
    ('Security'),
    ('Billing'),
    ('Neighbor'),
    ('Other');
GO

-- ============================================
-- 3. COMPLAINTS TABLE
-- ============================================
CREATE TABLE Complaints (
    ComplaintID INT IDENTITY(1,1) PRIMARY KEY,
    ComplaintCode NVARCHAR(20) UNIQUE NOT NULL,
    UserID INT NOT NULL,
    TypeID INT NOT NULL,
    Description NVARCHAR(MAX) NOT NULL,
    Status NVARCHAR(20) DEFAULT 'Pending' CHECK (Status IN ('Pending', 'In Progress', 'Resolved')),
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    ResolvedAt DATETIME NULL,
    IsDeleted BIT DEFAULT 0,
    CONSTRAINT FK_Complaints_Users FOREIGN KEY (UserID) REFERENCES Users(UserID),
    CONSTRAINT FK_Complaints_Types FOREIGN KEY (TypeID) REFERENCES ComplaintTypes(TypeID)
);
GO

-- ============================================
-- 4. RECORD LOGS TABLE
-- ============================================
CREATE TABLE RecordLogs (
    LogID INT IDENTITY(1,1) PRIMARY KEY,
    ComplaintID INT NOT NULL,
    LogMessage NVARCHAR(500) NOT NULL,
    LogTimestamp DATETIME DEFAULT GETDATE(),
    CreatedBy NVARCHAR(100),
    CONSTRAINT FK_RecordLogs_Complaints FOREIGN KEY (ComplaintID) REFERENCES Complaints(ComplaintID) ON DELETE CASCADE
);
GO

-- ============================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IX_Complaints_UserID ON Complaints(UserID);
CREATE INDEX IX_Complaints_Status ON Complaints(Status);
CREATE INDEX IX_Complaints_CreatedAt ON Complaints(CreatedAt);
CREATE INDEX IX_RecordLogs_ComplaintID ON RecordLogs(ComplaintID);
GO

-- ============================================
-- 6. STORED PROCEDURE: Generate Complaint Code
-- ============================================
CREATE PROCEDURE sp_GenerateComplaintCode
AS
BEGIN
    DECLARE @NextID INT;
    DECLARE @ComplaintCode NVARCHAR(20);
    
    SELECT @NextID = ISNULL(MAX(ComplaintID), 0) + 1 FROM Complaints;
    SET @ComplaintCode = 'C' + CAST(@NextID AS NVARCHAR(19));
    
    SELECT @ComplaintCode AS ComplaintCode;
END;
GO

-- ============================================
-- 7. TRIGGER: Auto Update Timestamp
-- ============================================
CREATE TRIGGER trg_UpdateComplaintTimestamp
ON Complaints
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE Complaints
    SET UpdatedAt = GETDATE(),
        ResolvedAt = CASE WHEN i.Status = 'Resolved' AND d.Status != 'Resolved' THEN GETDATE() ELSE Complaints.ResolvedAt END
    FROM Complaints
    INNER JOIN inserted i ON Complaints.ComplaintID = i.ComplaintID
    INNER JOIN deleted d ON Complaints.ComplaintID = d.ComplaintID;
END;
GO

-- ============================================
-- 8. INSERT SAMPLE DATA FOR TESTING
-- ============================================

-- Sample User (Password: password123 - you should hash this in production)
INSERT INTO Users (FullName, Email, PhoneNumber, RoomNumber, Password, Role) 
VALUES 
    ('John Doe', 'john.doe@example.com', '09123456789', '301', 'password123', 'User'),
    ('Admin User', 'admin@example.com', '09987654321', 'Admin Office', 'admin123', 'Admin');
GO

-- Sample Complaints
DECLARE @UserID INT = 1;
DECLARE @ComplaintCode NVARCHAR(20);

-- Complaint 1
SET @ComplaintCode = 'C1';
INSERT INTO Complaints (ComplaintCode, UserID, TypeID, Description, Status) 
VALUES (@ComplaintCode, @UserID, 1, 'Leaking faucet in bathroom needs immediate repair', 'Pending');

DECLARE @ComplaintID INT = SCOPE_IDENTITY();
INSERT INTO RecordLogs (ComplaintID, LogMessage, CreatedBy) 
VALUES (@ComplaintID, 'Complaint received from tenant', 'System');

-- Complaint 2
SET @ComplaintCode = 'C2';
INSERT INTO Complaints (ComplaintCode, UserID, TypeID, Description, Status) 
VALUES (@ComplaintCode, @UserID, 3, 'Loud noise from neighboring unit during late hours', 'In Progress');

SET @ComplaintID = SCOPE_IDENTITY();
INSERT INTO RecordLogs (ComplaintID, LogMessage, CreatedBy) 
VALUES 
    (@ComplaintID, 'Complaint received from tenant', 'System'),
    (@ComplaintID, 'Investigation started', 'Admin'),
    (@ComplaintID, 'Contacted neighboring tenant', 'Admin');

-- Complaint 3
SET @ComplaintCode = 'C3';
INSERT INTO Complaints (ComplaintCode, UserID, TypeID, Description, Status) 
VALUES (@ComplaintCode, @UserID, 5, 'Incorrect charges on monthly statement', 'Resolved');

SET @ComplaintID = SCOPE_IDENTITY();
INSERT INTO RecordLogs (ComplaintID, LogMessage, CreatedBy) 
VALUES 
    (@ComplaintID, 'Billing discrepancy reported', 'System'),
    (@ComplaintID, 'Finance team notified', 'Admin'),
    (@ComplaintID, 'Credit issued to tenant account', 'Admin'),
    (@ComplaintID, 'Tenant notified and confirmed resolution', 'Admin');

GO

-- ============================================
-- 9. VIEW: User Complaints Summary
-- ============================================
CREATE VIEW vw_UserComplaintsSummary AS
SELECT 
    u.UserID,
    u.FullName,
    u.Email,
    u.RoomNumber,
    COUNT(c.ComplaintID) AS TotalComplaints,
    SUM(CASE WHEN c.Status = 'Pending' THEN 1 ELSE 0 END) AS PendingCount,
    SUM(CASE WHEN c.Status = 'In Progress' THEN 1 ELSE 0 END) AS InProgressCount,
    SUM(CASE WHEN c.Status = 'Resolved' THEN 1 ELSE 0 END) AS ResolvedCount
FROM Users u
LEFT JOIN Complaints c ON u.UserID = c.UserID AND c.IsDeleted = 0
GROUP BY u.UserID, u.FullName, u.Email, u.RoomNumber;
GO

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Check all tables
SELECT * FROM Users;
SELECT * FROM ComplaintTypes;
SELECT * FROM Complaints;
SELECT * FROM RecordLogs;
SELECT * FROM vw_UserComplaintsSummary;
GO

PRINT 'Database schema created successfully!';