<?php
session_start();

// Redirect if already logged in as admin
if (isset($_SESSION['is_admin']) && $_SESSION['is_admin'] == 1) {
    header("Location: dashboard.php");
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NutriGuide | Admin Login</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔐</text></svg>">
    <style>
        :root {
            --primary-blue: #3d88f9;
            --primary-purple: #665CAC;
            --light-purple: #f1eeff;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Raleway', sans-serif;
        }

        body {
            background-color: #f0f2f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-image: linear-gradient(135deg, var(--light-purple) 0%, #e9f9ff 100%);
        }

        .container {
            background-color: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            width: 400px;
        }
        
        .logo {
            text-align: center;
            margin-bottom: 1.5rem;
            font-size: 24px;
            font-weight: bold;
            color: var(--primary-purple);
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .logo-icon {
            font-size: 32px;
            margin-right: 8px;
        }
        
        .tagline {
            text-align: center;
            margin-bottom: 2rem;
            font-size: 14px;
            color: #666;
            font-style: italic;
        }

        .form-container {
            position: relative;
        }

        .form {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }

        h1 {
            text-align: center;
            margin-bottom: 1.5rem;
            color: #1a1a1a;
            font-size: 20px;
        }

        .input-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        input {
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 16px;
        }

        input:focus {
            outline: none;
            border-color: var(--primary-purple);
            box-shadow: 0 0 0 2px rgba(102, 92, 172, 0.2);
        }

        button {
            background-color: var(--primary-purple);
            color: white;
            padding: 12px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: background-color 0.2s;
        }

        button:hover {
            background-color: #564b91;
        }

        .back-link {
            text-align: center;
            margin-top: 1rem;
        }

        .back-link a {
            color: var(--primary-blue);
            text-decoration: none;
            cursor: pointer;
            font-weight: bold;
        }

        .back-link a:hover {
            text-decoration: underline;
        }
        
        .error-message {
            color: #e74c3c;
            text-align: center;
            margin-top: 10px;
            font-size: 14px;
        }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="container">
        <div class="logo">
            <span class="logo-icon">🔐</span> NutriGuide Admin
        </div>
        <div class="tagline">Administrator Control Panel</div>
        <div class="form-container">
            <!-- Admin Login Form -->
            <form class="form" id="adminLoginForm">
                <h1>Admin Access</h1>
                <div class="input-group">
                    <input type="text" name="username" id="admin-username" placeholder="Admin Username" required>
                </div>
                <div class="input-group">
                    <input type="password" name="password" id="admin-password" placeholder="Password" required>
                </div>
                <button type="submit">Login</button>
                <div class="error-message" id="admin-login-error"></div>
                <div class="back-link">
                    <a href="../Form.php">Back to User Login</a>
                </div>
            </form>
        </div>
    </div>

    <script defer>
        const adminLoginForm = document.getElementById('adminLoginForm');
        const adminLoginError = document.getElementById('admin-login-error');
        
        // Handle admin login form submission
        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('admin-username').value.trim();
            const password = document.getElementById('admin-password').value.trim();
            
            if (!username || !password) {
                adminLoginError.textContent = 'Please fill in all fields';
                return;
            }
            
            try {
                const response = await fetch('auth.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `action=admin_login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
                });
                
                const responseText = await response.text();
                let data;
                
                try {
                    data = JSON.parse(responseText);
                } catch (jsonError) {
                    adminLoginError.textContent = 'Server returned invalid response. Please try again later.';
                    console.error('Admin login parsing error:', responseText);
                    return;
                }
                
                if (data.success) {
                    window.location.href = 'dashboard.php';
                } else {
                    adminLoginError.textContent = data.error || 'Admin login failed';
                }
            } catch (error) {
                adminLoginError.textContent = 'An error occurred. Please try again.';
                console.error('Admin login error:', error);
            }
        });
    </script>
</body>
</html> 