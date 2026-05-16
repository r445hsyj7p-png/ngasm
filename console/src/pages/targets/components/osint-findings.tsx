import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { axiosInstance } from '@/services/apis/axios-client';
import { useQuery } from '@tanstack/react-query';
import { Globe, Loader2, Mail, MapPin, Network, User } from 'lucide-react';
import type { ReactNode } from 'react';

interface OsintFinding {
  id: string;
  type: 'email' | 'person' | 'virtual_host' | 'ip_range' | 'subdomain';
  value: string;
  source?: string;
  context?: string;
}

interface OsintCounts {
  email: number;
  person: number;
  virtual_host: number;
  ip_range: number;
  subdomain: number;
  total: number;
}

interface OsintFindingsProps {
  targetId: string;
}

const TYPE_META: Record<OsintFinding['type'], { label: string; icon: ReactNode; color: string }> = {
  email: { label: 'Email', icon: <Mail className="h-4 w-4" />, color: 'text-blue-500' },
  person: { label: 'Person', icon: <User className="h-4 w-4" />, color: 'text-purple-500' },
  virtual_host: { label: 'Virtual Host', icon: <Globe className="h-4 w-4" />, color: 'text-green-500' },
  ip_range: { label: 'IP Range', icon: <Network className="h-4 w-4" />, color: 'text-orange-500' },
  subdomain: { label: 'Subdomain', icon: <MapPin className="h-4 w-4" />, color: 'text-cyan-500' },
};

export function OsintFindings({ targetId }: OsintFindingsProps) {
  const { data: counts, isLoading: loadingCounts } = useQuery({
    queryKey: ['osint-counts', targetId],
    queryFn: () =>
      axiosInstance
        .get<OsintCounts>(`/api/osint/target/${targetId}/counts`)
        .then((r) => r.data),
    enabled: !!targetId,
  });

  const { data: findings, isLoading: loadingFindings } = useQuery({
    queryKey: ['osint-findings', targetId],
    queryFn: () =>
      axiosInstance
        .get<OsintFinding[]>(`/api/osint/target/${targetId}`)
        .then((r) => r.data),
    enabled: !!targetId,
  });

  if (loadingCounts || loadingFindings) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center items-center h-32">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!findings || findings.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No OSINT findings yet. Run theHarvester to discover emails, subdomains, and more.
        </CardContent>
      </Card>
    );
  }

  const grouped = findings.reduce<Record<string, OsintFinding[]>>((acc, f) => {
    if (!acc[f.type]) acc[f.type] = [];
    acc[f.type].push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {counts && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(Object.keys(TYPE_META) as OsintFinding['type'][]).map((type) => (
            <Card key={type} className="p-3">
              <div className="flex items-center gap-2">
                <span className={TYPE_META[type].color}>{TYPE_META[type].icon}</span>
                <div>
                  <p className="text-lg font-semibold">{counts[type] ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{TYPE_META[type].label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {(Object.keys(grouped) as OsintFinding['type'][]).map((type) => (
        <Card key={type}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className={TYPE_META[type]?.color}>{TYPE_META[type]?.icon}</span>
              {TYPE_META[type]?.label ?? type} ({grouped[type].length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {grouped[type].map((finding) => (
                <div key={finding.id} className="flex items-start gap-2 py-1 border-b last:border-0">
                  <span className="text-sm font-mono flex-1 break-all">{finding.value}</span>
                  {finding.source && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {finding.source}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
