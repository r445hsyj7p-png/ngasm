import { Injectable, Logger } from '@nestjs/common';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#FF0000',
  high: '#FF6600',
  medium: '#FFA500',
  low: '#0099CC',
  info: '#808080',
};

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];

@Injectable()
export class SlackChannel {
  private readonly logger = new Logger(SlackChannel.name);

  meetsThreshold(severity: string, threshold: string): boolean {
    const sev = severity.toLowerCase();
    const thr = threshold.toLowerCase();
    return SEVERITY_ORDER.indexOf(sev) <= SEVERITY_ORDER.indexOf(thr);
  }

  async send(webhookUrl: string, payload: {
    title: string;
    severity: string;
    workspace?: string;
    asset?: string;
    message?: string;
  }): Promise<void> {
    const color = SEVERITY_COLORS[payload.severity.toLowerCase()] ?? '#808080';
    const body = {
      attachments: [{
        color,
        title: `[${payload.severity.toUpperCase()}] ${payload.title}`,
        fields: [
          ...(payload.workspace ? [{ title: 'Workspace', value: payload.workspace, short: true }] : []),
          ...(payload.asset ? [{ title: 'Asset', value: payload.asset, short: true }] : []),
          ...(payload.message ? [{ title: 'Details', value: payload.message, short: false }] : []),
        ],
        footer: 'OASM Platform',
        ts: Math.floor(Date.now() / 1000),
      }],
    };

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        this.logger.warn(`Slack webhook returned ${res.status}`);
      }
    } catch (err) {
      this.logger.error(`Slack webhook failed: ${err}`);
    }
  }
}
