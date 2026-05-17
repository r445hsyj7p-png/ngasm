import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface OtxResult {
  pulseCount: number;
  reputation: number;
  indicatorType: string;
  pulses: Array<{ id: string; name: string; created: string; tags: string[] }>;
}

interface OtxApiResponse {
  pulse_info?: {
    count?: number;
    pulses?: Array<Record<string, unknown>>;
  };
  reputation?: number;
}

interface OtxPulse {
  id?: unknown;
  name?: unknown;
  created?: unknown;
  tags?: unknown[];
}

@Injectable()
export class AlienVaultOtxProvider {
  private readonly logger = new Logger(AlienVaultOtxProvider.name);

  async lookup(value: string, type: 'IPv4' | 'domain', apiKey?: string): Promise<OtxResult | null> {
    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (apiKey) headers['X-OTX-API-KEY'] = apiKey;

      const { data } = await axios.get<OtxApiResponse>(
        `https://otx.alienvault.com/api/v1/indicators/${type}/${value}/general`,
        { headers, timeout: 10000 },
      );

      const rawPulses: OtxPulse[] = (data?.pulse_info?.pulses ?? []) as OtxPulse[];
      return {
        pulseCount: data?.pulse_info?.count ?? 0,
        reputation: data?.reputation ?? 0,
        indicatorType: type,
        pulses: rawPulses.slice(0, 10).map((p) => ({
          id: typeof p.id === 'string' ? p.id : '',
          name: typeof p.name === 'string' ? p.name : '',
          created: typeof p.created === 'string' ? p.created : '',
          tags: Array.isArray(p.tags) ? p.tags.map(String) : [],
        })),
      };
    } catch (err) {
      this.logger.warn(`OTX lookup failed for ${value}: ${String(err)}`);
      return null;
    }
  }
}
