import { BullMQName } from '@/common/enums/enum';
import { SystemConfigsModule } from '@/modules/system-configs/system-configs.module';
import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { SlackChannel } from './channels/slack.channel';
import { NotificationRecipient } from './entities/notification-recipient.entity';
import { Notification } from './entities/notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsConsumer } from './processors/notifications.processor';
import { NotificationsService } from './notifications.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationRecipient, User]),
    BullModule.registerQueue({ name: BullMQName.NOTIFICATION }),
    SystemConfigsModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsConsumer, SlackChannel],
  exports: [NotificationsService],
})
export class NotificationsModule {}
