CREATE TABLE `Boards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`Title` text NOT NULL,
	`User_id` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`User_id`) REFERENCES `Users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ListTables` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`Title` text NOT NULL,
	`Board_id` integer NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`Board_id`) REFERENCES `Boards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_list_board_id` ON `ListTables` (`Board_id`);--> statement-breakpoint
CREATE TABLE `Tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`Tags` text NOT NULL,
	`color` text DEFAULT '#0079bf',
	`created_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `Task_tags` (
	`Tags_id` integer NOT NULL,
	`Tasks_id` integer NOT NULL,
	PRIMARY KEY(`Tags_id`, `Tasks_id`),
	FOREIGN KEY (`Tags_id`) REFERENCES `Tags`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`Tasks_id`) REFERENCES `Tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_Tags_Tasks_id` ON `Task_tags` (`Tasks_id`);--> statement-breakpoint
CREATE INDEX `idx_Tasks_tag_id` ON `Task_tags` (`Tags_id`);--> statement-breakpoint
CREATE TABLE `Tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`date` text NOT NULL,
	`End` text NOT NULL,
	`done` integer DEFAULT false,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`List_id` integer NOT NULL,
	FOREIGN KEY (`List_id`) REFERENCES `ListTables`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_Tasks_List` ON `Tasks` (`List_id`);--> statement-breakpoint
CREATE TABLE `Users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`Email` text NOT NULL,
	`Password_Hash` text NOT NULL,
	`Role` text DEFAULT 'user' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Users_Email_unique` ON `Users` (`Email`);--> statement-breakpoint
CREATE TABLE `refresh_token` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`User_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`Token_expires` integer NOT NULL,
	`revoked_at` integer,
	`is_revoked` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`User_id`) REFERENCES `Users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `refresh_token_user_id` ON `refresh_token` (`User_id`);--> statement-breakpoint
CREATE INDEX `refresh_token_hash_idx` ON `refresh_token` (`token_hash`);