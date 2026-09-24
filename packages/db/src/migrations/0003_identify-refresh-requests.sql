CREATE TABLE `__new_refresh_request` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`target_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_refresh_request`("kind", "target_id", "created_at") SELECT "kind", "target_id", "created_at" FROM `refresh_request` ORDER BY "created_at";--> statement-breakpoint
DROP TABLE `refresh_request`;--> statement-breakpoint
ALTER TABLE `__new_refresh_request` RENAME TO `refresh_request`;--> statement-breakpoint
CREATE UNIQUE INDEX `refresh_request_kind_target_unique` ON `refresh_request` (`kind`,`target_id`);--> statement-breakpoint
CREATE INDEX `refresh_request_created_at_idx` ON `refresh_request` (`created_at`);
