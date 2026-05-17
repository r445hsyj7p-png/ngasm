import { BullMQName, NotificationStatus, NotificationType } from '@/common/enums/enum';
import { User } from '@/modules/auth/entities/user.entity';
import { SystemConfigsService } from '@/modules/system-configs/system-configs.service';
import { RedisService } from '@/services/redis/redis.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { In, Repository } from 'typeorm';
import { SlackChannel } from '../channels/slack.channel';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { NotificationRecipient } from '../entities/notification-recipient.entity';
import { Notification } from '../entities/notification.entity';

@Processor(BullMQName.NOTIFICATION)
export class NotificationsConsumer extends WorkerHost {
  constructor(
    private readonly redisService: RedisService,
    private readonly slackChannel: SlackChannel,
    private readonly systemConfigsService: SystemConfigsService,
    @InjectRepository(Notification)
    private notificationRepo: Repository<Notification>,
    @InjectRepository(NotificationRecipient)
    private notificationRecipientRepo: Repository<NotificationRecipient>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {
    super();
  }

  async process(job: Job<CreateNotificationDto>): Promise<void> {
    const { recipients, scope, metadata, type, workspaceId } = job.data;

    const notification = await this.notificationRepo.save({
      scope,
      type,
      workspace: { id: workspaceId },
      metadata,
    });

    const users = await this.userRepo.findBy({ id: In(recipients) });

    const recipientEntities: Partial<NotificationRecipient>[] = [];
    for (const user of users) {
      recipientEntities.push({
        notificationId: notification.id,
        userId: user.id,
        status: NotificationStatus.SENT,
      });
    }

    if (recipientEntities.length > 0) {
      await this.notificationRecipientRepo.save(recipientEntities);
      for (const user of users) {
        await this.redisService.publisher.publish(
          `notification:${user.id}`,
          JSON.stringify({ notificationId: notification.id, scope, metadata }),
        );
      }
    }

    // Slack dispatch for vulnerability notifications
    if (type === NotificationType.VULNERABILITY_ANALYSIS_COMPLETED) {
      try {
        const slackCfg = await this.systemConfigsService.getSlackConfig();
        const eventSeverity = (metadata?.severity) ?? 'info';
        if (
          slackCfg.slackEnabled &&
          slackCfg.slackWebhookUrl &&
          this.slackChannel.meetsThreshold(eventSeverity, slackCfg.slackAlertThreshold ?? 'info')
        ) {
          await this.slackChannel.send(slackCfg.slackWebhookUrl, {
            title: metadata?.name
              ? `Vulnerability analysis completed for ${String(metadata.name)}`
              : 'Vulnerability analysis completed',
            severity: eventSeverity,
            workspace: workspaceId,
          });
        }
      } catch {
        // Slack errors must not block notification processing
      }
    }
  }
}
