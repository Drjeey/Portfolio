-- STEP 1: Create the conversations table without any foreign key constraints
CREATE TABLE IF NOT EXISTS `conversations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL DEFAULT 'New Conversation',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- STEP 2: Add index and foreign key for user_id in conversations table
ALTER TABLE `conversations` ADD KEY `user_id` (`user_id`);
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_ibfk_1` 
FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

-- STEP 3: Add conversation_id column to chats table (nullable at first)
ALTER TABLE `chats` ADD COLUMN IF NOT EXISTS `conversation_id` int(11) NULL AFTER `user_id`;

-- STEP 4: Create a default conversation for each user who has chats
INSERT INTO `conversations` (`user_id`, `title`) 
SELECT DISTINCT `user_id`, 'Previous Chat History' FROM `chats`;

-- STEP 5: Link existing chats to the appropriate conversation
UPDATE `chats` c
JOIN `conversations` cv ON c.user_id = cv.user_id
SET c.conversation_id = cv.id
WHERE c.conversation_id IS NULL OR c.conversation_id = 0;

-- STEP 6: Make conversation_id NOT NULL after all rows have a value
ALTER TABLE `chats` MODIFY COLUMN `conversation_id` int(11) NOT NULL;

-- STEP 7: Add index on conversation_id
ALTER TABLE `chats` ADD KEY `conversation_id` (`conversation_id`);

-- STEP 8: Add foreign key constraint now that all data is consistent
ALTER TABLE `chats` ADD CONSTRAINT `chats_ibfk_2` 
FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE; 