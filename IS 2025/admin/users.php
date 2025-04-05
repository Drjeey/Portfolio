<?php
session_start();

// Include necessary files
require_once '../db_config.php';
require_once 'functions.php';

// Verify admin access
verifyAdminAccess();

// Get database connection
$conn = getDbConnection();
if (!$conn) {
    die("Database connection failed");
}

// Get pagination parameters
$page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
$perPage = 5;

// Get filter parameters
$filterAdmin = isset($_GET['filter_admin']) ? $_GET['filter_admin'] : null;
if ($filterAdmin !== null) {
    $filterAdmin = (int)$filterAdmin;
}

// Get users with pagination and filtering
$users = getAllUsers($conn, $page, $perPage, $filterAdmin);

// Get total count for pagination
$totalUsers = countTotalUsers($conn, $filterAdmin);
$totalPages = ceil($totalUsers / $perPage);

// Build base URL for pagination links
$baseUrl = "users.php?";
if ($filterAdmin !== null) {
    $baseUrl .= "filter_admin=" . $filterAdmin;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NutriGuide | User Management</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>��</text></svg>">
    <style>
        :root {
            --primary-purple: #665CAC;
            --secondary-purple: #8678c5;
            --light-purple: #f1eeff;
            --dark-text: #333;
            --light-text: #777;
            --success-green: #27ae60;
            --warning-yellow: #f39c12;
            --danger-red: #e74c3c;
            --border-color: #ddd;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Raleway', sans-serif;
        }
        
        body {
            background-color: #f5f7fb;
            color: var(--dark-text);
            line-height: 1.6;
        }
        
        .container {
            display: block;
            min-height: 100vh;
        }
        
        /* Sidebar */
        .sidebar {
            background-color: var(--primary-purple);
            color: white;
            padding: 2rem 1rem;
            position: fixed;
            height: 100vh;
            width: 250px;
            overflow-y: auto;
        }
        
        .logo {
            display: flex;
            align-items: center;
            margin-bottom: 2rem;
            font-size: 1.5rem;
            font-weight: bold;
        }
        
        .logo-icon {
            font-size: 2rem;
            margin-right: 0.5rem;
        }
        
        .sidebar-nav {
            list-style: none;
        }
        
        .sidebar-nav li {
            margin-bottom: 0.5rem;
        }
        
        .sidebar-nav a {
            display: flex;
            align-items: center;
            padding: 0.75rem 1rem;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            transition: background-color 0.2s;
        }
        
        .sidebar-nav a:hover, .sidebar-nav a.active {
            background-color: rgba(255, 255, 255, 0.1);
        }
        
        .sidebar-nav .icon {
            margin-right: 0.75rem;
            font-size: 1.2rem;
        }
        
        .logout-link {
            position: absolute;
            bottom: 2rem;
            left: 1rem;
            width: calc(250px - 2rem);
            padding: 0.75rem 1rem;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            display: flex;
            align-items: center;
            background-color: rgba(255, 255, 255, 0.1);
            transition: background-color 0.2s;
        }
        
        .logout-link:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }
        
        .logout-icon {
            margin-right: 0.75rem;
        }
        
        /* Main Content */
        .main-content {
            padding: 2rem;
            margin-left: 250px;
            overflow-y: auto;
            min-height: 100vh;
            box-sizing: border-box;
        }
        
        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }
        
        .page-title {
            font-size: 1.5rem;
            font-weight: bold;
            color: var(--dark-text);
        }
        
        .add-user-btn {
            background-color: var(--success-green);
            color: white;
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            display: flex;
            align-items: center;
            transition: background-color 0.2s;
        }
        
        .add-user-btn:hover {
            background-color: #219653;
        }
        
        .add-user-btn .icon {
            margin-right: 0.5rem;
            font-size: 1.2rem;
        }
        
        /* Modal */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            justify-content: center;
            align-items: center;
        }
        
        .modal.active {
            display: flex;
        }
        
        .modal-content {
            background-color: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 500px;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        
        .modal-title {
            font-size: 1.2rem;
            font-weight: bold;
        }
        
        .close-btn {
            background: none;
            border: none;
            cursor: pointer;
            font-size: 1.5rem;
            color: var(--light-text);
        }
        
        .form-group {
            margin-bottom: 1.5rem;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
        }
        
        .form-group input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid var(--border-color);
            border-radius: 8px;
        }
        
        .form-group input:focus {
            outline: none;
            border-color: var(--primary-purple);
            box-shadow: 0 0 0 2px rgba(102, 92, 172, 0.2);
        }
        
        .form-check {
            display: flex;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        
        .form-check input {
            margin-right: 0.5rem;
        }
        
        .submit-btn {
            background-color: var(--primary-purple);
            color: white;
            padding: 0.75rem 1rem;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            width: 100%;
            transition: background-color 0.2s;
        }
        
        .submit-btn:hover {
            background-color: var(--secondary-purple);
        }
        
        /* Filter Section */
        .filter-section {
            background-color: white;
            padding: 1.5rem;
            border-radius: 10px;
            margin-bottom: 2rem;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        
        .filter-section h3 {
            margin-bottom: 1rem;
            font-size: 1rem;
            color: var(--dark-text);
        }
        
        .filter-controls {
            display: flex;
            gap: 1rem;
            align-items: flex-end;
        }
        
        .filter-group {
            flex: 1;
        }
        
        .filter-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            font-size: 0.9rem;
        }
        
        .filter-group select {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            background-color: white;
        }
        
        .filter-group select:focus {
            outline: none;
            border-color: var(--primary-purple);
            box-shadow: 0 0 0 2px rgba(102, 92, 172, 0.2);
        }
        
        .filter-btn {
            background-color: var(--primary-purple);
            color: white;
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            transition: background-color 0.2s;
        }
        
        .filter-btn:hover {
            background-color: var(--secondary-purple);
        }
        
        .reset-btn {
            background-color: #f1f1f1;
            color: var(--dark-text);
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            transition: background-color 0.2s;
        }
        
        .reset-btn:hover {
            background-color: #e1e1e1;
        }
        
        /* Tables */
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 2rem;
            background-color: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }
        
        .data-table th, .data-table td {
            padding: 1rem;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }
        
        .data-table th {
            background-color: #f9f9f9;
            font-weight: 600;
        }
        
        .data-table tr:last-child td {
            border-bottom: none;
        }
        
        .data-table .user-role {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        
        .data-table .admin-role {
            background-color: var(--light-purple);
            color: var(--primary-purple);
        }
        
        .data-table .user-role {
            background-color: #e8f4fd;
            color: #3498db;
        }
        
        .data-table .actions {
            display: flex;
            gap: 0.5rem;
        }
        
        .data-table .action-btn {
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            color: white;
            text-decoration: none;
            font-size: 0.8rem;
        }
        
        .data-table .view-btn {
            background-color: var(--primary-purple);
        }
        
        .data-table .view-btn:hover {
            background-color: var(--secondary-purple);
        }
        
        .data-table .delete-btn {
            background-color: var(--danger-red);
        }
        
        .data-table .delete-btn:hover {
            background-color: #c0392b;
        }
        
        /* Pagination */
        .pagination {
            display: flex;
            justify-content: center;
            gap: 0.5rem;
            margin: 2rem 0;
        }
        
        .page-btn, .page-num {
            padding: 0.5rem 1rem;
            border-radius: 4px;
            background-color: white;
            color: var(--dark-text);
            text-decoration: none;
            transition: all 0.2s;
            font-size: 0.9rem;
            border: 1px solid var(--border-color);
        }
        
        .page-btn:hover, .page-num:hover {
            background-color: var(--light-purple);
            color: var(--primary-purple);
        }
        
        .page-num.active {
            background-color: var(--primary-purple);
            color: white;
            border-color: var(--primary-purple);
        }
        
        .page-btn.disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .page-ellipsis {
            padding: 0.5rem 0;
            color: var(--light-text);
        }
        
        /* Message alerts */
        .alert {
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            display: none;
        }
        
        .alert.success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .alert.error {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .alert.show {
            display: block;
        }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="container">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="logo">
                <span class="logo-icon">🥗</span>
                <span>NutriGuide Admin</span>
            </div>
            
            <ul class="sidebar-nav">
                <li>
                    <a href="dashboard.php">
                        <span class="icon">📊</span>
                        <span>Dashboard</span>
                    </a>
                </li>
                <li>
                    <a href="users.php" class="active">
                        <span class="icon">👥</span>
                        <span>User Management</span>
                    </a>
                </li>
                <li>
                    <a href="conversations.php">
                        <span class="icon">💬</span>
                        <span>Conversations</span>
                    </a>
                </li>
            </ul>
            
            <a href="auth.php?logout=true" class="logout-link">
                <span class="logout-icon">⏻</span>
                <span>Logout</span>
            </a>
        </aside>
        
        <!-- Main Content -->
        <main class="main-content">
            <div class="page-header">
                <h1 class="page-title">NutriGuide User Management</h1>
                <button class="add-user-btn" id="showAddUserModal">
                    <span class="icon">➕</span>
                    <span>Add New User</span>
                </button>
            </div>
            
            <!-- Alert Messages -->
            <div class="alert success" id="successAlert"></div>
            <div class="alert error" id="errorAlert"></div>
            
            <!-- Filter Section -->
            <div class="filter-section">
                <h3>Filter Users</h3>
                <form action="users.php" method="GET" class="filter-controls">
                    <div class="filter-group">
                        <label for="filter_admin">User Type:</label>
                        <select name="filter_admin" id="filter_admin">
                            <option value="">All Users</option>
                            <option value="1" <?php echo (isset($_GET['filter_admin']) && $_GET['filter_admin'] == '1') ? 'selected' : ''; ?>>Admins Only</option>
                            <option value="0" <?php echo (isset($_GET['filter_admin']) && $_GET['filter_admin'] == '0') ? 'selected' : ''; ?>>Regular Users Only</option>
                        </select>
                    </div>
                    <button type="submit" class="filter-btn">Apply Filter</button>
                    <?php if (isset($_GET['filter_admin'])): ?>
                        <a href="users.php" class="reset-btn">Reset</a>
                    <?php endif; ?>
                </form>
            </div>
            
            <!-- Users Table -->
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($users as $user): ?>
                    <tr>
                        <td><?php echo $user['id']; ?></td>
                        <td><?php echo htmlspecialchars($user['username']); ?></td>
                        <td>
                            <?php if ($user['is_admin'] == 1): ?>
                                <span class="user-role admin-role">Admin</span>
                            <?php else: ?>
                                <span class="user-role">User</span>
                            <?php endif; ?>
                        </td>
                        <td class="actions">
                            <a href="conversations.php?user_id=<?php echo $user['id']; ?>" class="action-btn view-btn">View Conversations</a>
                            <?php if ($user['id'] != $_SESSION['user_id']): ?>
                                <a href="#" class="action-btn delete-btn" onclick="deleteUser(<?php echo $user['id']; ?>, '<?php echo htmlspecialchars($user['username']); ?>')">Delete</a>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            
            <!-- Pagination -->
            <?php if ($totalPages > 1): ?>
                <?php echo generatePagination($page, $totalPages, $baseUrl); ?>
            <?php endif; ?>
        </main>
    </div>
    
    <!-- Add User Modal -->
    <div class="modal" id="addUserModal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">Add New User</h2>
                <button class="close-btn" id="closeModal">&times;</button>
            </div>
            <form id="addUserForm">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" required>
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" required>
                </div>
                <div class="form-check">
                    <input type="checkbox" id="is_admin" name="is_admin">
                    <label for="is_admin">Admin Privileges</label>
                </div>
                <button type="submit" class="submit-btn">Create User</button>
            </form>
        </div>
    </div>
    
    <script>
        // Modal functionality
        const modal = document.getElementById('addUserModal');
        const showModalBtn = document.getElementById('showAddUserModal');
        const closeModalBtn = document.getElementById('closeModal');
        
        showModalBtn.addEventListener('click', () => {
            modal.classList.add('active');
        });
        
        closeModalBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        // Close modal when clicking outside of it
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
        
        // Alert functionality
        const successAlert = document.getElementById('successAlert');
        const errorAlert = document.getElementById('errorAlert');
        
        function showSuccessAlert(message) {
            successAlert.textContent = message;
            successAlert.classList.add('show');
            
            // Hide after 3 seconds
            setTimeout(() => {
                successAlert.classList.remove('show');
            }, 3000);
        }
        
        function showErrorAlert(message) {
            errorAlert.textContent = message;
            errorAlert.classList.add('show');
            
            // Hide after 3 seconds
            setTimeout(() => {
                errorAlert.classList.remove('show');
            }, 3000);
        }
        
        // Add user form submission
        const addUserForm = document.getElementById('addUserForm');
        
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();
            const isAdmin = document.getElementById('is_admin').checked ? 1 : 0;
            
            if (!username || !password) {
                showErrorAlert('Please fill in all fields');
                return;
            }
            
            try {
                const response = await fetch('auth.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `action=create_user&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&is_admin=${isAdmin}`
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showSuccessAlert('User created successfully!');
                    modal.classList.remove('active');
                    addUserForm.reset();
                    
                    // Reload page after a short delay
                    setTimeout(() => {
                        location.reload();
                    }, 1000);
                } else {
                    showErrorAlert(data.error || 'Failed to create user');
                }
            } catch (error) {
                console.error('Error:', error);
                showErrorAlert('An error occurred. Please try again.');
            }
        });
        
        // Function to delete a user
        function deleteUser(userId, username) {
            if (confirm(`Are you sure you want to delete the user "${username}"? This action cannot be undone.`)) {
                fetch('auth.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `action=delete_user&user_id=${userId}`
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showSuccessAlert('User deleted successfully!');
                        setTimeout(() => {
                            location.reload();
                        }, 1000);
                    } else {
                        showErrorAlert(data.error || 'Failed to delete user');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showErrorAlert('An error occurred. Please try again.');
                });
            }
        }
    </script>
</body>
</html> 