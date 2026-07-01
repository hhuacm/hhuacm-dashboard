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
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`username` text NOT NULL,
	`display_username` text,
	`role` text DEFAULT 'user' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `user_profile` (
	`user_id` text PRIMARY KEY NOT NULL,
	`real_name` text,
	`grade` text,
	`student_id` text,
	`major` text,
	`member_status` text DEFAULT 'selection' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_oj_account` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`platform` text NOT NULL,
	`external_id` text NOT NULL,
	`handle` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "user_oj_account_platform_check" CHECK("user_oj_account"."platform" in ('luogu', 'codeforces', 'atcoder', 'nowcoder'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_oj_account_user_platform_unique` ON `user_oj_account` (`user_id`,`platform`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_oj_account_platform_external_id_unique` ON `user_oj_account` (`platform`,`external_id`);--> statement-breakpoint
CREATE INDEX `user_oj_account_platform_userId_idx` ON `user_oj_account` (`platform`,`user_id`);--> statement-breakpoint
CREATE TABLE `atcoder_account_stats` (
	`account_id` text PRIMARY KEY NOT NULL,
	`rating` integer,
	`recent_performance_average` integer,
	`fetched_at` integer,
	`last_attempted_at` integer NOT NULL,
	`last_error` text,
	FOREIGN KEY (`account_id`) REFERENCES `user_oj_account`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `atcoder_account_stats_fetched_at_idx` ON `atcoder_account_stats` (`fetched_at`);--> statement-breakpoint
CREATE TABLE `codeforces_account_stats` (
	`account_id` text PRIMARY KEY NOT NULL,
	`rating` integer,
	`max_rating` integer,
	`accepted_problem_count` integer,
	`accepted_problem_count_in_month` integer,
	`last_online_at` integer,
	`fetched_at` integer,
	`last_attempted_at` integer NOT NULL,
	`last_error` text,
	FOREIGN KEY (`account_id`) REFERENCES `user_oj_account`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `codeforces_account_stats_fetched_at_idx` ON `codeforces_account_stats` (`fetched_at`);--> statement-breakpoint
CREATE TABLE `luogu_accepted_problem` (
	`account_id` text NOT NULL,
	`difficulty` integer,
	`name` text NOT NULL,
	`pid` text NOT NULL,
	`type` text NOT NULL,
	PRIMARY KEY(`account_id`, `pid`),
	FOREIGN KEY (`account_id`) REFERENCES `user_oj_account`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `luogu_accepted_problem_pid_account_idx` ON `luogu_accepted_problem` (`pid`,`account_id`);--> statement-breakpoint
CREATE TABLE `luogu_account_stats` (
	`account_id` text PRIMARY KEY NOT NULL,
	`accepted_problem_count` integer,
	`accepted_weighted_score` integer,
	`average_accepted_difficulty` real,
	`fetched_at` integer,
	`last_attempted_at` integer NOT NULL,
	`last_error` text,
	FOREIGN KEY (`account_id`) REFERENCES `user_oj_account`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `luogu_account_stats_fetched_at_idx` ON `luogu_account_stats` (`fetched_at`);--> statement-breakpoint
CREATE TABLE `nowcoder_account_stats` (
	`account_id` text PRIMARY KEY NOT NULL,
	`rating` real,
	`accepted_problem_count` integer,
	`fetched_at` integer,
	`last_attempted_at` integer NOT NULL,
	`last_error` text,
	FOREIGN KEY (`account_id`) REFERENCES `user_oj_account`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `nowcoder_account_stats_fetched_at_idx` ON `nowcoder_account_stats` (`fetched_at`);--> statement-breakpoint
CREATE TABLE `problem_set` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description_markdown` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `problem_set_problem` (
	`problem_set_id` text NOT NULL,
	`pid` text NOT NULL,
	`title` text,
	`difficulty` integer,
	`sort_order` integer NOT NULL,
	PRIMARY KEY(`problem_set_id`, `pid`),
	FOREIGN KEY (`problem_set_id`) REFERENCES `problem_set`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `problem_set_problem_set_sort_idx` ON `problem_set_problem` (`problem_set_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `problem_set_problem_pid_set_idx` ON `problem_set_problem` (`pid`,`problem_set_id`);--> statement-breakpoint
CREATE TABLE `refresh_request` (
	`kind` text NOT NULL,
	`target_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`kind`, `target_id`)
);
--> statement-breakpoint
CREATE INDEX `refresh_request_created_at_idx` ON `refresh_request` (`created_at`);--> statement-breakpoint
CREATE TABLE `site_setting` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_award` (
	`user_id` text NOT NULL,
	`source` text NOT NULL,
	`year` integer NOT NULL,
	`contest` text NOT NULL,
	`event` text,
	`level` text NOT NULL,
	`sort_order` integer NOT NULL,
	PRIMARY KEY(`user_id`, `source`, `sort_order`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_award_sync` (
	`user_id` text NOT NULL,
	`source` text NOT NULL,
	`fetched_at` integer,
	`last_attempted_at` integer NOT NULL,
	`last_error` text,
	PRIMARY KEY(`user_id`, `source`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_award_sync_fetched_at_idx` ON `user_award_sync` (`fetched_at`);--> statement-breakpoint
CREATE VIEW `current_member` AS 
  select
    "user"."id" as user_id,
    "user"."username" as username,
    "user_profile"."real_name" as real_name,
    "user_profile"."grade" as grade,
    "user_profile"."student_id" as student_id,
    "user_profile"."major" as major,
    coalesce("user_profile"."member_status", 'selection') as member_status
  from "user"
  left join "user_profile" on "user_profile"."user_id" = "user"."id"
  where coalesce("user_profile"."member_status", 'selection') in ('selection', 'active')
;