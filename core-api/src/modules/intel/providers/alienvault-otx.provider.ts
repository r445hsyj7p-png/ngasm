import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface OtxResult {
  pulseCount: number;
  reputation: number;
  indicatorType: string;
  pulses: Array<{ id: string; name: string; created: string; tags: string[] }>;
}

@Injectable()
export class AlienVaultOtxProvider {
  private readonly logger = new Logger(AlienVaultOtxProvider.name);

  async lookup(value: string, type: 'IPv4' | 'domain', apiKey?: string): Promise<OtxResult | null> {
    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (apiKey) headers['X-OTX-API-KEY'] = apiKey;

      const { data } = await axios.get(
        `https://otx.alienvault.com/api/v1/indicators/${type}/${value}/general`,
        { headers, timeout: 10000 },
      );

      const pulses = data?.pulse_info?.pulses ?? [];
      return {
        pulseCount: data?.pulse_info?.count ?? 0,
        reputation: data?.reputation ?? 0,
        indicatorType: type,
        pulses: pulses.slice(0, 10).map((p: Record<string, unknown>) => ({
          id: p.id,
          name: p.name,
          created: p.created,
          tags: p.tags ?? [],
        })),
      };
    } catch (err) {
      this.logger.warn(`OTX lookup failed for ${value}: ${err}`);
      return null;
    }
  }
}
