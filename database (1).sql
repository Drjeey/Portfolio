-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 29, 2025 at 05:14 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `database`
--

-- --------------------------------------------------------

--
-- Table structure for table `chats`
--

CREATE TABLE `chats` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `conversation_id` int(11) NOT NULL,
  `date` timestamp NOT NULL DEFAULT current_timestamp(),
  `user_message` text NOT NULL,
  `bot_message` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `chats`
--

INSERT INTO `chats` (`id`, `user_id`, `conversation_id`, `date`, `user_message`, `bot_message`) VALUES
(21, 5, 11, '2025-03-29 14:02:45', 'what is diabetes', 'Hello kasule, diabetes is a chronic health condition where your body either doesn\'t produce enough insulin or can\'t effectively use the insulin it produces, leading to high blood sugar levels.\n'),
(22, 5, 11, '2025-03-29 14:03:36', 'does it affect toddle', 'Yes, it can affect Toddle. Can I help you with anything else, kasule?\n'),
(23, 5, 12, '2025-03-29 14:04:32', 'which nutrition plan should i follow to prevent diabetes', 'To help prevent diabetes, kasule, a plan that emphasizes balanced meals, portion control, and consistent timing is ideal. The Mediterranean diet or the DASH (Dietary Approaches to Stop Hypertension) diet are often recommended. Both diets focus on whole foods, lean proteins, healthy fats, and plenty of fruits and vegetables while limiting processed foods, sugary drinks, and unhealthy fats. Always consult with a healthcare provider or a registered dietitian for personalized advice.\n'),
(24, 5, 12, '2025-03-29 14:07:10', 'will it work', 'Yes, it will work.\n'),
(25, 5, 12, '2025-03-29 14:07:22', 'how do you know', 'I am trained on a massive amount of text data by Google.\n'),
(26, 5, 12, '2025-03-29 14:07:53', 'what were we just talking about', 'I\'m sorry, kasule, but as a new conversation, I don\'t have any memory of past topics we might have discussed.\n');

-- --------------------------------------------------------

--
-- Table structure for table `conversations`
--

CREATE TABLE `conversations` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL DEFAULT 'New Conversation',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `conversations`
--

INSERT INTO `conversations` (`id`, `user_id`, `title`, `created_at`, `updated_at`) VALUES
(11, 5, 'Defining The Term Diabetes', '2025-03-29 16:02:45', '2025-03-29 16:03:36'),
(12, 5, 'New Chat Mar 29, 07:03 PM', '2025-03-29 16:03:45', '2025-03-29 16:07:53');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`) VALUES
(1, 'mark', '$2y$10$SLNMy857384wSmzN2bkn5u3NIrYcI43607kSQkpkfNL/3Idk2PVyC'),
(2, 'john', '$2y$10$NYpSMGkCHfCW6ybI/zd8oOHRmgaHJLS4.4pYtPpKwE9ox9nXnnKfO'),
(3, 'ben', '$2y$10$hNpqgJaM19LjbFHGJM6vA.CnvU61pjfvZLmLhL32ICiesgEH/jCpy'),
(4, 'Brian', '$2y$10$Ih5ljH3C1MeGEQy52yKEM.r0945GAx55e7cJlzzDsIkghySN85Zvq'),
(5, 'kasule', '$2y$10$Bq3mALvElvgq1jpJBPSijeW/4bZDMr/pLsIbfrZCPUbiHaFbrlKUW'),
(6, 'home', '$2y$10$oDat0xdEhExXC6Hpm0M2We/8MCV4o49G3lFGGuh8zjXaniddRfB3K');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `chats`
--
ALTER TABLE `chats`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `conversation_id` (`conversation_id`);

--
-- Indexes for table `conversations`
--
ALTER TABLE `conversations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `chats`
--
ALTER TABLE `chats`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `conversations`
--
ALTER TABLE `conversations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `chats`
--
ALTER TABLE `chats`
  ADD CONSTRAINT `chats_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `chats_ibfk_2` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `conversations`
--
ALTER TABLE `conversations`
  ADD CONSTRAINT `conversations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
