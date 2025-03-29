-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 29, 2025 at 03:25 PM
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
-- Database: `form`
--

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
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
