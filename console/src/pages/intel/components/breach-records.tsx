import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { axiosInstance } from '@/services/apis/axios-client';
import { useWorkspaceState } from '@/hooks/useWorkspaceSelector';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { AlertTriangle, Loader2, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface HibpBreach {
  name: string;
  domain: string;
  breachDate: string;
  dataClasses: string[];
  pwnCount: number;
  isVerified: boolean;
}

interface BreachRecord {
  id: string;
  targetId: string;
  domain: string;
  breaches: HibpBreach[];
  breachCount: number;
  checkedAt: string;
  hasNewBreaches: boolean;
}

interface Target {
  id: string;
  value: string;
}

export function BreachRecords() {
  const {
    state: { selectedWorkspaceId },
  } = useWorkspaceState();

  const { data: targets, isLoading: loadingTargets } = useQuery({
    queryKey: ['targets-for-hibp', selectedWorkspaceId],
    queryFn: () =>
      axiosInstance
        .get<{ data: Target[] }>('/api/targets', { params: { workspaceId: selectedWorkspaceId, limit: 50 } })
        .then((r) => r.data.data),
    enabled: !!selectedWorkspaceId,
  });

  const targetIds = targets?.map((t) => t.id) ?? [];

  const { data: breachRecords, isLoading: loadingBreaches, refetch } = useQuery({
    queryKey: ['breach-records', selectedWorkspaceId],
    queryFn: async () => {
      const settled = await Promise.all(
        (targets ?? []).map((target) =>
          axiosInstance
            .get<BreachRecord | null>(`/api/hibp/target/${target.id}`)
            .then((r) => (r.data ? { ...r.data, targetValue: target.value } : null))
            .catch(() => null),
        ),
      );
      return settled.filter((r): r is BreachRecord & { targetValue: string } => r !== null);
    },
    enabled: targetIds.length > 0,
  });

  const handleCheck = async (targetId: string, domain: string) => {
    try {
      await axiosInstance.post(`/api/hibp/target/${targetId}/check`, { domain });
      toast.success(`HIBP check queued for ${domain}`);
      void refetch();
    } catch {
      toast.error('Failed to queue HIBP check');
    }
  };

  if (loadingTargets || loadingBreaches) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const withBreaches = breachRecords?.filter((r) => r.breachCount > 0) ?? [];
  const clean = breachRecords?.filter((r) => r.breachCount === 0) ?? [];
  const unchecked = targets?.filter((t) => !breachRecords?.find((r) => r.targetId === t.id)) ?? [];

  return (
    <div className="space-y-4">
      {withBreaches.length > 0 && (
        <div className="space-y-3">
          {withBreaches.map((record) => (
            <Card key={record.id} className="border-red-200 dark:border-red-900/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-red-500" />
                    <CardTitle className="text-base">{record.targetValue}</CardTitle>
                    {record.hasNewBreaches && (
                      <Badge variant="destructive" className="text-xs">New</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{record.breachCount} breaches</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleCheck(record.targetId, record.domain)}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {record.breaches.map((breach) => (
                    <div key={breach.name} className="text-sm p-2 bg-muted/50 rounded-md">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{breach.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {dayjs(breach.breachDate).format('YYYY-MM-DD')}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {breach.dataClasses.slice(0, 5).map((dc) => (
                          <Badge key={dc} variant="outline" className="text-xs">
                            {dc}
                          </Badge>
                        ))}
                        {breach.dataClasses.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{breach.dataClasses.length - 5}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {breach.pwnCount.toLocaleString()} accounts affected
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Last checked {dayjs(record.checkedAt).fromNow()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {clean.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-sm font-medium">{clean.length} domain(s) — no breaches found</span>
            </div>
          </CardContent>
        </Card>
      )}

      {unchecked.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{unchecked.length} domain(s) not yet checked</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Requires INTEL_HIBP_API_KEY — get a free key at{' '}
              <span className="font-mono">haveibeenpwned.com/API/Key</span>
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {unchecked.slice(0, 5).map((t) => (
                <Button
                  key={t.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleCheck(t.id, t.value)}
                >
                  Check {t.value}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
