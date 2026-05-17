import { BullMQName, IntelSource } from '@/common/enums/enum';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { AbuseIpDbProvider } from '../providers/abuseipdb.provider';
import { AlienVaultOtxProvider } from '../providers/alienvault-otx.provider';
import { GreynoiseProvider } from '../providers/greynoise.provider';
import { IntelEnrichment } from '../entities/intel-enrichment.entity';
import { IntelFeedConfig } from '../entities/intel-feed-config.entity';

export interface IntelEnrichmentJobData {
  assetId: string;
  assetValue: string;
  assetType: 'ip' | 'domain';
  sources: IntelSource[];
}

@Processor(BullMQName.INTEL_ENRICHMENT)
export class IntelEnrichmentProcessor extends WorkerHost {
  private readonly logger = new Logger(IntelEnrichmentProcessor.name);

  constructor(
    @InjectRepository(IntelEnrichment)
    private readonly enrichmentRepo: Repository<IntelEnrichment>,
    @InjectRepository(IntelFeedConfig)
    private readonly feedConfigRepo: Repository<IntelFeedConfig>,
    private readonly greynoise: GreynoiseProvider,
    private readonly abuseipdb: AbuseIpDbProvider,
    private readonly otx: AlienVaultOtxProvider,
  ) {
    super();
  }

  async process(job: Job<IntelEnrichmentJobData>): Promise<void> {
    const { assetId, assetValue, assetType, sources } = job.data;

    const configs = await this.feedConfigRepo.find({ where: { enabled: true } });
    const configMap = Object.fromEntries(configs.map((c) => [c.source, c]));

    for (const source of sources) {
      const config = configMap[source];
      if (!config) continue;

      try {
        let enrichmentData: object = {};
        let abuseScore: number | undefined;
        let greynoiseClassification: string | undefined;
        let otxPulseCount = 0;

        if (source === IntelSource.GREYNOISE && assetType === 'ip') {
          const result = await this.greynoise.lookup(assetValue, config.apiKey ?? '');
          if (result) {
            enrichmentData = result as unknown as object;
            greynoiseClassification = result.classification;
          }
        } else if (source === IntelSource.ABUSEIPDB && assetType === 'ip') {
          const result = await this.abuseipdb.check(assetValue, config.apiKey ?? '');
          if (result) {
            enrichmentData = result as unknown as object;
            abuseScore = result.abuseConfidenceScore;
          }
        } else if (source === IntelSource.ALIENVAULT_OTX) {
          const type = assetType === 'ip' ? 'IPv4' : 'domain';
          const result = await this.otx.lookup(assetValue, type, config.apiKey);
          if (result) {
            enrichmentData = result as unknown as object;
            otxPulseCount = result.pulseCount;
          }
        }

        const ttl = config.cacheTtlMinutes ?? 1440;
        const expiresAt = new Date(Date.now() + ttl * 60 * 1000);

        await this.enrichmentRepo.upsert(
          {
            assetId,
            source,
            data: enrichmentData,
            abuseScore,
            greynoiseClassification,
            otxPulseCount,
            fetchedAt: new Date(),
            expiresAt,
          },
          ['assetId', 'source'],
        );
      } catch (err) {
        this.logger.error(`Enrichment failed for ${assetId} source ${source}: ${err}`);
      }
    }
  }
}
