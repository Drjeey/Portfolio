<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NutriGuide | Login</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🥗</text></svg>">
    <style>
        :root {
            --primary-blue: #3d88f9;
            --primary-green: #27ae60;
            --light-green: #eafaf1;
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
            background-image: linear-gradient(135deg, var(--light-green) 0%, #e9f9ff 100%);
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
            color: var(--primary-green);
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

        .form.hidden {
            display: none;
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
            border-color: var(--primary-green);
            box-shadow: 0 0 0 2px rgba(39, 174, 96, 0.2);
        }

        button {
            background-color: var(--primary-green);
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
            background-color: #219653;
        }

        .toggle-form {
            text-align: center;
            margin-top: 1rem;
        }

        .toggle-form a {
            color: var(--primary-blue);
            text-decoration: none;
            cursor: pointer;
            font-weight: bold;
        }

        .toggle-form a:hover {
            text-decoration: underline;
        }
        
        .error-message {
            color: #e74c3c;
            text-align: center;
            margin-top: 10px;
            font-size: 14px;
        }
        
        .success-message {
            color: var(--primary-green);
            text-align: center;
            margin-top: 10px;
            font-size: 14px;
        }

        .admin-link {
            text-align: center;
            margin-top: 1rem;
            font-size: 0.8rem;
        }

        .admin-link a {
            color: #666;
            text-decoration: none;
        }

        .admin-link a:hover {
            text-decoration: underline;
            color: var(--primary-blue);
        }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="container">
        <div class="logo">
            <span class="logo-icon">🥗</span> NutriGuide
        </div>
        <div class="tagline">Your personal nutrition assistant powered by Nourish 1.0</div>
        <div class="form-container">
            <!-- Login Form -->
            <form class="form" id="loginForm">
                <h1>Welcome Back</h1>
                <div class="input-group">
                    <input type="text" name="username" id="login-username" placeholder="Username" required>
                </div>
                <div class="input-group">
                    <input type="password" name="password" id="login-password" placeholder="Password" required>
                </div>
                <button type="submit">Login</button>
                <div class="error-message" id="login-error"></div>
                <div class="toggle-form">
                    <span>Don't have an account? </span>
                    <a id="showSignup">Sign Up</a>
                </div>
                <div class="admin-link">
                    <a href="admin/login.php">Admin Access</a>
                </div>
            </form>

            <!-- Signup Form -->
            <form class="form hidden" id="signupForm">
                <h1>Create an Account</h1>
                <div class="input-group">
                    <input type="text" name="username" id="signup-username" placeholder="Username" required>
                </div>
                <div class="input-group">
                    <input type="password" name="password" id="signup-password" placeholder="Password" required>
                </div>
                <button type="submit">Sign Up</button>
                <div class="error-message" id="signup-error"></div>
                <div class="success-message" id="signup-success"></div>
                <div class="toggle-form">
                    <span>Already have an account? </span>
                    <a id="showLogin">Login</a>
                </div>
            </form>
        </div>
    </div>

    <script defer>
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        const showSignup = document.getElementById('showSignup');
        const showLogin = document.getElementById('showLogin');
        
        const loginError = document.getElementById('login-error');
        const signupError = document.getElementById('signup-error');
        const signupSuccess = document.getElementById('signup-success');

        showSignup.addEventListener('click', () => {
            loginForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
            // Clear any error messages
            loginError.textContent = '';
            signupError.textContent = '';
            signupSuccess.textContent = '';
        });

        showLogin.addEventListener('click', () => {
            signupForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            // Clear any error messages
            loginError.textContent = '';
            signupError.textContent = '';
            signupSuccess.textContent = '';
        });

        // Handle login form submission
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value.trim();
            
            if (!username || !password) {
                loginError.textContent = 'Please fill in all fields';
                return;
            }
            
            try {
                const response = await fetch('backend.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `action=login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
                });
                
                const responseText = await response.text();
                let data;
                
                try {
                    data = JSON.parse(responseText);
                } catch (jsonError) {
                    loginError.textContent = 'Server returned invalid response. Please try again later.';
                    console.error('Login parsing error:', responseText);
                    return;
                }
                
                if (data.success) {
                    window.location.href = 'index.php';
                } else {
                    loginError.textContent = data.error || 'Login failed';
                }
            } catch (error) {
                loginError.textContent = 'An error occurred. Please try again.';
                console.error('Login error:', error);
            }
        });
        
        // Handle signup form submission
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('signup-username').value.trim();
            const password = document.getElementById('signup-password').value.trim();
            
            if (!username || !password) {
                signupError.textContent = 'Please fill in all fields';
                return;
            }
            
            try {
                const response = await fetch('backend.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `action=signup&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`                });
                
                const responseText = await response.text();
                let data;
                
                try {
                    data = JSON.parse(responseText);
                } catch (jsonError) {
                    signupError.textContent = 'Server returned invalid response. Please try again later.';
                    console.error('Signup parsing error:', responseText);
                    return;
                }
                
                if (data.success) {
                    signupSuccess.textContent = 'Signup successful! Redirecting...';
                    signupError.textContent = '';
                    
                    // Redirect to index.php after a short delay
                    setTimeout(() => {
                        window.location.href = 'index.php';
                    }, 1500);
                } else {
                    signupError.textContent = data.error || 'Signup failed';
                    signupSuccess.textContent = '';
                }
            } catch (error) {
                signupError.textContent = 'An error occurred. Please try again.';
                signupSuccess.textContent = '';
                console.error('Signup error:', error);
            }
        });
    </script>
</body>
</html>
