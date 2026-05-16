import { MigrationInterface, QueryRunner } from 'typeorm';

export class IntelTables1780000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "intel_source_enum" AS ENUM ('greynoise', 'abuseipdb', 'alienvault_otx')
    `);

    await queryRunner.query(`
      CREATE TABLE "intel_enrichments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "assetId" uuid NOT NULL,
        "source" "intel_source_enum" NOT NULL,
        "data" jsonb NOT NULL DEFAULT '{}',
        "abuseScore" integer,
        "greynoiseClassification" character varying,
        "otxPulseCount" integer NOT NULL DEFAULT 0,
        "fetchedAt" TIMESTAMP NOT NULL,
        "expiresAt" TIMESTAMP,
        CONSTRAINT "PK_intel_enrichments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_intel_enrichments_asset_source" UNIQUE ("assetId", "source")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_intel_enrichments_assetId" ON "intel_enrichments" ("assetId")
    `);

    await queryRunner.query(`
      CREATE TABLE "intel_feed_configs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "source" "intel_source_enum" NOT NULL,
        "enabled" boolean NOT NULL DEFAULT false,
        "apiKey" character varying,
        "baseUrl" character varying,
        "cacheTtlMinutes" integer NOT NULL DEFAULT 1440,
        CONSTRAINT "PK_intel_feed_configs" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_intel_feed_configs_source" UNIQUE ("source")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "intel_feed_configs"`);
    await queryRunner.query(`DROP INDEX "IDX_intel_enrichments_assetId"`);
    await queryRunner.query(`DROP TABLE "intel_enrichments"`);
    await queryRunner.query(`DROP TYPE "intel_source_enum"`);
  }
}
