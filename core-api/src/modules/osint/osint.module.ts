import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OsintFinding } from './entities/osint-finding.entity';
import { OsintController } from './osint.controller';
import { OsintService } from './osint.service';

@Module({
  imports: [TypeOrmModule.forFeature([OsintFinding])],
  controllers: [OsintController],
  providers: [OsintService],
  exports: [OsintService],
})
export class OsintModule {}
