CREATE TABLE `account_deletions` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`requested_at` text NOT NULL,
	`scheduled_for` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `privacy_consents` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`terms_version` text NOT NULL,
	`privacy_version` text NOT NULL,
	`accepted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`source` text DEFAULT 'web' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspace_records` (
	`scope_id` text PRIMARY KEY NOT NULL,
	`owner_id` text,
	`envelope` text NOT NULL,
	`checksum` text NOT NULL,
	`version` integer DEFAULT 2 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
