-- Add conversations table
CREATE TABLE `conversations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL DEFAULT 'New Conversation',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `conversations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Add conversation_id to chats table
ALTER TABLE `chats` ADD `conversation_id` int(11) NOT NULL AFTER `user_id`;

-- Create index on conversation_id
ALTER TABLE `chats` ADD KEY `conversation_id` (`conversation_id`);

-- Add foreign key constraint
ALTER TABLE `chats` ADD CONSTRAINT `chats_ibfk_2` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE;

-- Create a default conversation for existing chats
INSERT INTO `conversations` (`user_id`, `title`) 
SELECT DISTINCT `user_id`, 'Previous Chat History' FROM `chats`;

-- Update existing chats to link to the default conversation
UPDATE `chats` c
JOIN `conversations` cv ON c.user_id = cv.user_id
SET c.conversation_id = cv.id; 