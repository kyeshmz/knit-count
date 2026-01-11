CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `knitting_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`duration_seconds` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pattern_blocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pattern_id` integer NOT NULL,
	`block_order` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	FOREIGN KEY (`pattern_id`) REFERENCES `patterns`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pattern_repeats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`block_id` integer NOT NULL,
	`repeat_type` text NOT NULL,
	`start_row_number` integer,
	`end_row_number` integer,
	`times_to_repeat` integer NOT NULL,
	`size_variations` text,
	FOREIGN KEY (`block_id`) REFERENCES `pattern_blocks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pattern_rows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`block_id` integer NOT NULL,
	`row_number` integer NOT NULL,
	`side` text NOT NULL,
	`instruction` text NOT NULL,
	`stitch_change_type` text DEFAULT 'none' NOT NULL,
	`has_special_action` integer DEFAULT false NOT NULL,
	`special_action_note` text,
	`stitch_change_amount` integer DEFAULT 0,
	FOREIGN KEY (`block_id`) REFERENCES `pattern_blocks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `patterns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `progress_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`block_id` integer,
	`row_number` integer NOT NULL,
	`side` text NOT NULL,
	`action` text NOT NULL,
	`stitch_count_at_time` integer,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`block_id`) REFERENCES `pattern_blocks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `project_progress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`pattern_id` integer NOT NULL,
	`current_block_id` integer,
	`current_row_number` integer NOT NULL,
	`current_side` text NOT NULL,
	`current_repeat_iteration` integer,
	`total_rows_completed` integer DEFAULT 0 NOT NULL,
	`current_stitch_count` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pattern_id`) REFERENCES `patterns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`current_block_id`) REFERENCES `pattern_blocks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`selected_size` text NOT NULL,
	`pdf_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer,
	`is_archived` integer DEFAULT false NOT NULL,
	`notes` text,
	`total_time_seconds` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
