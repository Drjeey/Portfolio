-- Add conversation_summary column to the existing conversations table
ALTER TABLE `conversations` 
ADD COLUMN `conversation_summary` TEXT DEFAULT NULL AFTER `title`;

-- Create an index on conversation_id in the chats table to improve query performance 
-- when retrieving conversation history
CREATE INDEX IF NOT EXISTS `idx_conversation_id` ON `chats` (`conversation_id`);