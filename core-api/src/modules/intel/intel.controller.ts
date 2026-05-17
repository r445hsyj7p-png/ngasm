import { Roles } from '@/common/decorators/app.decorator';
import { Doc } from '@/common/doc/doc.decorator';
import { Role, IntelSource } from '@/common/enums/enum';
import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FeedConfigResponseDto, UpdateFeedConfigDto } from './dto/intel.dto';
import { IntelService } from './intel.service';

@ApiTags('Intel')
@Controller('intel')
export class IntelController {
  constructor(private readonly intelService: IntelService) {}

  @Get('asset/:assetId')
  @Doc({ summary: 'Get enrichment data for an asset' })
  getAssetEnrichments(@Param('assetId') assetId: string) {
    return this.intelService.getAssetEnrichments(assetId);
  }

  @Get('feeds')
  @Doc({ summary: 'List all intel feed configurations' })
  async getFeeds(): Promise<FeedConfigResponseDto[]> {
    const configs = await this.intelService.getFeeds();
    return configs.map((c) => ({
      source: c.source,
      enabled: c.enabled,
      hasApiKey: !!c.apiKey,
      cacheTtlMinutes: c.cacheTtlMinutes,
    }));
  }

  @Put('feeds/:source')
  @Roles(Role.ADMIN)
  @Doc({ summary: 'Update intel feed configuration' })
  updateFeed(
    @Param('source') source: IntelSource,
    @Body() dto: UpdateFeedConfigDto,
  ) {
    return this.intelService.updateFeed(source, dto);
  }

  @Post('enrich/asset/:assetId')
  @Doc({ summary: 'Trigger enrichment for an asset' })
  async enrichAsset(
    @Param('assetId') assetId: string,
    @Body() body: { value: string },
  ) {
    await this.intelService.enqueueAsset(assetId, body.value);
    return { message: 'Enrichment queued' };
  }
}
