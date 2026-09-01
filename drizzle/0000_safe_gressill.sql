CREATE TABLE `article_entities` (
	`article_id` text NOT NULL,
	`entity_id` text NOT NULL,
	`mentions` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`article_id`, `entity_id`),
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`canonical_url` text,
	`title` text NOT NULL,
	`description` text,
	`content_excerpt` text,
	`publication` text NOT NULL,
	`author` text,
	`published_at` integer NOT NULL,
	`fetched_at` integer NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`image_url` text,
	`metadata` text,
	`wire_service` text,
	`syndicated_from_source_id` text,
	`is_demo` integer DEFAULT false NOT NULL,
	`source_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`syndicated_from_source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articles_url_unique` ON `articles` (`url`);--> statement-breakpoint
CREATE INDEX `articles_published_at_idx` ON `articles` (`published_at`);--> statement-breakpoint
CREATE INDEX `articles_source_id_idx` ON `articles` (`source_id`);--> statement-breakpoint
CREATE TABLE `cgi_components` (
	`id` text PRIMARY KEY NOT NULL,
	`score_id` text NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`raw_value` real NOT NULL,
	`weight` real NOT NULL,
	`contribution` real NOT NULL,
	`direction` text NOT NULL,
	`explanation` text NOT NULL,
	FOREIGN KEY (`score_id`) REFERENCES `common_ground_scores`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `claim_entities` (
	`claim_id` text NOT NULL,
	`entity_id` text NOT NULL,
	PRIMARY KEY(`claim_id`, `entity_id`),
	FOREIGN KEY (`claim_id`) REFERENCES `claims`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `claim_evidence` (
	`claim_id` text NOT NULL,
	`evidence_id` text NOT NULL,
	`stance` text NOT NULL,
	`note` text,
	`confidence` real DEFAULT 0.5 NOT NULL,
	PRIMARY KEY(`claim_id`, `evidence_id`),
	FOREIGN KEY (`claim_id`) REFERENCES `claims`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`evidence_id`) REFERENCES `evidence`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `claim_relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`from_claim_id` text NOT NULL,
	`to_claim_id` text NOT NULL,
	`confidence` real DEFAULT 0.5 NOT NULL,
	`rationale` text,
	`detected_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`from_claim_id`) REFERENCES `claims`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_claim_id`) REFERENCES `claims`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `claim_rel_unique` ON `claim_relationships` (`from_claim_id`,`to_claim_id`,`type`);--> statement-breakpoint
CREATE INDEX `claim_rel_from_idx` ON `claim_relationships` (`from_claim_id`);--> statement-breakpoint
CREATE INDEX `claim_rel_to_idx` ON `claim_relationships` (`to_claim_id`);--> statement-breakpoint
CREATE TABLE `claims` (
	`id` text PRIMARY KEY NOT NULL,
	`canonical_text` text NOT NULL,
	`original_text` text NOT NULL,
	`normalized_meaning` text,
	`type` text NOT NULL,
	`status` text DEFAULT 'UNVERIFIED' NOT NULL,
	`extraction_confidence` real DEFAULT 0.5 NOT NULL,
	`evidence_status` text DEFAULT 'none' NOT NULL,
	`corroboration_count` integer DEFAULT 0 NOT NULL,
	`contradiction_count` integer DEFAULT 0 NOT NULL,
	`is_key_claim` integer DEFAULT false NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`event_id` text NOT NULL,
	`source_article_id` text NOT NULL,
	`source_paragraph` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `claims_event_id_idx` ON `claims` (`event_id`);--> statement-breakpoint
CREATE INDEX `claims_status_idx` ON `claims` (`status`);--> statement-breakpoint
CREATE TABLE `common_ground_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`score` integer NOT NULL,
	`band` text NOT NULL,
	`formula_version` text DEFAULT 'cgi-v0.1' NOT NULL,
	`inputs_snapshot` text NOT NULL,
	`computed_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cgi_event_computed_idx` ON `common_ground_scores` (`event_id`,`computed_at`);--> statement-breakpoint
CREATE TABLE `corrections` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`claim_id` text,
	`original_text` text NOT NULL,
	`updated_text` text NOT NULL,
	`reason` text NOT NULL,
	`source_url` text,
	`corrected_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`claim_id`) REFERENCES `claims`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `entities` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`canonical_name` text,
	`wikipedia_url` text,
	`description` text,
	`is_demo` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entities_name_type_unique` ON `entities` (`name`,`type`);--> statement-breakpoint
CREATE TABLE `event_articles` (
	`event_id` text NOT NULL,
	`article_id` text NOT NULL,
	`similarity` real,
	`role` text,
	`added_at` integer NOT NULL,
	PRIMARY KEY(`event_id`, `article_id`),
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `event_entities` (
	`event_id` text NOT NULL,
	`entity_id` text NOT NULL,
	`salience` real DEFAULT 0.5 NOT NULL,
	PRIMARY KEY(`event_id`, `entity_id`),
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `event_topics` (
	`event_id` text NOT NULL,
	`topic_id` text NOT NULL,
	PRIMARY KEY(`event_id`, `topic_id`),
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`category` text NOT NULL,
	`location` text,
	`status` text DEFAULT 'developing' NOT NULL,
	`started_at` integer NOT NULL,
	`latest_update_at` integer NOT NULL,
	`clustering_method` text,
	`is_demo` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug_unique` ON `events` (`slug`);--> statement-breakpoint
CREATE INDEX `events_category_idx` ON `events` (`category`);--> statement-breakpoint
CREATE INDEX `events_latest_update_idx` ON `events` (`latest_update_at`);--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`publisher` text,
	`type` text NOT NULL,
	`published_at` integer,
	`archived_at` integer,
	`archive_url` text,
	`content_hash` text,
	`is_primary` integer DEFAULT false NOT NULL,
	`retrieval_meta` text,
	`is_demo` integer DEFAULT false NOT NULL,
	`event_id` text,
	`source_id` text,
	`article_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `evidence_event_id_idx` ON `evidence` (`event_id`);--> statement-breakpoint
CREATE TABLE `ingestion_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`adapter` text NOT NULL,
	`status` text NOT NULL,
	`items_seen` integer DEFAULT 0 NOT NULL,
	`items_accepted` integer DEFAULT 0 NOT NULL,
	`items_rejected` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`error` text,
	`started_at` integer NOT NULL,
	`finished_at` integer
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`domain` text NOT NULL,
	`country` text,
	`language` text DEFAULT 'en',
	`org_type` text,
	`parent_company` text,
	`ownership_group` text,
	`founded_year` integer,
	`about_url` text,
	`wikipedia_url` text,
	`website_url` text,
	`rss_feeds` text DEFAULT '[]',
	`category` text,
	`publishes_primary_sources` integer DEFAULT false NOT NULL,
	`is_demo` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sources_domain_unique` ON `sources` (`domain`);--> statement-breakpoint
CREATE INDEX `sources_org_type_idx` ON `sources` (`org_type`);--> statement-breakpoint
CREATE TABLE `timeline_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`headline` text NOT NULL,
	`detail` text,
	`type` text NOT NULL,
	`confidence` real DEFAULT 0.6 NOT NULL,
	`source_article_id` text,
	`is_demo` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `timeline_event_occurred_idx` ON `timeline_entries` (`event_id`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `topics` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `topics_slug_unique` ON `topics` (`slug`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`role` text DEFAULT 'reader' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);