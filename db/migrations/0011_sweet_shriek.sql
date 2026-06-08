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
	`activo` integer DEFAULT true NOT NULL,
	`is_synced` integer DEFAULT false NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL,
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
INSERT INTO `__new_semillas`("id", "variedad_id", "pais_origen_id", "distribuidor_id", "metodo_secado_id", "seleccion_id", "olor_id", "color_id", "integridad_id", "anexo_ruta", "anexo_tamano", "anexo_creacion", "fecha_creacion", "fecha_modificacion", "activo", "is_synced", "sync_status") SELECT "id", "variedad_id", "pais_origen_id", "distribuidor_id", "metodo_secado_id", "seleccion_id", "olor_id", "color_id", "integridad_id", "anexo_ruta", "anexo_tamano", "anexo_creacion", "fecha_creacion", "fecha_modificacion", "activo", "is_synced", "sync_status" FROM `semillas`;--> statement-breakpoint
DROP TABLE `semillas`;--> statement-breakpoint
ALTER TABLE `__new_semillas` RENAME TO `semillas`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_parcelas` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`hectareas` real NOT NULL,
	`latitud` real,
	`longitud` real,
	`ph_suelo` real,
	`textura` text NOT NULL,
	`altitud_msnm` real,
	`cortinas_rompevientos` integer DEFAULT false,
	`orientacion_ladera` text NOT NULL,
	`tipo_terreno` text NOT NULL,
	`tipo_zona` text,
	`estado` text DEFAULT 'Libre' NOT NULL,
	`fecha_creacion` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`fecha_modificacion` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`is_synced` integer DEFAULT false NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_parcelas`("id", "nombre", "hectareas", "latitud", "longitud", "ph_suelo", "textura", "altitud_msnm", "cortinas_rompevientos", "orientacion_ladera", "tipo_terreno", "tipo_zona", "estado", "fecha_creacion", "fecha_modificacion", "activo", "is_synced", "sync_status") SELECT "id", "nombre", "hectareas", "latitud", "longitud", "ph_suelo", "textura", "altitud_msnm", "cortinas_rompevientos", "orientacion_ladera", "tipo_terreno", "tipo_zona", "estado", "fecha_creacion", "fecha_modificacion", "activo", "is_synced", "sync_status" FROM `parcelas`;--> statement-breakpoint
DROP TABLE `parcelas`;--> statement-breakpoint
ALTER TABLE `__new_parcelas` RENAME TO `parcelas`;--> statement-breakpoint
CREATE UNIQUE INDEX `parcelas_nombre_unique` ON `parcelas` (`nombre`);--> statement-breakpoint
CREATE TABLE `__new_metricas_subetapa_sembrado` (
	`id` text PRIMARY KEY NOT NULL,
	`lote_id` text NOT NULL,
	`tecnico_id` text NOT NULL,
	`subfase` text NOT NULL,
	`fecha_inicio` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`fecha_fin` text,
	`tasa_germinacion` real,
	`dias_emergencia` integer,
	`presencia_hongos` text,
	`pares_hojas_verdaderas` integer,
	`altura_plantula` real,
	`vigor_radicular` text,
	`indice_crecimiento` real,
	`grosor_tallo` real,
	`formacion_bandolas` integer,
	`incidencia_foliar` real,
	`intensidad_floracion` text,
	`uniformidad_floracion` text,
	`estres_hidrico` text,
	`porcentaje_cuajado` real,
	`homogeneidad_maduracion` text,
	`incidencia_broca` real,
	`grados_brix` real,
	`is_synced` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`lote_id`) REFERENCES `lotes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tecnico_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_metricas_subetapa_sembrado`("id", "lote_id", "tecnico_id", "subfase", "fecha_inicio", "fecha_fin", "tasa_germinacion", "dias_emergencia", "presencia_hongos", "pares_hojas_verdaderas", "altura_plantula", "vigor_radicular", "indice_crecimiento", "grosor_tallo", "formacion_bandolas", "incidencia_foliar", "intensidad_floracion", "uniformidad_floracion", "estres_hidrico", "porcentaje_cuajado", "homogeneidad_maduracion", "incidencia_broca", "grados_brix", "is_synced") SELECT "id", "lote_id", "tecnico_id", "subfase", "fecha_inicio", "fecha_fin", "tasa_germinacion", "dias_emergencia", "presencia_hongos", "pares_hojas_verdaderas", "altura_plantula", "vigor_radicular", "indice_crecimiento", "grosor_tallo", "formacion_bandolas", "incidencia_foliar", "intensidad_floracion", "uniformidad_floracion", "estres_hidrico", "porcentaje_cuajado", "homogeneidad_maduracion", "incidencia_broca", "grados_brix", "is_synced" FROM `metricas_subetapa_sembrado`;--> statement-breakpoint
DROP TABLE `metricas_subetapa_sembrado`;--> statement-breakpoint
ALTER TABLE `__new_metricas_subetapa_sembrado` RENAME TO `metricas_subetapa_sembrado`;