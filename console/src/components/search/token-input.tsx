import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import React from 'react';

const FILTER_FIELDS = ['severity', 'tool', 'cvss', 'epss', 'status', 'has', 'age', 'port', 'ip', 'subdomain', 'cve', 'cat'] as const;

type FilterField = typeof FILTER_FIELDS[number];

interface Token {
  field: FilterField;
  value: string;
  negated: boolean;
  raw: string;
}

function parseTokens(query: string): { tokens: Token[]; freetext: string } {
  const tokens: Token[] = [];
  const freetextParts: string[] = [];
  const tokenRegex = /(-?)(\w+):([^\s]+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(query)) !== null) {
    const before = query.slice(lastIndex, match.index).trim();
    if (before) freetextParts.push(before);

    const [raw, neg, field, value] = match;
    if (FILTER_FIELDS.includes(field as FilterField)) {
      tokens.push({
        field: field as FilterField,
        value,
        negated: neg === '-',
        raw,
      });
    } else {
      freetextParts.push(raw);
    }
    lastIndex = match.index + raw.length;
  }

  const trailing = query.slice(lastIndex).trim();
  if (trailing) freetextParts.push(trailing);

  return { tokens, freetext: freetextParts.join(' ') };
}

const FIELD_COLORS: Record<FilterField, string> = {
  severity: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400',
  tool: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
  cvss: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400',
  epss: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400',
  status: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400',
  has: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400',
  age: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400',
  port: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400',
  ip: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400',
  subdomain: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400',
  cve: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400',
  cat: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
};

interface TokenInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function TokenInput({ value, onChange, onSearch, placeholder, className }: TokenInputProps) {
  const { tokens, freetext } = parseTokens(value);
  const hasTokens = tokens.length > 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch(value);
    }
  };

  return (
    <div className={cn('relative', className)}>
      {hasTokens && (
        <div className="flex flex-wrap gap-1 px-3 pt-2 pb-1 border rounded-t-md border-b-0 bg-background">
          {tokens.map((token, i) => (
            <Badge
              key={i}
              variant="outline"
              className={cn('text-xs font-mono gap-1', FIELD_COLORS[token.field])}
            >
              {token.negated && <span className="opacity-60">NOT</span>}
              <span className="font-semibold">{token.field}:</span>
              <span>{token.value}</span>
            </Badge>
          ))}
        </div>
      )}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? 'Search... (e.g. severity:critical cvss:>=9)'}
        className={cn(hasTokens && 'rounded-t-none border-t-0')}
      />
      {hasTokens && freetext && (
        <p className="text-xs text-muted-foreground mt-1 px-1">
          Free text: <span className="font-medium">{freetext}</span>
        </p>
      )}
    </div>
  );
}
