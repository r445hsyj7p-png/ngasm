import { BaseEntity } from '@/common/entities/base.entity';
import { IntelSource } from '@/common/enums/enum';
import { Column, Entity } from 'typeorm';

@Entity('intel_feed_configs')
export class IntelFeedConfig extends BaseEntity {
  @Column({ type: 'enum', enum: IntelSource, unique: true })
  source: IntelSource;

  @Column({ default: false })
  enabled: boolean;

  @Column({ nullable: true })
  apiKey?: string;

  @Column({ nullable: true })
  baseUrl?: string;

  @Column({ type: 'int', default: 1440 })
  cacheTtlMinutes: number;
}
