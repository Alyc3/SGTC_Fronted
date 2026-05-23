ALTER TABLE `parcelas` RENAME COLUMN "codigo" TO "nombreParcela";--> statement-breakpoint
DROP INDEX `parcelas_codigo_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `parcelas_nombreParcela_unique` ON `parcelas` (`nombreParcela`);