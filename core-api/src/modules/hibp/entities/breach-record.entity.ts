import { BaseEntity } from '@/common/entities/base.entity';
import { Column, Entity, Index } from 'typeorm';

export interface HibpBreach {
  // HIBP API v3 returns PascalCase; we normalise to camelCase on ingest
  name: string;
  domain: string;
  breachDate: string;
  addedDate: string;
  dataClasses: string[];
  pwnCount: number;
  isVerified: boolean;
  // Raw PascalCase fields present on the API response before normalisation
  Name?: string;
  Domain?: string;
  BreachDate?: string;
  AddedDate?: string;
  DataClasses?: string[];
  PwnCount?: number;
  IsVerified?: boolean;
}

@Entity('breach_records')
@Index(['targetId'])
export class BreachRecord extends BaseEntity {
  @Column()
  targetId: string;

  @Column()
  domain: string;

  @Column({ type: 'jsonb', default: [] })
  breaches: HibpBreach[];

  @Column({ type: 'int', default: 0 })
  breachCount: number;

  @Column({ type: 'timestamp' })
  checkedAt: Date;

  @Column({ default: false })
  hasNewBreaches: boolean;
}
