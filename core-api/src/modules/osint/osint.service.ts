import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OsintFinding, OsintType } from './entities/osint-finding.entity';

@Injectable()
export class OsintService {
  constructor(
    @InjectRepository(OsintFinding)
    private readonly osintRepo: Repository<OsintFinding>,
  ) {}

  async getByTarget(targetId: string): Promise<OsintFinding[]> {
    return this.osintRepo.find({ where: { targetId }, order: { createdAt: 'DESC' } });
  }

  async getEmails(targetId: string): Promise<OsintFinding[]> {
    return this.osintRepo.find({ where: { targetId, type: OsintType.EMAIL }, order: { createdAt: 'DESC' } });
  }

  async getPeople(targetId: string): Promise<OsintFinding[]> {
    return this.osintRepo.find({ where: { targetId, type: OsintType.PERSON }, order: { createdAt: 'DESC' } });
  }

  async saveFindings(targetId: string, findings: Array<{ type: OsintType; value: string; source?: string; context?: string }>): Promise<void> {
    if (!findings.length) return;
    await this.osintRepo.upsert(
      findings.map((f) => ({ ...f, targetId })),
      ['targetId', 'type', 'value'],
    );
  }

  async countByTarget(targetId: string): Promise<Record<OsintType, number>> {
    const results = await this.osintRepo
      .createQueryBuilder('f')
      .select('f.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('f.targetId = :targetId', { targetId })
      .groupBy('f.type')
      .getRawMany();

    const counts = Object.values(OsintType).reduce(
      (acc, t) => ({ ...acc, [t]: 0 }),
      {} as Record<OsintType, number>,
    );
    results.forEach((r: { type: string; count: string }) => (counts[r.type as OsintType] = parseInt(r.count, 10)));
    return counts;
  }
}
