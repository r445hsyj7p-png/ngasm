import { MigrationInterface, QueryRunner } from 'typeorm';

export class OsintFinding1780000001000 implements MigrationInterface {
  name = 'OsintFinding1780000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "osint_type_enum" AS ENUM ('email', 'person', 'virtual_host', 'ip_range', 'subdomain');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "osint_findings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "type" "osint_type_enum" NOT NULL,
        "value" text NOT NULL,
        "source" text,
        "context" text,
        "targetId" uuid NOT NULL,
        CONSTRAINT "PK_osint_findings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_osint_findings_targetId" FOREIGN KEY ("targetId") REFERENCES "targets"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_osint_findings_targetId" ON "osint_findings" ("targetId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_osint_findings_targetId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "osint_findings"`);
  }
}
