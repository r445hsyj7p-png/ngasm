import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface GreynoiseResult {
  ip: string;
  noise: boolean;
  riot: boolean;
  classification?: 'malicious' | 'benign' | 'unknown';
  name?: string;
  link?: string;
  lastSeen?: string;
  message?: string;
}

@Injectable()
export class GreynoiseProvider {
  private readonly logger = new Logger(GreynoiseProvider.name);

  async lookup(ip: string, apiKey: string): Promise<GreynoiseResult | null> {
    try {
      // Authenticated customers get the enterprise context endpoint; community is unauthenticated-only
      const url = apiKey
        ? `https://api.greynoise.io/v3/noise/context/${ip}`
        : `https://api.greynoise.io/v3/community/${ip}`;

      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (apiKey) headers['key'] = apiKey;

      const { data } = await axios.get<GreynoiseResult>(url, { headers, timeout: 10000 });
      return data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return { ip, noise: false, riot: false, classification: 'unknown', message: 'not found' };
      }
      this.logger.warn(`GreyNoise lookup failed for ${ip}: ${String(err)}`);
      return null;
    }
  }
}
