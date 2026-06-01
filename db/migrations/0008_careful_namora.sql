ALTER TABLE `semillas` ADD `sync_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `parcelas` ADD `sync_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `lotes` ADD `sync_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `asignacion_personal` ADD `fecha_modificacion` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `asignacion_personal` ADD `sync_status` text DEFAULT 'pending' NOT NULL;