import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { axiosInstance } from '@/services/apis/axios-client';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';

interface PhaseStatus {
  phase: string;
  label: string;
  tool: string;
  order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'not_available';
  jobCount: number;
  completedCount: number;
  failedCount: number;
}

interface PipelineProgressProps {
  targetId: string;
}

function PhaseIcon({ status }: { status: PhaseStatus['status'] }) {
  if (status === 'completed') return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  if (status === 'in_progress') return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
  if (status === 'failed') return <XCircle className="h-5 w-5 text-red-500" />;
  return <Circle className="h-5 w-5 text-muted-foreground" />;
}

function phaseBadgeVariant(status: PhaseStatus['status']): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'completed') return 'default';
  if (status === 'in_progress') return 'secondary';
  if (status === 'failed') return 'destructive';
  return 'outline';
}

function phaseBadgeLabel(status: PhaseStatus['status']): string {
  if (status === 'completed') return 'Done';
  if (status === 'in_progress') return 'Running';
  if (status === 'failed') return 'Failed';
  if (status === 'pending') return 'Pending';
  return 'N/A';
}

export function PipelineProgress({ targetId }: PipelineProgressProps) {
  const { data: latestHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ['latest-job-history', targetId],
    queryFn: () =>
      axiosInstance
        .get<{ id: string } | null>(`/api/jobs-registry/target/${targetId}/latest-history`)
        .then((r) => r.data),
    refetchInterval: (query) => (query.state.data ? false : 5000),
    enabled: !!targetId,
  });

  const { data: phases, isLoading: loadingPhases } = useQuery({
    queryKey: ['pipeline-status', latestHistory?.id],
    queryFn: () =>
      axiosInstance
        .get<PhaseStatus[]>(`/api/jobs-registry/pipeline/${latestHistory!.id}`)
        .then((r) => r.data),
    refetchInterval: (query) => {
      const data = query.state.data as PhaseStatus[] | undefined;
      if (!data) return 5000;
      const isActive = data.some((p) => p.status === 'in_progress' || p.status === 'pending');
      return isActive ? 5000 : false;
    },
    enabled: !!latestHistory?.id,
  });

  if (loadingHistory || loadingPhases) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center items-center h-32">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!latestHistory) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No scan history found. Start a discovery to see pipeline progress.
        </CardContent>
      </Card>
    );
  }

  const activePhasesCount = phases?.filter((p) => p.status !== 'not_available').length ?? 0;
  const completedCount = phases?.filter((p) => p.status === 'completed').length ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Scan Pipeline</CardTitle>
          {activePhasesCount > 0 && (
            <span className="text-sm text-muted-foreground">
              {completedCount}/{activePhasesCount} phases complete
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {phases?.map((phase) => (
            <div
              key={phase.phase}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                phase.status === 'not_available' ? 'opacity-40' : ''
              }`}
            >
              <PhaseIcon status={phase.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{phase.label}</span>
                  <span className="text-xs text-muted-foreground">({phase.tool})</span>
                </div>
                {phase.jobCount > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {phase.completedCount}/{phase.jobCount} jobs
                    {phase.failedCount > 0 && `, ${phase.failedCount} failed`}
                  </p>
                )}
              </div>
              <Badge variant={phaseBadgeVariant(phase.status)} className="shrink-0">
                {phaseBadgeLabel(phase.status)}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
