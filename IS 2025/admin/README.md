# NutriGuide Admin Panel

This directory contains the admin functionality for NutriGuide. It allows admins to manage users and view conversations.

## Features

- Admin authentication with is_admin flag
- User management (view, add, delete)
- Conversation viewing with detailed message history
- Raw model output viewing

## Installation

1. Run the SQL migration script to add the raw_model_output column:
   ```sql
   -- Run this query in your database
   ALTER TABLE `chats` ADD COLUMN `raw_model_output` TEXT AFTER `bot_message`;
   ```

2. Make sure the user you want to be an admin has the `is_admin` flag set to 1:
   ```sql
   -- Replace 'admin_username' with the username you want to make an admin
   UPDATE `users` SET `is_admin` = 1 WHERE `username` = 'admin_username';
   ```

3. Access the admin panel at `/admin/login.php` or through the "Admin Access" link on the main login page.

## Modifying the Chat System

To store raw model output in the database, update your chat processing code to save the complete response from the model.

For example, in your backend where you handle the model's response, add the raw output to your database insert:

```php
// When saving a chat message
$user_message = $data['user_message'] ?? '';
$bot_message = $data['bot_message'] ?? '';
$raw_model_output = $data['raw_model_output'] ?? '';

$stmt = $conn->prepare("INSERT INTO chats (user_id, conversation_id, date, user_message, bot_message, raw_model_output) VALUES (?, ?, ?, ?, ?, ?)");
$stmt->bind_param("iissss", $user_id, $conversation_id, $date, $user_message, $bot_message, $raw_model_output);
```

## Security Notice

This admin panel uses basic security measures. For a production environment, consider adding:

- Rate limiting on login attempts
- IP-based security
- Two-factor authentication
- Enhanced password policies
- Comprehensive logging 