PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tostado` (
	`id` text PRIMARY KEY NOT NULL,
	`lote_id` text NOT NULL,
	`responsable_id` text,
	`duracion` integer NOT NULL,
	`temperatura` real NOT NULL,
	`olor` text NOT NULL,
	`imagen_evidencia_uri` text NOT NULL,
	`fecha_inicio` text NOT NULL,
	`fecha_final` text,
	`fecha_creacion` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`fecha_modificacion` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`is_synced` integer DEFAULT false NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`lote_id`) REFERENCES `lotes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`responsable_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_tostado`("id", "lote_id", "responsable_id", "duracion", "temperatura", "olor", "imagen_evidencia_uri", "fecha_inicio", "fecha_final", "fecha_creacion", "fecha_modificacion", "is_synced", "sync_status") SELECT "id", "lote_id", "responsable_id", "duracion", "temperatura", "olor", "imagen_evidencia_uri", "fecha_inicio", "fecha_final", "fecha_creacion", "fecha_modificacion", "is_synced", "sync_status" FROM `tostado`;--> statement-breakpoint
DROP TABLE `tostado`;--> statement-breakpoint
ALTER TABLE `__new_tostado` RENAME TO `tostado`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_molido` (
	`id` text PRIMARY KEY NOT NULL,
	`lote_id` text NOT NULL,
	`responsable_id` text,
	`granulometria` text NOT NULL,
	`temperatura` real NOT NULL,
	`imagen_evidencia_uri` text NOT NULL,
	`fecha_inicio` text NOT NULL,
	`fecha_final` text,
	`fecha_creacion` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`fecha_modificacion` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`is_synced` integer DEFAULT false NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`lote_id`) REFERENCES `lotes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`responsable_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_molido`("id", "lote_id", "responsable_id", "granulometria", "temperatura", "imagen_evidencia_uri", "fecha_inicio", "fecha_final", "fecha_creacion", "fecha_modificacion", "is_synced", "sync_status") SELECT "id", "lote_id", "responsable_id", "granulometria", "temperatura", "imagen_evidencia_uri", "fecha_inicio", "fecha_final", "fecha_creacion", "fecha_modificacion", "is_synced", "sync_status" FROM `molido`;--> statement-breakpoint
DROP TABLE `molido`;--> statement-breakpoint
ALTER TABLE `__new_molido` RENAME TO `molido`;