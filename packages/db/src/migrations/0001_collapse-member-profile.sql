ALTER TABLE `user` ADD `grade` text DEFAULT '未知' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `student_id` text DEFAULT '未知' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `major` text DEFAULT '未知' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `member_status` text DEFAULT 'selection' NOT NULL;--> statement-breakpoint
UPDATE `user`
SET
  `name` = COALESCE(
    NULLIF(TRIM((SELECT `real_name` FROM `user_profile` WHERE `user_profile`.`user_id` = `user`.`id`)), ''),
    '未知'
  ),
  `grade` = COALESCE(
    NULLIF(TRIM((SELECT `grade` FROM `user_profile` WHERE `user_profile`.`user_id` = `user`.`id`)), ''),
    '未知'
  ),
  `student_id` = COALESCE(
    NULLIF(TRIM((SELECT `student_id` FROM `user_profile` WHERE `user_profile`.`user_id` = `user`.`id`)), ''),
    '未知'
  ),
  `major` = COALESCE(
    NULLIF(TRIM((SELECT `major` FROM `user_profile` WHERE `user_profile`.`user_id` = `user`.`id`)), ''),
    '未知'
  ),
  `member_status` = COALESCE(
    (SELECT `member_status` FROM `user_profile` WHERE `user_profile`.`user_id` = `user`.`id`),
    'selection'
  );--> statement-breakpoint
DROP VIEW `current_member`;--> statement-breakpoint
DROP TABLE `user_profile`;--> statement-breakpoint
CREATE VIEW `current_member` AS 
  select
    "user"."id" as user_id,
    "user"."username" as username,
    "user"."name" as real_name,
    "user"."grade" as grade,
    "user"."student_id" as student_id,
    "user"."major" as major,
    "user"."member_status" as member_status
  from "user"
  where "user"."member_status" in ('selection', 'active')
;
