import { BaseEntity } from '@/common/entities/base.entity';
import { Column, Entity, Index } from 'typeorm';

export interface HibpBreach {
  name: string;
  domain: string;
  breachDate: string;
  addedDate: string;
  dataClasses: string[];
  pwnCount: number;
  isVerified: boolean;
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
