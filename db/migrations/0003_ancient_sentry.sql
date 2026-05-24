ALTER TABLE `semillas` RENAME COLUMN "paisOrigen" TO "pais_origen";--> statement-breakpoint
ALTER TABLE `semillas` RENAME COLUMN "metodoSecado" TO "metodo_secado";--> statement-breakpoint
ALTER TABLE `parcelas` RENAME COLUMN "nombreParcela" TO "nombre";--> statement-breakpoint
ALTER TABLE `parcelas` RENAME COLUMN "phSuelo" TO "ph_suelo";--> statement-breakpoint
ALTER TABLE `parcelas` RENAME COLUMN "altitudMsnm" TO "altitud_msnm";--> statement-breakpoint
ALTER TABLE `parcelas` RENAME COLUMN "cortinasRompevientos" TO "cortinas_rompevientos";--> statement-breakpoint
ALTER TABLE `parcelas` RENAME COLUMN "orientacionLadera" TO "orientacion_ladera";--> statement-breakpoint
ALTER TABLE `parcelas` RENAME COLUMN "tipoTerreno" TO "tipo_terreno";--> statement-breakpoint
ALTER TABLE `parcelas` RENAME COLUMN "tipoZona" TO "tipo_zona";--> statement-breakpoint
ALTER TABLE `lotes` RENAME COLUMN "variedadCafe" TO "variedad_cafe";--> statement-breakpoint
ALTER TABLE `lotes` RENAME COLUMN "porcentajeProgreso" TO "porcentaje_progreso";--> statement-breakpoint
ALTER TABLE `lotes` RENAME COLUMN "costoTotalManoObra" TO "costo_total_mano_obra";--> statement-breakpoint
ALTER TABLE `lotes` RENAME COLUMN "calidadFinal" TO "calidad_final";--> statement-breakpoint
DROP INDEX `parcelas_nombreParcela_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `parcelas_nombre_unique` ON `parcelas` (`nombre`);