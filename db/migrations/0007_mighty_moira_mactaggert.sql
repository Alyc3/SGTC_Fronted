ALTER TABLE `personal` RENAME TO `users`;--> statement-breakpoint
ALTER TABLE `users` RENAME COLUMN "nombres" TO "first_name";--> statement-breakpoint
ALTER TABLE `users` RENAME COLUMN "apellidos" TO "last_name";--> statement-breakpoint
ALTER TABLE `users` RENAME COLUMN "identificacion" TO "identifier";--> statement-breakpoint
ALTER TABLE `users` RENAME COLUMN "telefono" TO "phone_number";--> statement-breakpoint
ALTER TABLE `users` RENAME COLUMN "rol" TO "role_id";--> statement-breakpoint
ALTER TABLE `users` RENAME COLUMN "activo" TO "status";--> statement-breakpoint
DROP INDEX `personal_identificacion_unique`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`first_name` text,
	`last_name` text,
	`identifier` text,
	`phone_number` text,
	`password_hash` text NOT NULL,
	`role_id` text NOT NULL,
	`status` text DEFAULT 'ACTIVO' NOT NULL,
	`suspended_from` text,
	`suspended_until` text,
	`session_token` text,
	`is_synced` integer DEFAULT false NOT NULL,
	`fecha_modificacion` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "first_name", "last_name", "identifier", "phone_number", "password_hash", "role_id", "status", "suspended_from", "suspended_until", "session_token", "is_synced", "fecha_modificacion") SELECT "id", "identifier" || '@example.com', "first_name", "last_name", "identifier", "phone_number", 'TODO_HASH', "role_id", "status", NULL, NULL, NULL, "is_synced", "fecha_modificacion" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_identifier_unique` ON `users` (`identifier`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone_number_unique` ON `users` (`phone_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_session_token_unique` ON `users` (`session_token`);--> statement-breakpoint
CREATE TABLE `__new_asignacion_personal` (
	`id` text PRIMARY KEY NOT NULL,
	`lote_id` text NOT NULL,
	`etapa` text NOT NULL,
	`trabajador_id` text NOT NULL,
	`tipo_grano` text,
	`pago_calculado` real,
	`fecha_asignacion` text DEFAULT CURRENT_TIMESTAMP,
	`fecha_jornada` text,
	`horas_trabajadas` real,
	`cantidad_cosechada` real,
	`is_synced` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`lote_id`) REFERENCES `lotes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`trabajador_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_asignacion_personal`("id", "lote_id", "etapa", "trabajador_id", "tipo_grano", "pago_calculado", "fecha_asignacion", "fecha_jornada", "horas_trabajadas", "cantidad_cosechada", "is_synced") SELECT "id", "lote_id", "etapa", "trabajador_id", "tipo_grano", "pago_calculado", "fecha_asignacion", "fecha_jornada", "horas_trabajadas", "cantidad_cosechada", "is_synced" FROM `asignacion_personal`;--> statement-breakpoint
DROP TABLE `asignacion_personal`;--> statement-breakpoint
ALTER TABLE `__new_asignacion_personal` RENAME TO `asignacion_personal`;