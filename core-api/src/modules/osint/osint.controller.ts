import { Doc } from '@/common/doc/doc.decorator';
import { Get, Controller, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OsintService } from './osint.service';

@ApiTags('OSINT')
@Controller('osint')
export class OsintController {
  constructor(private readonly osintService: OsintService) {}

  @Get('target/:targetId')
  @Doc({ summary: 'Get all OSINT findings for a target' })
  getByTarget(@Param('targetId') targetId: string) {
    return this.osintService.getByTarget(targetId);
  }

  @Get('target/:targetId/emails')
  @Doc({ summary: 'Get email OSINT findings for a target' })
  getEmails(@Param('targetId') targetId: string) {
    return this.osintService.getEmails(targetId);
  }

  @Get('target/:targetId/people')
  @Doc({ summary: 'Get people OSINT findings for a target' })
  getPeople(@Param('targetId') targetId: string) {
    return this.osintService.getPeople(targetId);
  }

  @Get('target/:targetId/counts')
  @Doc({ summary: 'Get OSINT finding counts by type for a target' })
  getCounts(@Param('targetId') targetId: string) {
    return this.osintService.countByTarget(targetId);
  }
}
