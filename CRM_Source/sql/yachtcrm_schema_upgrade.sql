-- YachtCRM-DMS Upgrade Schema Patch
-- Ensures new tables/columns/indexes introduced in the 2025-11 release are present
-- Safe to run multiple times; uses IF NOT EXISTS guards to avoid duplicate errors

START TRANSACTION;

-- Settings table and branding/business profile columns
CREATE TABLE IF NOT EXISTS `settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(191) NOT NULL,
  `value` longtext NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `settings_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `settings`
  ADD COLUMN IF NOT EXISTS `crm_name` varchar(255) NULL AFTER `value`,
  ADD COLUMN IF NOT EXISTS `logo_login` varchar(255) NULL AFTER `crm_name`,
  ADD COLUMN IF NOT EXISTS `logo_header` varchar(255) NULL AFTER `logo_login`,
  ADD COLUMN IF NOT EXISTS `logo_invoice` varchar(255) NULL AFTER `logo_header`,
  ADD COLUMN IF NOT EXISTS `business_name` varchar(255) NULL AFTER `logo_invoice`,
  ADD COLUMN IF NOT EXISTS `business_legal_name` varchar(255) NULL AFTER `business_name`,
  ADD COLUMN IF NOT EXISTS `business_phone` varchar(50) NULL AFTER `business_legal_name`,
  ADD COLUMN IF NOT EXISTS `business_email` varchar(255) NULL AFTER `business_phone`,
  ADD COLUMN IF NOT EXISTS `business_website` varchar(255) NULL AFTER `business_email`,
  ADD COLUMN IF NOT EXISTS `business_tax_id` varchar(100) NULL AFTER `business_website`,
  ADD COLUMN IF NOT EXISTS `business_address_line1` varchar(255) NULL AFTER `business_tax_id`,
  ADD COLUMN IF NOT EXISTS `business_address_line2` varchar(255) NULL AFTER `business_address_line1`,
  ADD COLUMN IF NOT EXISTS `business_city` varchar(120) NULL AFTER `business_address_line2`,
  ADD COLUMN IF NOT EXISTS `business_state` varchar(120) NULL AFTER `business_city`,
  ADD COLUMN IF NOT EXISTS `business_postal_code` varchar(30) NULL AFTER `business_state`,
  ADD COLUMN IF NOT EXISTS `business_country` varchar(120) NULL AFTER `business_postal_code`;

-- Modules configuration
CREATE TABLE IF NOT EXISTS `modules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `config` json NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `modules_slug_unique` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Navigation ordering / role visibility
CREATE TABLE IF NOT EXISTS `navigation_order` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `role` varchar(191) NOT NULL,
  `menu_key` varchar(191) NOT NULL,
  `position` int NOT NULL DEFAULT 0,
  `is_visible` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `navigation_order_role_menu_key_unique` (`role`,`menu_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `navigation_order`
  ADD COLUMN IF NOT EXISTS `is_visible` tinyint(1) NOT NULL DEFAULT 1 AFTER `position`;

-- Role permissions matrix
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `role` varchar(191) NOT NULL,
  `resource` varchar(191) NOT NULL,
  `action` varchar(191) NOT NULL,
  `granted` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_permissions_role_resource_action_unique` (`role`,`resource`,`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Part catalog enhancements
CREATE TABLE IF NOT EXISTS `part_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(191) NOT NULL,
  `description` text NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `part_categories_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `parts`
  ADD COLUMN IF NOT EXISTS `category` varchar(191) NULL AFTER `description`,
  ADD COLUMN IF NOT EXISTS `active` tinyint(1) NOT NULL DEFAULT 1 AFTER `vendor_part_numbers`;

-- Vehicles & related assets
CREATE TABLE IF NOT EXISTS `vehicles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `customer_id` bigint unsigned NULL,
  `name` varchar(191) NOT NULL,
  `year` varchar(50) NULL,
  `make` varchar(191) NULL,
  `model` varchar(191) NULL,
  `vin` varchar(191) NULL,
  `coach_number` varchar(255) NULL,
  `type` varchar(191) NULL,
  `notes` text NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `vehicles_customer_id_index` (`customer_id`),
  CONSTRAINT `vehicles_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `vehicles`
  ADD COLUMN IF NOT EXISTS `coach_number` varchar(255) NULL AFTER `vin`;

