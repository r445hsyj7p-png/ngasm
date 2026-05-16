import { IpReputationBadge } from '@/components/ui/ip-reputation-badge';
import { axiosInstance } from '@/services/apis/axios-client';
import { useWorkspaceState } from '@/hooks/useWorkspaceSelector';
import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface IntelEnrichment {
  id: string;
  assetId: string;
  source: string;
  data: Record<string, unknown>;
  abuseScore?: number;
  greynoiseClassification?: string;
  otxPulseCount: number;
  fetchedAt: string;
}

interface AssetWithEnrichment {
  assetId: string;
  assetValue: string;
  enrichments: IntelEnrichment[];
}

interface IpReputationPanelProps {
  targetId?: string;
}

export function IpReputationPanel({ targetId }: IpReputationPanelProps) {
  const {
    state: { selectedWorkspaceId },
  } = useWorkspaceState();

  const { data: assets, isLoading } = useQuery({
    queryKey: ['assets-for-intel', targetId, selectedWorkspaceId],
    queryFn: () =>
      axiosInstance
        .get<{ data: Array<{ id: string; value: string }> }>('/api/assets', {
          params: { workspaceId: selectedWorkspaceId, targetIds: targetId ? [targetId] : undefined, limit: 50 },
        })
        .then((r) => r.data.data),
    enabled: !!selectedWorkspaceId,
  });

  const assetIds = assets?.map((a) => a.id) ?? [];

  const { data: enrichments, isLoading: loadingEnrichments, refetch } = useQuery({
    queryKey: ['intel-enrichments', assetIds],
    queryFn: async () => {
      const results: AssetWithEnrichment[] = [];
      for (const asset of assets ?? []) {
        const enrichmentList = await axiosInstance
          .get<IntelEnrichment[]>(`/api/intel/asset/${asset.id}`)
          .then((r) => r.data);
        if (enrichmentList.length) {
          results.push({ assetId: asset.id, assetValue: asset.value, enrichments: enrichmentList });
        }
      }
      return results;
    },
    enabled: assetIds.length > 0,
  });

  const handleEnrich = async (asset: { id: string; value: string }) => {
    try {
      await axiosInstance.post(`/api/intel/enrich/asset/${asset.id}`, { value: asset.value });
      toast.success(`Enrichment queued for ${asset.value}`);
      setTimeout(() => refetch(), 3000);
    } catch {
      toast.error('Failed to queue enrichment');
    }
  };

  if (isLoading || loadingEnrichments) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!enrichments?.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-3">
          <p className="text-muted-foreground">
            No enrichment data yet. Enable threat feeds in the Settings tab, then trigger enrichment.
          </p>
          {assets && assets.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              {assets.slice(0, 5).map((a) => (
                <Button key={a.id} variant="outline" size="sm" onClick={() => handleEnrich(a)}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Enrich {a.value}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {enrichments.map((item) => {
        const abuseEntry = item.enrichments.find((e) => e.source === 'abuseipdb');
        const gnEntry = item.enrichments.find((e) => e.source === 'greynoise');
        const otxEntry = item.enrichments.find((e) => e.source === 'alienvault_otx');

        return (
          <div
            key={item.assetId}
            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
          >
            <span className="font-mono text-sm flex-1">{item.assetValue}</span>
            <div className="flex items-center gap-2 shrink-0">
              {(abuseEntry || gnEntry) && (
                <IpReputationBadge
                  abuseScore={abuseEntry?.abuseScore}
                  greynoiseClassification={gnEntry?.greynoiseClassification}
                />
              )}
              {otxEntry && (otxEntry.otxPulseCount ?? 0) > 0 && (
                <span className="text-xs text-orange-600 font-medium">
                  {otxEntry.otxPulseCount} OTX pulses
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => handleEnrich({ id: item.assetId, value: item.assetValue })}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
