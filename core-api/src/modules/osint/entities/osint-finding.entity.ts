import { BaseEntity } from '@/common/entities/base.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Target } from '../../targets/entities/target.entity';

export enum OsintType {
  EMAIL = 'email',
  PERSON = 'person',
  VIRTUAL_HOST = 'virtual_host',
  IP_RANGE = 'ip_range',
  SUBDOMAIN = 'subdomain',
}

@Entity('osint_findings')
@Index(['targetId'])
export class OsintFinding extends BaseEntity {
  @ApiProperty({ enum: OsintType })
  @Column({ type: 'enum', enum: OsintType })
  type: OsintType;

  @ApiProperty()
  @Column('text')
  value: string;

  @ApiPropertyOptional()
  @Column('text', { nullable: true })
  source?: string;

  @ApiPropertyOptional()
  @Column('text', { nullable: true })
  context?: string;

  @ApiProperty()
  @Column({ type: 'uuid' })
  targetId: string;

  @ManyToOne(() => Target, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'targetId' })
  target: Target;
}