CREATE TABLE IF NOT EXISTS `vehicle_service_history` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `vehicle_id` bigint unsigned NOT NULL,
  `service_date` date NOT NULL,
  `description` text NULL,
  `mileage` varchar(191) NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `vehicle_service_history_vehicle_id_index` (`vehicle_id`),
  CONSTRAINT `vehicle_service_history_vehicle_id_foreign` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vehicle_documents` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `vehicle_id` bigint unsigned NOT NULL,
  `file_name` varchar(191) NOT NULL,
  `file_path` varchar(191) NOT NULL,
  `notes` text NULL,
  `uploaded_by` bigint unsigned NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `vehicle_documents_vehicle_id_index` (`vehicle_id`),
  CONSTRAINT `vehicle_documents_vehicle_id_foreign` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `quotes`
  ADD COLUMN IF NOT EXISTS `vehicle_id` bigint unsigned NULL AFTER `yacht_id`,
  ADD COLUMN IF NOT EXISTS `tax_name` varchar(191) NULL AFTER `tax_amount`,
  ADD KEY `quotes_vehicle_id_foreign` (`vehicle_id`),
  ADD CONSTRAINT `quotes_vehicle_id_foreign` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE SET NULL;

ALTER TABLE `invoices`
  ADD COLUMN IF NOT EXISTS `vehicle_id` bigint unsigned NULL AFTER `yacht_id`,
  ADD COLUMN IF NOT EXISTS `tax_name` varchar(191) NULL AFTER `tax_amount`,
  ADD KEY `invoices_vehicle_id_foreign` (`vehicle_id`),
  ADD CONSTRAINT `invoices_vehicle_id_foreign` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE SET NULL;

ALTER TABLE `appointments`
  ADD COLUMN IF NOT EXISTS `vehicle_id` bigint unsigned NULL AFTER `yacht_id`,
  ADD KEY `appointments_vehicle_id_foreign` (`vehicle_id`),
  ADD CONSTRAINT `appointments_vehicle_id_foreign` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE SET NULL;

-- Work orders
CREATE TABLE IF NOT EXISTS `work_orders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `work_order_number` varchar(255) NOT NULL,
  `customer_id` bigint unsigned NULL,
  `vehicle_id` bigint unsigned NULL,
  `invoice_id` bigint unsigned NULL,
  `assigned_to` bigint unsigned NULL,
  `status` enum('open','in_progress','completed','on_hold','cancelled') NOT NULL DEFAULT 'open',
  `priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
  `title` varchar(255) NOT NULL,
  `description` text NULL,
  `customer_concerns` text NULL,
  `work_performed` text NULL,
  `parts_needed` text NULL,
  `estimated_hours` decimal(8,2) NULL,
  `actual_hours` decimal(8,2) NULL,
  `due_date` date NULL,
  `key_tag_number` varchar(191) NULL,
  `started_at` timestamp NULL,
  `completed_at` timestamp NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `work_orders_work_order_number_unique` (`work_order_number`),
  KEY `work_orders_customer_id_index` (`customer_id`),
  KEY `work_orders_vehicle_id_index` (`vehicle_id`),
  KEY `work_orders_invoice_id_index` (`invoice_id`),
  CONSTRAINT `work_orders_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
  CONSTRAINT `work_orders_vehicle_id_foreign` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE SET NULL,
  CONSTRAINT `work_orders_invoice_id_foreign` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE SET NULL,
  CONSTRAINT `work_orders_assigned_to_foreign` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `work_orders`
  ADD COLUMN IF NOT EXISTS `key_tag_number` varchar(191) NULL AFTER `due_date`;

