import { Doc } from '@/common/doc/doc.decorator';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HibpService } from './hibp.service';

@ApiTags('HIBP')
@Controller('hibp')
export class HibpController {
  constructor(private readonly hibpService: HibpService) {}

  @Get('target/:targetId')
  @Doc({ summary: 'Get breach records for a target' })
  getByTarget(@Param('targetId') targetId: string) {
    return this.hibpService.getBreachesByTarget(targetId);
  }

  @Post('target/:targetId/check')
  @Doc({ summary: 'Trigger HIBP breach check for a target domain' })
  async triggerCheck(
    @Param('targetId') targetId: string,
    @Body() body: { domain: string },
  ) {
    await this.hibpService.triggerCheck(targetId, body.domain);
    return { message: 'HIBP check queued' };
  }
}
