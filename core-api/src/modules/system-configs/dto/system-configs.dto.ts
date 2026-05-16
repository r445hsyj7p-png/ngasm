import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * Response DTO for system configuration
 */
export class SystemConfigResponseDto {
  @ApiProperty({ description: 'System name' })
  name: string;

  @ApiProperty({ description: 'Path to system logo', nullable: true })
  logoPath?: string | null;

  slackWebhookUrl?: string | null;
  slackAlertThreshold?: string | null;
  slackEnabled?: boolean;
}

/**
 * DTO for updating system configuration
 */
export class UpdateSystemConfigDto {
  @ApiPropertyOptional({ description: 'System name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Path to system logo' })
  @IsOptional()
  @IsString()
  logoPath?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slackWebhookUrl?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slackAlertThreshold?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  slackEnabled?: boolean;
}