-- Accounting core tables
CREATE TABLE IF NOT EXISTS `chart_of_accounts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `account_number` varchar(10) NOT NULL,
  `account_name` varchar(191) NOT NULL,
  `account_type` enum('asset','liability','equity','revenue','expense','other_income','other_expense','cost_of_goods_sold') NOT NULL DEFAULT 'asset',
  `detail_type` enum('bank','accounts_receivable','other_current_asset','fixed_asset','other_asset','accounts_payable','credit_card','other_current_liability','long_term_liability','equity','income','other_income','expense','other_expense','cost_of_goods_sold') DEFAULT NULL,
  `parent_id` bigint unsigned NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_sub_account` tinyint(1) NOT NULL DEFAULT 0,
  `description` text NULL,
  `opening_balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `opening_balance_date` date NULL,
  `current_balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `chart_of_accounts_account_number_unique` (`account_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `chart_of_accounts`
  ADD COLUMN IF NOT EXISTS `detail_type` enum('bank','accounts_receivable','other_current_asset','fixed_asset','other_asset','accounts_payable','credit_card','other_current_liability','long_term_liability','equity','income','other_income','expense','other_expense','cost_of_goods_sold') NULL AFTER `account_type`;

CREATE TABLE IF NOT EXISTS `general_ledger_entries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `entry_date` date NOT NULL,
  `account_id` bigint unsigned NOT NULL,
  `description` text NULL,
  `debit` decimal(15,2) NOT NULL DEFAULT 0.00,
  `credit` decimal(15,2) NOT NULL DEFAULT 0.00,
  `source_type` varchar(191) NULL,
  `source_id` bigint unsigned NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `general_ledger_entries_account_id_index` (`account_id`),
  KEY `general_ledger_entries_entry_date_index` (`entry_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `journal_entries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `entry_number` varchar(191) NOT NULL,
  `entry_date` date NOT NULL,
  `memo` text NULL,
  `created_by` bigint unsigned NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `journal_entries_entry_number_unique` (`entry_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `journal_entry_lines` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `journal_entry_id` bigint unsigned NOT NULL,
  `account_id` bigint unsigned NOT NULL,
  `description` text NULL,
  `debit` decimal(15,2) NOT NULL DEFAULT 0.00,
  `credit` decimal(15,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bank_accounts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `account_name` varchar(191) NOT NULL,
  `account_number` varchar(191) NULL,
  `bank_name` varchar(191) NULL,
  `routing_number` varchar(191) NULL,
  `chart_account_id` bigint unsigned NULL,
  `opening_balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `opening_balance_date` date NULL,
  `current_balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `notes` text NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bank_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bank_account_id` bigint unsigned NOT NULL,
  `transaction_date` date NOT NULL,
  `type` enum('deposit','withdrawal','check','transfer','fee','interest','other') NOT NULL DEFAULT 'other',
  `check_number` varchar(191) NULL,
  `payee` varchar(191) NULL,
  `description` text NULL,
  `debit` decimal(15,2) NOT NULL DEFAULT 0.00,
  `credit` decimal(15,2) NOT NULL DEFAULT 0.00,
  `balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `account_id` bigint unsigned NULL,
  `is_reconciled` tinyint(1) NOT NULL DEFAULT 0,
  `reconciled_date` date NULL,
  `reference` varchar(191) NULL,
  `memo` text NULL,
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vendors` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(191) NOT NULL,
  `display_name` varchar(191) NULL,
  `email` varchar(191) NULL,
  `phone` varchar(191) NULL,
  `tax_id` varchar(191) NULL,
  `address` text NULL,
  `city` varchar(191) NULL,
  `state` varchar(191) NULL,
  `postal_code` varchar(30) NULL,
  `country` varchar(191) NULL,
  `notes` text NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bills` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `vendor_id` bigint unsigned NOT NULL,
  `bill_number` varchar(191) NOT NULL,
  `bill_date` date NOT NULL,
  `due_date` date NOT NULL,
  `ref_number` varchar(191) NULL,
  `status` enum('unpaid','partial','paid','overdue') NOT NULL DEFAULT 'unpaid',
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_name` varchar(191) NULL,
  `total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `amount_paid` decimal(15,2) NOT NULL DEFAULT 0.00,
  `balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `memo` text NULL,
  `terms` text NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bill_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bill_id` bigint unsigned NOT NULL,
  `account_id` bigint unsigned NULL,
  `description` varchar(191) NOT NULL,
  `quantity` int NOT NULL DEFAULT 1,
  `rate` decimal(15,2) NOT NULL DEFAULT 0.00,
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bill_payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bill_id` bigint unsigned NOT NULL,
  `bank_account_id` bigint unsigned NULL,
  `payment_date` date NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_method` enum('check','cash','credit_card','debit_card','bank_transfer','other') NOT NULL DEFAULT 'check',
  `check_number` varchar(191) NULL,
  `reference` varchar(191) NULL,
  `memo` text NULL,
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `bills`
  ADD COLUMN IF NOT EXISTS `tax_name` varchar(191) NULL AFTER `tax`;

-- MFA & auth adjustments
ALTER TABLE `users`
  MODIFY COLUMN `role` enum('Admin','Office_Staff','Technician','Service_Manager','Sales','Accounting','Customer') NOT NULL DEFAULT 'Technician';

-- Time tracking tables
CREATE TABLE IF NOT EXISTS `time_entries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `work_order_id` bigint unsigned NULL,
  `clock_in` timestamp NOT NULL,
  `clock_out` timestamp NULL,
  `notes` text NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `time_off_requests` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `type` enum('vacation','sick','personal','unpaid','other') NOT NULL DEFAULT 'vacation',
  `status` enum('pending','approved','denied') NOT NULL DEFAULT 'pending',
  `notes` text NULL,
  `reviewed_by` bigint unsigned NULL,
  `reviewed_at` timestamp NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
