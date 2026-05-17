import { BaseEntity } from '@/common/entities/base.entity';
import { IntelSource } from '@/common/enums/enum';
import { Column, Entity, Index } from 'typeorm';

@Entity('intel_enrichments')
@Index(['assetId', 'source'], { unique: true })
export class IntelEnrichment extends BaseEntity {
  @Column()
  assetId: string;

  @Column({ type: 'enum', enum: IntelSource })
  source: IntelSource;

  @Column({ type: 'jsonb', default: {} })
  data: object;

  @Column({ type: 'int', nullable: true })
  abuseScore?: number;

  @Column({ nullable: true })
  greynoiseClassification?: string;

  @Column({ type: 'int', default: 0 })
  otxPulseCount: number;

  @Column({ type: 'timestamp' })
  fetchedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;
}
