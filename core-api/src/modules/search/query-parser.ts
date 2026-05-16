export type FilterOperator = 'eq' | 'in' | 'gte' | 'lte' | 'gt' | 'lt' | 'between' | 'exists' | 'like' | 'cidr';

export type FilterField =
  | 'severity' | 'tool' | 'cvss' | 'epss' | 'status'
  | 'has' | 'age' | 'port' | 'ip' | 'subdomain' | 'cve' | 'cat';

export interface ParsedToken {
  field: FilterField;
  op: FilterOperator;
  value: string | number | string[];
  negated: boolean;
  raw: string;
}

export interface ParsedQuery {
  tokens: ParsedToken[];
  freetext: string;
}

export class QueryParser {
  /**
   * Parses a search query string into structured tokens.
   * Tokens: field:value, -field:value (negated), free text
   * Examples:
   *   "severity:critical has:cve" → 2 tokens
   *   "cvss:>=9 status:open" → 2 tokens
   *   "hello world" → freetext="hello world"
   */
  parse(query: string): ParsedQuery {
    const tokens: ParsedToken[] = [];
    const freetextParts: string[] = [];

    // Match token:value or -token:value patterns
    const tokenRegex = /(-?)(\w+):([^\s]+)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(query)) !== null) {
      // Capture free text between tokens
      const before = query.slice(lastIndex, match.index).trim();
      if (before) freetextParts.push(before);
      lastIndex = match.index + match[0].length;

      const negated = match[1] === '-';
      const field = match[2].toLowerCase() as FilterField;
      const rawValue = match[3];

      const token = this.parseToken(field, rawValue, negated, match[0]);
      if (token) tokens.push(token);
    }

    // Capture remaining free text
    const remaining = query.slice(lastIndex).trim();
    if (remaining) freetextParts.push(remaining);

    return {
      tokens,
      freetext: freetextParts.join(' ').trim(),
    };
  }

  private parseToken(
    field: FilterField,
    rawValue: string,
    negated: boolean,
    raw: string,
  ): ParsedToken | null {
    switch (field) {
      case 'severity':
      case 'status':
      case 'tool':
      case 'cat':
      case 'subdomain':
        // Multi-value: severity:critical,high → in operator
        if (rawValue.includes(',')) {
          return { field, op: 'in', value: rawValue.split(','), negated, raw };
        }
        return { field, op: 'eq', value: rawValue, negated, raw };

      case 'cvss':
      case 'epss': {
        // Operators: >=9, <=7, >8, <5, 7..10
        const rangeMatch = rawValue.match(/^(\d+(?:\.\d+)?)\.\.(\d+(?:\.\d+)?)$/);
        if (rangeMatch) {
          return { field, op: 'between', value: [rangeMatch[1], rangeMatch[2]], negated, raw };
        }
        const opMatch = rawValue.match(/^(>=|<=|>|<)(\d+(?:\.\d+)?)$/);
        if (opMatch) {
          const opMap: Record<string, FilterOperator> = { '>=': 'gte', '<=': 'lte', '>': 'gt', '<': 'lt' };
          return { field, op: opMap[opMatch[1]], value: parseFloat(opMatch[2]), negated, raw };
        }
        return { field, op: 'eq', value: parseFloat(rawValue), negated, raw };
      }

      case 'age': {
        // age:<7 (younger than 7 days), age:>30
        const opMatch = rawValue.match(/^(>=|<=|>|<)(\d+)$/);
        if (opMatch) {
          const opMap: Record<string, FilterOperator> = { '>=': 'gte', '<=': 'lte', '>': 'gt', '<': 'lt' };
          return { field, op: opMap[opMatch[1]], value: parseInt(opMatch[2], 10), negated, raw };
        }
        return null;
      }

      case 'has':
        // has:cve, has:kev → exists check on specific field
        return { field, op: 'exists', value: rawValue, negated, raw };

      case 'port':
        return { field, op: 'eq', value: rawValue, negated, raw };

      case 'ip':
        // CIDR or exact
        return { field, op: rawValue.includes('/') ? 'cidr' : 'eq', value: rawValue, negated, raw };

      case 'cve':
        return { field, op: 'like', value: rawValue.toUpperCase(), negated, raw };

      default:
        return null;
    }
  }
}
