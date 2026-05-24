CREATE TABLE `catalogo` (
	`id` text PRIMARY KEY NOT NULL,
	`categoria` text NOT NULL,
	`valor` text NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`origen_local` integer DEFAULT false NOT NULL,
	`fecha_creacion` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`fecha_modificacion` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`is_synced` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_semillas` (
	`id` text PRIMARY KEY NOT NULL,
	`variedad_id` text NOT NULL,
	`pais_origen_id` text,
	`distribuidor_id` text,
	`metodo_secado_id` text,
	`seleccion_id` text,
	`olor_id` text,
	`color_id` text,
	`integridad_id` text,
	`anexo_ruta` text,
	`anexo_tamano` integer,
	`anexo_creacion` text,
	`fecha_creacion` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`fecha_modificacion` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`is_synced` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`variedad_id`) REFERENCES `catalogo`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pais_origen_id`) REFERENCES `catalogo`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`distribuidor_id`) REFERENCES `catalogo`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`metodo_secado_id`) REFERENCES `catalogo`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`seleccion_id`) REFERENCES `catalogo`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`olor_id`) REFERENCES `catalogo`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`color_id`) REFERENCES `catalogo`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`integridad_id`) REFERENCES `catalogo`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_semillas`("id", "variedad_id", "pais_origen_id", "distribuidor_id", "metodo_secado_id", "seleccion_id", "olor_id", "color_id", "integridad_id", "anexo_ruta", "anexo_tamano", "anexo_creacion", "fecha_creacion", "fecha_modificacion", "is_synced") SELECT "id", "variedad_id", "pais_origen_id", "distribuidor_id", "metodo_secado_id", "seleccion_id", "olor_id", "color_id", "integridad_id", "anexo_ruta", "anexo_tamano", "anexo_creacion", "fecha_creacion", "fecha_modificacion", "is_synced" FROM `semillas`;--> statement-breakpoint
DROP TABLE `semillas`;--> statement-breakpoint
ALTER TABLE `__new_semillas` RENAME TO `semillas`;--> statement-breakpoint
PRAGMA foreign_keys=ON;