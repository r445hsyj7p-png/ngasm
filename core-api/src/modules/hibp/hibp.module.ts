import { BullMQName } from '@/common/enums/enum';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BreachRecord } from './entities/breach-record.entity';
import { HibpController } from './hibp.controller';
import { HibpService } from './hibp.service';
import { HibpProcessor } from './processors/hibp.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([BreachRecord]),
    BullModule.registerQueue({
      name: BullMQName.HIBP_CHECK,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 60000 },
      },
    }),
  ],
  controllers: [HibpController],
  providers: [HibpService, HibpProcessor],
  exports: [HibpService],
})
export class HibpModule {}
