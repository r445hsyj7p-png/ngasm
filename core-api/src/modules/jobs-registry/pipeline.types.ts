import { ToolCategory } from '@/common/enums/enum';

export enum ScanPhase {
  P1_DISCOVERY = 'P1_DISCOVERY',
  P2_PORT_SCAN = 'P2_PORT_SCAN',
  P4_HTTP_PROBE = 'P4_HTTP_PROBE',
  P5_VULN_SCAN = 'P5_VULN_SCAN',
  P3_TLS = 'P3_TLS',
  P6_MCP_ANALYSIS = 'P6_MCP_ANALYSIS',
}

export const PHASE_META: Record<ScanPhase, { label: string; tool: string; order: number }> = {
  [ScanPhase.P1_DISCOVERY]: { label: 'Discovery', tool: 'subfinder', order: 1 },
  [ScanPhase.P2_PORT_SCAN]: { label: 'Port Scan', tool: 'naabu', order: 2 },
  [ScanPhase.P3_TLS]: { label: 'TLS Analysis', tool: 'sslyze', order: 3 },
  [ScanPhase.P4_HTTP_PROBE]: { label: 'HTTP Probe', tool: 'httpx', order: 4 },
  [ScanPhase.P5_VULN_SCAN]: { label: 'Vuln Scan', tool: 'nuclei', order: 5 },
  [ScanPhase.P6_MCP_ANALYSIS]: { label: 'MCP Analysis', tool: 'ramparts', order: 6 },
};

export const CATEGORY_TO_PHASE: Partial<Record<ToolCategory, ScanPhase>> = {
  [ToolCategory.SUBDOMAINS]: ScanPhase.P1_DISCOVERY,
  [ToolCategory.PORTS_SCANNER]: ScanPhase.P2_PORT_SCAN,
  [ToolCategory.HTTP_PROBE]: ScanPhase.P4_HTTP_PROBE,
  [ToolCategory.VULNERABILITIES]: ScanPhase.P5_VULN_SCAN,
};

export interface PhaseStatus {
  phase: ScanPhase;
  label: string;
  tool: string;
  order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'not_available';
  jobCount: number;
  completedCount: number;
  failedCount: number;
}
