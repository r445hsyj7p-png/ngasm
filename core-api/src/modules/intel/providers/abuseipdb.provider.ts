import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface AbuseIpDbResult {
  ipAddress: string;
  abuseConfidenceScore: number;
  countryCode: string;
  usageType?: string;
  isp?: string;
  domain?: string;
  totalReports: number;
  lastReportedAt?: string;
  isWhitelisted?: boolean;
}

@Injectable()
export class AbuseIpDbProvider {
  private readonly logger = new Logger(AbuseIpDbProvider.name);

  async check(ip: string, apiKey: string): Promise<AbuseIpDbResult | null> {
    if (!apiKey) return null;
    try {
      const { data } = await axios.get<{ data: AbuseIpDbResult }>(
        'https://api.abuseipdb.com/api/v2/check',
        {
          params: { ipAddress: ip, maxAgeInDays: 90 },
          headers: { Key: apiKey, Accept: 'application/json' },
          timeout: 10000,
        },
      );
      return data.data;
    } catch (err) {
      this.logger.warn(`AbuseIPDB check failed for ${ip}: ${err}`);
      return null;
    }
  }
}
