import { MigrationInterface, QueryRunner } from 'typeorm';

export class SlackConfig1780000000000 implements MigrationInterface {
  name = 'SlackConfig1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "system_configs" ADD COLUMN IF NOT EXISTS "slackWebhookUrl" text`);
    await queryRunner.query(`ALTER TABLE "system_configs" ADD COLUMN IF NOT EXISTS "slackAlertThreshold" text DEFAULT 'high'`);
    await queryRunner.query(`ALTER TABLE "system_configs" ADD COLUMN IF NOT EXISTS "slackEnabled" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "system_configs" DROP COLUMN IF EXISTS "slackEnabled"`);
    await queryRunner.query(`ALTER TABLE "system_configs" DROP COLUMN IF EXISTS "slackAlertThreshold"`);
    await queryRunner.query(`ALTER TABLE "system_configs" DROP COLUMN IF EXISTS "slackWebhookUrl"`);
  }
}
