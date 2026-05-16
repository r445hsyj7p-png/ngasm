import { BullMQName } from '@/common/enums/enum';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntelEnrichment } from './entities/intel-enrichment.entity';
import { IntelFeedConfig } from './entities/intel-feed-config.entity';
import { IntelController } from './intel.controller';
import { IntelService } from './intel.service';
import { IntelEnrichmentProcessor } from './processors/intel-enrichment.processor';
import { AbuseIpDbProvider } from './providers/abuseipdb.provider';
import { AlienVaultOtxProvider } from './providers/alienvault-otx.provider';
import { GreynoiseProvider } from './providers/greynoise.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([IntelEnrichment, IntelFeedConfig]),
    BullModule.registerQueue({ name: BullMQName.INTEL_ENRICHMENT }),
  ],
  controllers: [IntelController],
  providers: [
    IntelService,
    IntelEnrichmentProcessor,
    GreynoiseProvider,
    AbuseIpDbProvider,
    AlienVaultOtxProvider,
  ],
  exports: [IntelService],
})
export class IntelModule {}
