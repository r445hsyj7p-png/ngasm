import { MigrationInterface, QueryRunner } from 'typeorm';

export class BreachRecord1780000003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "breach_records" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "targetId" uuid NOT NULL,
        "domain" character varying NOT NULL,
        "breaches" jsonb NOT NULL DEFAULT '[]',
        "breachCount" integer NOT NULL DEFAULT 0,
        "checkedAt" TIMESTAMP NOT NULL,
        "hasNewBreaches" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_breach_records" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_breach_records_targetId" UNIQUE ("targetId")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_breach_records_targetId" ON "breach_records" ("targetId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_breach_records_targetId"`);
    await queryRunner.query(`DROP TABLE "breach_records"`);
  }
}
