import { BullMQName } from '@/common/enums/enum';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { BreachRecord, HibpBreach } from '../entities/breach-record.entity';

export interface HibpCheckJobData {
  targetId: string;
  domain: string;
  apiKey: string;
}

@Processor(BullMQName.HIBP_CHECK)
export class HibpProcessor extends WorkerHost {
  private readonly logger = new Logger(HibpProcessor.name);

  constructor(
    @InjectRepository(BreachRecord)
    private readonly breachRepo: Repository<BreachRecord>,
  ) {
    super();
  }

  async process(job: Job<HibpCheckJobData>): Promise<void> {
    const { targetId, domain, apiKey } = job.data;
    if (!apiKey) {
      this.logger.warn('HIBP API key not configured, skipping check');
      return;
    }

    try {
      const { data } = await axios.get<HibpBreach[]>(
        `https://haveibeenpwned.com/api/v3/breacheddomain/${domain}`,
        {
          headers: { 'hibp-api-key': apiKey, 'user-agent': 'ngasm-oasm' },
          timeout: 15000,
        },
      );

      const breaches: HibpBreach[] = data.map((b) => ({
        name: b.name ?? (b as unknown as Record<string, string>).Name,
        domain: b.domain ?? (b as unknown as Record<string, string>).Domain,
        breachDate: b.breachDate ?? (b as unknown as Record<string, string>).BreachDate,
        addedDate: b.addedDate ?? (b as unknown as Record<string, string>).AddedDate,
        dataClasses: b.dataClasses ?? (b as unknown as Record<string, string[]>).DataClasses ?? [],
        pwnCount: b.pwnCount ?? (b as unknown as Record<string, number>).PwnCount ?? 0,
        isVerified: b.isVerified ?? (b as unknown as Record<string, boolean>).IsVerified ?? false,
      }));

      const existing = await this.breachRepo.findOne({ where: { targetId } });
      const hasNew = existing ? breaches.length > existing.breachCount : breaches.length > 0;

      await this.breachRepo.upsert(
        {
          targetId,
          domain,
          breaches,
          breachCount: breaches.length,
          checkedAt: new Date(),
          hasNewBreaches: hasNew,
        },
        ['targetId'],
      );
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        await this.breachRepo.upsert(
          {
            targetId,
            domain,
            breaches: [],
            breachCount: 0,
            checkedAt: new Date(),
            hasNewBreaches: false,
          },
          ['targetId'],
        );
        return;
      }
      this.logger.error(`HIBP check failed for ${domain}: ${err}`);
      throw err;
    }
  }
}
