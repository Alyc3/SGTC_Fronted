CREATE TABLE `tostado` (
	`id` text PRIMARY KEY NOT NULL,
	`lote_id` text NOT NULL,
	`responsable_id` text,
	`duracion` text NOT NULL,
	`temperatura` text NOT NULL,
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
CREATE TABLE `molido` (
	`id` text PRIMARY KEY NOT NULL,
	`lote_id` text NOT NULL,
	`responsable_id` text,
	`granulometria` text NOT NULL,
	`temperatura` text NOT NULL,
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
