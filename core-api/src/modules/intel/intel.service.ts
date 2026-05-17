import { BullMQName, IntelSource } from '@/common/enums/enum';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { UpdateFeedConfigDto } from './dto/intel.dto';
import { IntelEnrichment } from './entities/intel-enrichment.entity';
import { IntelFeedConfig } from './entities/intel-feed-config.entity';
import { IntelEnrichmentJobData } from './processors/intel-enrichment.processor';

const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

@Injectable()
export class IntelService {
  constructor(
    @InjectRepository(IntelEnrichment)
    private readonly enrichmentRepo: Repository<IntelEnrichment>,
    @InjectRepository(IntelFeedConfig)
    private readonly feedConfigRepo: Repository<IntelFeedConfig>,
    @InjectQueue(BullMQName.INTEL_ENRICHMENT)
    private readonly enrichmentQueue: Queue,
  ) {}

  async getAssetEnrichments(assetId: string): Promise<IntelEnrichment[]> {
    return this.enrichmentRepo.find({ where: { assetId } });
  }

  async getFeeds(): Promise<IntelFeedConfig[]> {
    const configs = await this.feedConfigRepo.find();
    const existing = new Set(configs.map((c) => c.source));
    const defaults = Object.values(IntelSource)
      .filter((s) => !existing.has(s))
      .map((source) =>
        this.feedConfigRepo.create({ source, enabled: false, cacheTtlMinutes: 1440 }),
      );
    if (defaults.length) await this.feedConfigRepo.save(defaults);
    return this.feedConfigRepo.find({ order: { source: 'ASC' } });
  }

  async updateFeed(source: IntelSource, dto: UpdateFeedConfigDto): Promise<IntelFeedConfig> {
    let config = await this.feedConfigRepo.findOne({ where: { source } });
    if (!config) {
      config = this.feedConfigRepo.create({ source, enabled: false, cacheTtlMinutes: 1440 });
    }
    Object.assign(config, dto);
    return this.feedConfigRepo.save(config);
  }

  async enqueueAsset(assetId: string, assetValue: string): Promise<void> {
    const configs = await this.feedConfigRepo.find({ where: { enabled: true } });
    if (!configs.length) return;

    const assetType: 'ip' | 'domain' = IP_REGEX.test(assetValue) ? 'ip' : 'domain';
    const sources = configs
      .filter(
        (c) =>
          assetType === 'ip' ||
          c.source === IntelSource.ALIENVAULT_OTX,
      )
      .map((c) => c.source);

    if (!sources.length) return;

    const job: IntelEnrichmentJobData = { assetId, assetValue, assetType, sources };
    await this.enrichmentQueue.add('enrich', job, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
  }

  async enqueueTarget(targetId: string, assets: Array<{ id: string; value: string }>): Promise<void> {
    await Promise.all(assets.map((a) => this.enqueueAsset(a.id, a.value)));
  }

  async deleteExpired(): Promise<void> {
    await this.enrichmentRepo
      .createQueryBuilder()
      .delete()
      .where('expiresAt < NOW()')
      .execute();
  }

  async getFeedBySource(source: IntelSource): Promise<IntelFeedConfig | null> {
    return this.feedConfigRepo.findOne({ where: { source } });
  }
}
