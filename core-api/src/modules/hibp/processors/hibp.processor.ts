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
}

@Processor(BullMQName.HIBP_CHECK, { limiter: { max: 9, duration: 60000 } })
export class HibpProcessor extends WorkerHost {
  private readonly logger = new Logger(HibpProcessor.name);

  constructor(
    @InjectRepository(BreachRecord)
    private readonly breachRepo: Repository<BreachRecord>,
  ) {
    super();
  }

  async process(job: Job<HibpCheckJobData>): Promise<void> {
    const { targetId, domain } = job.data;
    const apiKey = process.env.INTEL_HIBP_API_KEY ?? '';
    if (!apiKey) {
      this.logger.warn('HIBP API key not configured, skipping check');
      return;
    }

    try {
      // /breaches?domain= returns full BreachModel[] for all breaches associated with a domain
      const { data } = await axios.get<HibpBreach[]>(
        `https://haveibeenpwned.com/api/v3/breaches`,
        {
          params: { domain },
          headers: { 'hibp-api-key': apiKey, 'user-agent': 'ngasm-oasm' },
          timeout: 15000,
        },
      );

      const breaches: HibpBreach[] = data.map((b) => ({
        name: typeof b.Name === 'string' ? b.Name : (b.name ?? ''),
        domain: typeof b.Domain === 'string' ? b.Domain : (b.domain ?? domain),
        breachDate: typeof b.BreachDate === 'string' ? b.BreachDate : (b.breachDate ?? ''),
        addedDate: typeof b.AddedDate === 'string' ? b.AddedDate : (b.addedDate ?? ''),
        dataClasses: Array.isArray(b.DataClasses) ? b.DataClasses : (b.dataClasses ?? []),
        pwnCount: typeof b.PwnCount === 'number' ? b.PwnCount : (b.pwnCount ?? 0),
        isVerified: typeof b.IsVerified === 'boolean' ? b.IsVerified : (b.isVerified ?? false),
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
