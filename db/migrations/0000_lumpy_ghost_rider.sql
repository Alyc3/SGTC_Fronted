CREATE TABLE `semillas` (
	`id` text PRIMARY KEY NOT NULL,
	`variedad` text NOT NULL,
	`paisOrigen` text,
	`distribuidor` text,
	`anexo_ruta` text,
	`anexo_tamano` integer,
	`anexo_creacion` text,
	`is_synced` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `parcelas` (
	`id` text PRIMARY KEY NOT NULL,
	`codigo` text NOT NULL,
	`hectareas` real NOT NULL,
	`latitud` real,
	`longitud` real,
	`phSuelo` real,
	`textura` text NOT NULL,
	`altitudMsnm` real,
	`cortinasRompevientos` integer DEFAULT false,
	`orientacionLadera` text NOT NULL,
	`tipoTerreno` text NOT NULL,
	`tipoZona` text,
	`estado` text DEFAULT 'Libre' NOT NULL,
	`fecha_creacion` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`fecha_modificacion` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`is_synced` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `parcelas_codigo_unique` ON `parcelas` (`codigo`);--> statement-breakpoint
CREATE TABLE `lotes` (
	`id` text PRIMARY KEY NOT NULL,
	`codigo` text NOT NULL,
	`parcela_id` text NOT NULL,
	`semilla_id` text NOT NULL,
	`zona_seleccionada` text,
	`hectareas_lote` real,
	`variedadCafe` text,
	`porcentajeProgreso` real DEFAULT 0,
	`costoTotalManoObra` real DEFAULT 0,
	`estado_lote` text DEFAULT 'Creado' NOT NULL,
	`calidadFinal` text,
	`fecha_creacion` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`fecha_modificacion` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`is_synced` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`parcela_id`) REFERENCES `parcelas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`semilla_id`) REFERENCES `semillas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lotes_codigo_unique` ON `lotes` (`codigo`);--> statement-breakpoint
CREATE TABLE `personal` (
	`id` text PRIMARY KEY NOT NULL,
	`identificacion` text NOT NULL,
	`nombres` text NOT NULL,
	`apellidos` text NOT NULL,
	`telefono` text,
	`rol` text NOT NULL,
	`fecha_creacion` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`fecha_modificacion` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`is_synced` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `personal_identificacion_unique` ON `personal` (`identificacion`);--> statement-breakpoint
CREATE TABLE `asignacion_personal` (
	`id` text PRIMARY KEY NOT NULL,
	`lote_id` text NOT NULL,
	`etapa` text NOT NULL,
	`trabajador_id` text NOT NULL,
	`tipo_grano` text,
	`pago_calculado` real,
	`fechaAsignacion` text DEFAULT CURRENT_TIMESTAMP,
	`fecha_jornada` text,
	`horasTrabajadas` real,
	`cantidad_cosechada` real,
	`is_synced` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`lote_id`) REFERENCES `lotes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`trabajador_id`) REFERENCES `personal`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `estado_etapa` (
	`id` text PRIMARY KEY NOT NULL,
	`lote_id` text NOT NULL,
	`etapa` text NOT NULL,
	`estado` text DEFAULT 'Pendiente' NOT NULL,
	`fecha_inicio` text,
	`fecha_final` text,
	`duracion_calculada` real,
	`subFaseSiembra` text,
	`is_synced` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`lote_id`) REFERENCES `lotes`(`id`) ON UPDATE no action ON DELETE no action
);
