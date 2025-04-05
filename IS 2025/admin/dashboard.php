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

// Get statistics for the dashboard
$totalUsers = countTotalUsers($conn);
$totalAdmins = countTotalUsers($conn, 1);
$totalRegularUsers = countTotalUsers($conn, 0);
$totalConversations = countTotalConversations($conn);

// Get recent conversations for the quick view
$recentConversations = getAllConversations($conn, 5, 1);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NutriGuide | Admin Dashboard</title>
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
        }
        
        .page-header {
            margin-bottom: 2rem;
        }
        
        .page-title {
            font-size: 1.5rem;
            font-weight: bold;
            color: var(--dark-text);
        }
        
        /* Stat Cards */
        .stat-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .stat-card {
            background-color: white;
            border-radius: 10px;
            padding: 1.5rem;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }
        
        .stat-card .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        
        .stat-card .card-title {
            font-size: 1rem;
            font-weight: bold;
            color: var(--light-text);
        }
        
        .stat-card .card-icon {
            font-size: 1.5rem;
            color: var(--primary-purple);
        }
        
        .stat-card .card-value {
            font-size: 2rem;
            font-weight: bold;
            color: var(--dark-text);
            margin-bottom: 0.5rem;
        }
        
        .stat-card .card-description {
            color: var(--light-text);
            font-size: 0.9rem;
        }
        
        .stat-card .card-link {
            display: inline-block;
            margin-top: 1rem;
            color: var(--primary-purple);
            text-decoration: none;
            font-weight: 600;
            font-size: 0.9rem;
            transition: color 0.2s;
        }
        
        .stat-card .card-link:hover {
            color: var(--secondary-purple);
        }
        
        /* Recent Activity */
        .recent-activity {
            background-color: white;
            border-radius: 10px;
            padding: 1.5rem;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
            margin-bottom: 2rem;
        }
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        
        .section-title {
            font-size: 1.2rem;
            font-weight: bold;
            color: var(--dark-text);
        }
        
        .view-all-link {
            color: var(--primary-purple);
            text-decoration: none;
            font-weight: 600;
            font-size: 0.9rem;
            transition: color 0.2s;
        }
        
        .view-all-link:hover {
            color: var(--secondary-purple);
        }
        
        /* Activity Table */
        .activity-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .activity-table th, .activity-table td {
            padding: 1rem;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }
        
        .activity-table th {
            font-weight: 600;
            color: var(--light-text);
        }
        
        .activity-table tr:last-child td {
            border-bottom: none;
        }
        
        .activity-table .message-preview {
            max-width: 300px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: var(--light-text);
        }
        
        .activity-table .date-cell {
            white-space: nowrap;
            color: var(--light-text);
            font-size: 0.9rem;
        }
        
        .activity-table .view-btn {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            background-color: var(--primary-purple);
            color: white;
            border-radius: 4px;
            text-decoration: none;
            font-size: 0.8rem;
            transition: background-color 0.2s;
        }
        
        .activity-table .view-btn:hover {
            background-color: var(--secondary-purple);
        }
        
        /* Empty state */
        .empty-state {
            text-align: center;
            padding: 3rem;
        }
        
        .empty-state-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
            color: var(--light-text);
        }
        
        .empty-state-title {
            font-size: 1.5rem;
            margin-bottom: 1rem;
            color: var(--dark-text);
        }
        
        .empty-state-message {
            color: var(--light-text);
            margin-bottom: 2rem;
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
                    <a href="dashboard.php" class="active">
                        <span class="icon">📊</span>
                        <span>Dashboard</span>
                    </a>
                </li>
                <li>
                    <a href="users.php">
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
                <h1 class="page-title">NutriGuide Admin Dashboard</h1>
            </div>
            
            <!-- Stat Cards -->
            <section class="stat-cards">
                <div class="stat-card">
                    <div class="card-header">
                        <h2 class="card-title">Total Users</h2>
                        <span class="card-icon">👥</span>
                    </div>
                    <div class="card-value"><?php echo $totalUsers; ?></div>
                    <p class="card-description">Total users on the NutriGuide platform</p>
                    <a href="users.php" class="card-link">View All Users →</a>
                </div>
                
                <div class="stat-card">
                    <div class="card-header">
                        <h2 class="card-title">Administrators</h2>
                        <span class="card-icon">🔐</span>
                    </div>
                    <div class="card-value"><?php echo $totalAdmins; ?></div>
                    <p class="card-description">NutriGuide administrative staff</p>
                    <a href="users.php?filter_admin=1" class="card-link">View Admins →</a>
                </div>
                
                <div class="stat-card">
                    <div class="card-header">
                        <h2 class="card-title">Regular Users</h2>
                        <span class="card-icon">👤</span>
                    </div>
                    <div class="card-value"><?php echo $totalRegularUsers; ?></div>
                    <p class="card-description">Users accessing NutriGuide services</p>
                    <a href="users.php?filter_admin=0" class="card-link">View Regular Users →</a>
                </div>
                
                <div class="stat-card">
                    <div class="card-header">
                        <h2 class="card-title">Conversations</h2>
                        <span class="card-icon">💬</span>
                    </div>
                    <div class="card-value"><?php echo $totalConversations; ?></div>
                    <p class="card-description">Nutrition and dietary guidance sessions</p>
                    <a href="conversations.php" class="card-link">View All Conversations →</a>
                </div>
            </section>
            
            <!-- Recent Activity -->
            <section class="recent-activity">
                <div class="section-header">
                    <h2 class="section-title">Recent NutriGuide Interactions</h2>
                    <a href="conversations.php" class="view-all-link">View All →</a>
                </div>
                
                <?php if (empty($recentConversations)): ?>
                    <!-- Empty State -->
                    <div class="empty-state">
                        <div class="empty-state-icon">🥗</div>
                        <h3 class="empty-state-title">No Nutrition Conversations Yet</h3>
                        <p class="empty-state-message">There are no recent NutriGuide conversations to display.</p>
                    </div>
                <?php else: ?>
                    <!-- Activity Table -->
                    <table class="activity-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Date</th>
                                <th>Message Preview</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($recentConversations as $convo): ?>
                            <tr>
                                <td><?php echo htmlspecialchars($convo['username']); ?></td>
                                <td class="date-cell"><?php echo formatDate($convo['updated_at']); ?></td>
                                <td class="message-preview">
                                    <?php
                                    // Get the first message for this conversation
                                    $firstMsg = getFirstMessageForConversation($conn, $convo['id']);
                                    echo htmlspecialchars($firstMsg ? $firstMsg['user_message'] : '');
                                    ?>
                                </td>
                                <td>
                                    <a href="view_conversation.php?id=<?php echo $convo['id']; ?>" class="view-btn">View</a>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </section>
        </main>
    </div>
</body>
</html> 