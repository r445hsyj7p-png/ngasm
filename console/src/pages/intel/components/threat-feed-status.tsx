import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { axiosInstance } from '@/services/apis/axios-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface FeedConfig {
  source: string;
  enabled: boolean;
  hasApiKey: boolean;
  cacheTtlMinutes: number;
}

interface FeedConfigUpdate {
  enabled?: boolean;
  apiKey?: string;
  cacheTtlMinutes?: number;
}

const SOURCE_META: Record<string, { label: string; description: string; needsKey: boolean }> = {
  greynoise: {
    label: 'GreyNoise',
    description: 'Internet scanner & noise classification. Free community tier available.',
    needsKey: false,
  },
  abuseipdb: {
    label: 'AbuseIPDB',
    description: 'IP abuse confidence scoring. 1000 checks/day on free tier.',
    needsKey: true,
  },
  alienvault_otx: {
    label: 'AlienVault OTX',
    description: 'Threat intelligence pulses for IPs and domains.',
    needsKey: false,
  },
};

export function ThreatFeedStatus() {
  const queryClient = useQueryClient();
  const [editKeys, setEditKeys] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  const { data: feeds, isLoading } = useQuery({
    queryKey: ['intel-feeds'],
    queryFn: () => axiosInstance.get<FeedConfig[]>('/api/intel/feeds').then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { source: string; data: FeedConfigUpdate }) =>
      axiosInstance.put(`/api/intel/feeds/${payload.source}`, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intel-feeds'] });
      toast.success('Feed configuration updated');
    },
    onError: () => toast.error('Failed to update feed configuration'),
  });

  const handleToggle = (feed: FeedConfig, enabled: boolean) => {
    updateMutation.mutate({ source: feed.source, data: { enabled } });
  };

  const handleSaveKey = (feed: FeedConfig) => {
    const key = editKeys[feed.source];
    if (!key) return;
    updateMutation.mutate({ source: feed.source, data: { apiKey: key } });
    setEditKeys((prev) => ({ ...prev, [feed.source]: '' }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feeds?.map((feed) => {
        const meta = SOURCE_META[feed.source] ?? { label: feed.source, description: '', needsKey: true };
        return (
          <Card key={feed.source}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{meta.label}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">{meta.description}</p>
                </div>
                <Switch
                  checked={feed.enabled}
                  onCheckedChange={(v) => handleToggle(feed, v)}
                  disabled={updateMutation.isPending}
                />
              </div>
            </CardHeader>
            {feed.enabled && (
              <CardContent className="pt-0">
                {feed.hasApiKey && !editKeys[feed.source] && (
                  <p className="text-xs text-green-600 mb-2">✓ API key configured</p>
                )}
                <div className="flex gap-2 items-center">
                  <Input
                    type={showKey[feed.source] ? 'text' : 'password'}
                    placeholder={feed.hasApiKey ? 'Replace existing API key…' : `${meta.label} API Key ${meta.needsKey ? '(required)' : '(optional)'}`}
                    value={editKeys[feed.source] ?? ''}
                    onChange={(e) =>
                      setEditKeys((prev) => ({ ...prev, [feed.source]: e.target.value }))
                    }
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowKey((p) => ({ ...p, [feed.source]: !p[feed.source] }))}
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    disabled={!editKeys[feed.source]}
                    onClick={() => handleSaveKey(feed)}
                  >
                    Save
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
