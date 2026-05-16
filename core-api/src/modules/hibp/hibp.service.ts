import { BullMQName } from '@/common/enums/enum';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { BreachRecord } from './entities/breach-record.entity';
import { HibpCheckJobData } from './processors/hibp.processor';

@Injectable()
export class HibpService {
  constructor(
    @InjectRepository(BreachRecord)
    private readonly breachRepo: Repository<BreachRecord>,
    @InjectQueue(BullMQName.HIBP_CHECK)
    private readonly hibpQueue: Queue,
  ) {}

  async getBreachesByTarget(targetId: string): Promise<BreachRecord | null> {
    return this.breachRepo.findOne({ where: { targetId } });
  }

  async getBreachesByWorkspace(
    targetIds: string[],
  ): Promise<BreachRecord[]> {
    if (!targetIds.length) return [];
    return this.breachRepo
      .createQueryBuilder('br')
      .where('br.targetId IN (:...targetIds)', { targetIds })
      .orderBy('br.breachCount', 'DESC')
      .getMany();
  }

  async triggerCheck(targetId: string, domain: string): Promise<void> {
    const apiKey = process.env.INTEL_HIBP_API_KEY ?? '';
    const job: HibpCheckJobData = { targetId, domain, apiKey };
    await this.hibpQueue.add('hibp-check', job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 60000 },
      // HIBP rate limit: 10 req/min — use rate limiter via BullMQ
    });
  }
}
