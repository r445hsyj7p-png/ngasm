import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, HelpCircle, XCircle } from 'lucide-react';

interface IpReputationBadgeProps {
  abuseScore?: number;
  greynoiseClassification?: string;
  className?: string;
}

export function IpReputationBadge({
  abuseScore,
  greynoiseClassification,
  className,
}: IpReputationBadgeProps) {
  if (abuseScore === undefined && !greynoiseClassification) return null;

  const isMalicious =
    greynoiseClassification === 'malicious' || (abuseScore !== undefined && abuseScore >= 70);
  const isSuspicious =
    !isMalicious &&
    greynoiseClassification !== 'benign' &&
    (greynoiseClassification === 'unknown' || (abuseScore !== undefined && abuseScore >= 30));

  if (isMalicious) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded',
          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          className,
        )}
      >
        <XCircle className="h-3 w-3" />
        {abuseScore !== undefined ? `${abuseScore}/100` : 'Malicious'}
      </span>
    );
  }

  if (isSuspicious) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded',
          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
          className,
        )}
      >
        <AlertTriangle className="h-3 w-3" />
        {abuseScore !== undefined ? `${abuseScore}/100` : 'Suspicious'}
      </span>
    );
  }

  if (greynoiseClassification === 'benign' || abuseScore === 0) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded',
          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          className,
        )}
      >
        <CheckCircle2 className="h-3 w-3" />
        Clean
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded',
        'bg-muted text-muted-foreground',
        className,
      )}
    >
      <HelpCircle className="h-3 w-3" />
      Unknown
    </span>
  );
}
