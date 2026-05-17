import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendToolCategoryEnum1780000004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new values to tools_category_enum
    await queryRunner.query(`ALTER TYPE "public"."tools_category_enum" ADD VALUE IF NOT EXISTS 'osint'`);
    await queryRunner.query(`ALTER TYPE "public"."tools_category_enum" ADD VALUE IF NOT EXISTS 'tls_analysis'`);
    await queryRunner.query(`ALTER TYPE "public"."tools_category_enum" ADD VALUE IF NOT EXISTS 'mcp_vuln'`);

    // Add new values to jobs_category_enum
    await queryRunner.query(`ALTER TYPE "public"."jobs_category_enum" ADD VALUE IF NOT EXISTS 'osint'`);
    await queryRunner.query(`ALTER TYPE "public"."jobs_category_enum" ADD VALUE IF NOT EXISTS 'tls_analysis'`);
    await queryRunner.query(`ALTER TYPE "public"."jobs_category_enum" ADD VALUE IF NOT EXISTS 'mcp_vuln'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values directly.
    // Recreate both enums without the added values.
    await queryRunner.query(`
      ALTER TYPE "public"."tools_category_enum" RENAME TO "tools_category_enum_old"
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."tools_category_enum" AS ENUM(
        'subdomains', 'http_probe', 'ports_scanner', 'vulnerabilities',
        'screenshot', 'classifier', 'assistant'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "tools"
        ALTER COLUMN "category" TYPE "public"."tools_category_enum"
        USING "category"::text::"public"."tools_category_enum"
    `);
    await queryRunner.query(`DROP TYPE "public"."tools_category_enum_old"`);

    await queryRunner.query(`
      ALTER TYPE "public"."jobs_category_enum" RENAME TO "jobs_category_enum_old"
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."jobs_category_enum" AS ENUM(
        'subdomains', 'http_probe', 'ports_scanner', 'vulnerabilities',
        'screenshot', 'classifier', 'assistant'
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "jobs"
        ALTER COLUMN "category" TYPE "public"."jobs_category_enum"
        USING "category"::text::"public"."jobs_category_enum"
    `);
    await queryRunner.query(`DROP TYPE "public"."jobs_category_enum_old"`);
  }
}
