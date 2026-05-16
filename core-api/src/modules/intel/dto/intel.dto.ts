import { IntelSource } from '@/common/enums/enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateFeedConfigDto {
  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  baseUrl?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  cacheTtlMinutes?: number;
}

export class FeedConfigResponseDto {
  source: IntelSource;
  enabled: boolean;
  hasApiKey: boolean;
  cacheTtlMinutes: number;
}

export class EnrichmentResponseDto {
  assetId: string;
  source: IntelSource;
  data: Record<string, unknown>;
  abuseScore?: number;
  greynoiseClassification?: string;
  otxPulseCount: number;
  fetchedAt: Date;
  expiresAt?: Date;
}

export class AssetEnrichmentSummaryDto {
  assetId: string;
  assetValue: string;
  enrichments: EnrichmentResponseDto[];
  riskScore: number;
  isKnownMalicious: boolean;
}
