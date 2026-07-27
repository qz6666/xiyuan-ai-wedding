CREATE TABLE `guest_invitations` (
	`code` text PRIMARY KEY NOT NULL,
	`scope_id` text NOT NULL,
	`workspace_key` text NOT NULL,
	`owner_id` text,
	`guest_id` integer NOT NULL,
	`guest_name` text NOT NULL,
	`relation` text NOT NULL,
	`invited_count` integer DEFAULT 1 NOT NULL,
	`couple_names` text NOT NULL,
	`wedding_date` text NOT NULL,
	`city` text NOT NULL,
	`rsvp` text DEFAULT '待确认' NOT NULL,
	`attending_count` integer DEFAULT 1 NOT NULL,
	`companion` integer DEFAULT false NOT NULL,
	`dietary` text DEFAULT '' NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`responded_at` text
);
--> statement-breakpoint
CREATE INDEX `guest_invitations_scope_guest_idx` ON `guest_invitations` (`scope_id`,`guest_id`);