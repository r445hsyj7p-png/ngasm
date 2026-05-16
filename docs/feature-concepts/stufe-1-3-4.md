# Feature-Konzept: Stufe 1, 3 und 4

Basierend auf Analyse von `easm2` (Python/FastAPI/Celery) und `ngasm` (TypeScript/NestJS/Go/BullMQ).

---

## Tool-Status Übersicht (alle 13 Tools)

| Tool | Typ | Status | Stufe |
|------|-----|--------|-------|
| Subfinder | Binary | ✅ **Bereits integriert** | – |
| Naabu | Binary | ✅ **Bereits integriert** | – |
| HTTPX | Binary | ✅ **Bereits integriert** | – |
| Screenshot (via Rod) | Go | ✅ **Bereits integriert** | – |
| Nuclei | Binary | ✅ **Bereits integriert** | – |
| theHarvester | Python | ❌ Fehlt – neu | Stufe 1d (neu) |
| SSLyze | Python | ❌ Fehlt | Stufe 4a |
| Ramparts | Python | ❌ Fehlt | Stufe 4c |
| HIBP API | API | ❌ Fehlt | Stufe 3b |
| GreyNoise | API | ❌ Fehlt | Stufe 3a |
| AbuseIPDB | API | ❌ Fehlt | Stufe 3a |
| AlienVault OTX | API | ❌ Fehlt | Stufe 3a |
| MISP | API | ❌ Fehlt | Stufe 3a |
| SpyOnWeb | API | ❌ Fehlt | Stufe 3a |

**Korrekturen zum ursprünglichen Plan:**
- Naabu ist bereits in `built-in-tools.ts` integriert – kein Hinzufügen nötig
- Screenshots sind bereits via `ToolCategory.SCREENSHOT` + Go Rod implementiert – Stufe 4b entfällt
- theHarvester fehlte im Konzept vollständig – wird als Stufe 1d ergänzt
- SSLyze, Ramparts und theHarvester sind alle Python-Tools → gemeinsame Dockerfile-Strategie (siehe unten)

### Python-Tools Dockerfile-Strategie

Da SSLyze, theHarvester und Ramparts alle Python-basiert sind, werden sie **gemeinsam** in einem einzigen Dockerfile-Update installiert (nicht einzeln pro Stufe):

```dockerfile
# worker/Dockerfile – Stage 2 Runtime ergänzen:
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates bash chromium libpcap0.8 \
    python3 python3-pip \                    # Neu
    && pip3 install --no-cache-dir \
       theHarvester \                        # Stufe 1d
       sslyze \                              # Stufe 4a
    && rm -rf /var/lib/apt/lists/*
# Ramparts: Binary-Download via GitHub Releases (kein pip) – Stufe 4c
```

Diese Änderung am Dockerfile sollte **einmalig** vor Beginn von Stufe 1d vorgenommen werden.

---

## Stufe 1 – Quick Wins

---

### 1a. Slack Webhook Notifications

**Aktueller Stand in ngasm:**
- `NotificationsConsumer` verarbeitet BullMQ-Jobs aus der `notification`-Queue
- Dispatch läuft über Redis pub/sub auf `notification:{userId}`-Kanälen
- Scope: `SYSTEM | USER | GROUP` – keine externen Kanäle

**Was hinzukommt:**

#### Neues Entity-Feld (SystemConfig)
```typescript
// core-api/src/modules/system-configs/system-configs.entity.ts
// Neue Felder:
slackWebhookUrl?: string        // Workspace-weiter Default-Kanal
slackAlertThreshold?: 'CRITICAL' | 'HIGH' | 'MEDIUM'  // Mindestseverity
```

#### Neues Modul: Slack Channel
```
core-api/src/modules/notifications/
├── channels/
│   └── slack.channel.ts        // NEU – HTTP POST an Slack Webhook
├── notifications.consumer.ts   // ÄNDERN – Slack-Dispatch einhängen
└── dto/
    └── slack-config.dto.ts     // NEU
```

**`slack.channel.ts` – Kernlogik:**
```typescript
export class SlackChannel {
  async send(webhookUrl: string, payload: SlackPayload): Promise<void> {
    // Slack Block Kit Format
    const body = {
      blocks: [
        { type: 'header', text: { type: 'plain_text', text: `🔴 ${payload.severity}: ${payload.title}` } },
        { type: 'section', fields: [
          { type: 'mrkdwn', text: `*Asset:* ${payload.asset}` },
          { type: 'mrkdwn', text: `*Workspace:* ${payload.workspace}` },
        ]},
        { type: 'actions', elements: [
          { type: 'button', text: { type: 'plain_text', text: 'In App öffnen' }, url: payload.deepLink }
        ]}
      ]
    };
    await fetch(webhookUrl, { method: 'POST', body: JSON.stringify(body) });
  }
}
```

**Auslöser:** Vulnerability mit Severity >= Threshold wird erstellt  
→ `VulnerabilitiesService` feuert Event  
→ `NotificationsConsumer` prüft Workspace-Config  
→ `SlackChannel.send()` wenn URL konfiguriert

**Geänderte Dateien:**
| Datei | Änderung |
|-------|----------|
| `system-configs.entity.ts` | `slackWebhookUrl`, `slackAlertThreshold` hinzufügen |
| `notifications.consumer.ts` | Slack-Dispatch nach internem Dispatch einbauen |
| `console/src/pages/settings/settings.tsx` | Slack-Config UI (Input + Test-Button) |

**Neue Env-Var:** keine (URL wird in DB gespeichert, per Workspace konfigurierbar)

---

### 1b. Erweiterte Such-Syntax (Token-Filter)

**Aktueller Stand in ngasm:**
- Hybrid-Suche über Assets + Targets mit proportionaler Slot-Verteilung
- Einfaches LIKE-Matching auf Textwerten
- Such-History mit Deduplication

**Was hinzukommt:** Token-basierter Query-Parser mit 12 Filterfeldern (analog easm2 `search.py`)

#### Neue Dateien
```
core-api/src/modules/search/
├── query-parser.ts             // NEU – Tokenizer
├── query-builder.ts            // NEU – TypeORM-Filter-Konstruktor
└── search.service.ts           // ÄNDERN – Parser integrieren

console/src/
├── components/search/
│   ├── token-input.tsx         // NEU – Input mit farbiger Token-Hervorhebung
│   └── syntax-help.tsx         // NEU – Inline-Hilfe-Overlay
└── pages/search/search.tsx     // ÄNDERN – neues Input-Widget einbauen
```

#### `query-parser.ts` – Token-Grammatik
```typescript
export type TokenFilter = {
  field: 'severity' | 'tool' | 'cvss' | 'epss' | 'status' | 'has' |
         'age' | 'port' | 'ip' | 'subdomain' | 'cve' | 'cat';
  op: 'eq' | 'in' | 'gte' | 'lte' | 'between' | 'exists' | 'like' | 'cidr';
  value: string | number | string[];
  negated: boolean;
};

// Beispiel-Parsing:
// "severity:critical has:kev cvss:>=9"
// → [
//     { field: 'severity', op: 'in',     value: ['critical'],  negated: false },
//     { field: 'has',      op: 'exists', value: 'kev',         negated: false },
//     { field: 'cvss',     op: 'gte',    value: 9,             negated: false },
//   ]
```

#### Unterstützte Filter
| Syntax | Beschreibung | Beispiel |
|--------|-------------|---------|
| `severity:x` | Severity-Filter | `severity:critical,high` |
| `tool:x` | Tool-Quelle | `tool:nuclei` |
| `cvss:>=x` | CVSS-Score Operator | `cvss:>=9` |
| `epss:>=x` | EPSS-Score Operator | `epss:>=0.9` |
| `status:x` | Finding-Status | `status:open` |
| `has:x` | Flag-Check | `has:cve`, `has:kev` |
| `age:<x` | Alter in Tagen | `age:<7` |
| `port:x` | Port-Filter | `port:6274` |
| `ip:x` | IP/CIDR | `ip:10.0.0.0/24` |
| `subdomain:x` | Subdomain-Pattern | `subdomain:*.example.de` |
| `cve:x` | CVE-ID | `cve:CVE-2024-3400` |
| `cat:x` | Kategorie | `cat:mcp` |

#### `token-input.tsx` – Token-Farben
```typescript
const TOKEN_COLORS: Record<string, string> = {
  severity: 'bg-red-100 text-red-800',
  cvss:     'bg-orange-100 text-orange-800',
  tool:     'bg-blue-100 text-blue-800',
  has:      'bg-purple-100 text-purple-800',
  ip:       'bg-green-100 text-green-800',
  cve:      'bg-yellow-100 text-yellow-800',
  // ... weitere
};
```

**Rückwärtskompatibel:** Freitext ohne Tokens funktioniert wie bisher (LIKE-Matching).

---

### 1c. Scan-Pipeline Visualisierung

**Aktueller Stand in ngasm:**
- `JobsRegistry` trackt Jobs mit Status `PENDING | IN_PROGRESS | COMPLETED | FAILED | CANCELLED`
- `ToolCategory`-Enum: `SUBDOMAINS`, `HTTP_PROBE`, `PORTS_SCANNER`, `VULNERABILITIES`
- Kein strukturiertes Phasen-Konzept im Frontend

**Was hinzukommt:** 6-Phasen-Modell als UI-Concept (Datenbasis bereits vorhanden)

#### Phasen-Definition
```typescript
// core-api/src/modules/jobs-registry/pipeline.types.ts  (NEU)

export enum ScanPhase {
  P1_DISCOVERY    = 'P1_DISCOVERY',    // Subfinder → SUBDOMAINS jobs
  P2_PORT_SCAN    = 'P2_PORT_SCAN',    // Nmap/Naabu → PORTS_SCANNER jobs
  P3_TLS          = 'P3_TLS',          // SSLyze → TLS_ANALYSIS jobs  (Stufe 4)
  P4_HTTP_PROBE   = 'P4_HTTP_PROBE',   // HTTPX → HTTP_PROBE jobs
  P5_VULN_SCAN    = 'P5_VULN_SCAN',    // Nuclei → VULNERABILITIES jobs
  P6_MCP_ANALYSIS = 'P6_MCP_ANALYSIS', // Ramparts → MCP_VULN jobs    (Stufe 4)
}

export const PHASE_TOOL_MAP: Record<ScanPhase, ToolCategory[]> = {
  [ScanPhase.P1_DISCOVERY]:    [ToolCategory.SUBDOMAINS],
  [ScanPhase.P2_PORT_SCAN]:    [ToolCategory.PORTS_SCANNER],
  [ScanPhase.P3_TLS]:          [ToolCategory.TLS_ANALYSIS],
  [ScanPhase.P4_HTTP_PROBE]:   [ToolCategory.HTTP_PROBE],
  [ScanPhase.P5_VULN_SCAN]:    [ToolCategory.VULNERABILITIES],
  [ScanPhase.P6_MCP_ANALYSIS]: [ToolCategory.MCP_VULN],
};
```

#### Neues Frontend-Component
```
console/src/pages/targets/components/
└── pipeline-progress.tsx   // NEU
```

**Mockup-Struktur der Pipeline-Anzeige:**
```
Target: example.com

  P1 Discovery   ████████████  ✓ 42 Subdomains
  P2 Port Scan   ████████████  ✓ 7 offene Ports
  P3 TLS         ████████████  ✓ 2 Findings
  P4 HTTP Probe  ████████░░░░  ⟳ Läuft... (67%)
  P5 Vuln Scan   ░░░░░░░░░░░░  ○ Wartend
  P6 MCP         ░░░░░░░░░░░░  ○ Wartend
```

**Daten kommen aus:** `GET /job-registry/target/:targetId` aggregiert nach ToolCategory → Phase

---

### 1d. theHarvester – OSINT Integration (neu)

**Was theHarvester liefert:**
- E-Mail-Adressen (Google, Bing, LinkedIn, Hunter.io)
- Subdomains aus passiven Quellen (50+ Engines)
- LinkedIn-Mitarbeiternamen (für Social-Engineering-Awareness)
- Virtuelle Hosts / Shadow-Domains
- IP-Ranges über Shodan/Censys

**Unterschied zu Subfinder:** Subfinder ist rein auf DNS-basierte Subdomain-Enumeration fokussiert. theHarvester ergänzt mit aktiven OSINT-Quellen und liefert E-Mails + Personendaten – andere Datenkategorie.

#### Dockerfile-Voraussetzung
Python3 + pip im Worker-Dockerfile (siehe gemeinsame Python-Strategie oben).

#### Neues Tool in `built-in-tools.ts`

```typescript
{
  name: 'theHarvester',
  category: ToolCategory.OSINT,              // Neuer Enum-Wert (oder SUBDOMAINS)
  description: 'OSINT tool for gathering emails, subdomains, hosts, and employee names from public sources.',
  logoUrl: '/static/images/theharvester.png',
  command: 'theHarvester -d {{value}} -b google,bing,baidu,yahoo,dnsdumpster,crtsh -f /tmp/harvest-{{jobId}} && cat /tmp/harvest-{{jobId}}.json',
  parser: (result: string) => {
    const data = JSON.parse(result);
    return {
      hosts: data.hosts ?? [],           // → neue Assets (Subdomains)
      emails: data.emails ?? [],         // → neue OsintFindings
      ips: data.ips ?? [],               // → neue Assets (IPs)
      linkedin_people: data.linkedin_people ?? [],  // → neue OsintFindings
    };
  },
  version: '4.x',
  priority: JobPriority.LOW,
}
```

#### Neuer ToolCategory-Wert
```typescript
// core-api/src/common/enums/enum.ts
export enum ToolCategory {
  SUBDOMAINS    = 'SUBDOMAINS',
  HTTP_PROBE    = 'HTTP_PROBE',
  PORTS_SCANNER = 'PORTS_SCANNER',
  VULNERABILITIES = 'VULNERABILITIES',
  SCREENSHOT    = 'SCREENSHOT',
  OSINT         = 'OSINT',          // NEU – für theHarvester
  TLS_ANALYSIS  = 'TLS_ANALYSIS',   // NEU (Stufe 4a)
  MCP_VULN      = 'MCP_VULN',       // NEU (Stufe 4c)
}
```

#### Neues Entity: `OsintFinding`

theHarvester liefert Daten, die nicht in `Vulnerability` passen (E-Mails, Personen). Eigenes leichtgewichtiges Entity:

```typescript
// core-api/src/modules/osint/osint-finding.entity.ts  (NEU)
@Entity('osint_findings')
export class OsintFinding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  targetId: string;

  @Column({ type: 'enum', enum: OsintType })
  type: OsintType;              // EMAIL | PERSON | VIRTUAL_HOST | IP_RANGE

  @Column()
  value: string;                // z.B. "admin@example.com" oder "Max Muster"

  @Column({ nullable: true })
  source: string;               // "google" | "linkedin" | "bing" etc.

  @Column({ nullable: true })
  context: string;              // Zusatzinfo (Job-Titel, Fundort)

  @Column({ type: 'timestamp' })
  discoveredAt: Date;
}
```

#### Pipeline-Phase
theHarvester läuft parallel zu Subfinder in **Phase P1 (Discovery)**:
- Subfinder → DNS-basierte Subdomains
- theHarvester → OSINT-Quellen (E-Mails, passive Subdomains, Personen)
- Beide Ergebnisse fließen in Asset-Discovery ein

#### API-Endpunkte (neues OSINT-Modul)
```
GET /osint/target/:targetId          → Alle OSINT-Findings für Target
GET /osint/target/:targetId/emails   → Nur E-Mail-Findings
GET /osint/target/:targetId/people   → Nur Personen-Findings
```

#### Frontend
```
console/src/pages/targets/components/
└── osint-findings.tsx   // NEU – Tab in Target-Detail-View
                          // Zeigt: E-Mails, Personen, Virtual Hosts
```

**Sicherheitshinweis:** LinkedIn-Scraping kann ToS-Verletzungen auslösen. Im UI prominenten Hinweis platzieren; LinkedIn-Source optional (per Config deaktivierbar).

---

## Stufe 3 – Threat Intelligence

---

### 3a. Intel-Modul (Backend)

**Architektur:**
```
core-api/src/modules/intel/
├── intel.module.ts
├── intel.controller.ts
├── intel.service.ts
├── intel-enrichment.entity.ts     // Cache-Tabelle pro Asset
├── intel-feed-config.entity.ts    // Konfigurierte Feeds
├── dto/
│   ├── enrichment-result.dto.ts
│   └── feed-config.dto.ts
└── providers/                     // Je ein Service pro Quelle
    ├── greynoise.provider.ts
    ├── abuseipdb.provider.ts
    ├── alienvault-otx.provider.ts
    ├── misp.provider.ts           // Optional (eigene Instanz)
    └── spyonweb.provider.ts
```

#### Entity: `IntelEnrichment`
```typescript
@Entity('intel_enrichments')
export class IntelEnrichment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  assetId: string;              // FK → assets

  @Column()
  source: IntelSource;          // 'greynoise' | 'abuseipdb' | 'otx' | 'spyonweb'

  @Column('jsonb')
  data: Record<string, unknown>; // Rohe API-Antwort

  @Column({ type: 'int', nullable: true })
  abuseScore?: number;          // 0-100 (AbuseIPDB)

  @Column({ nullable: true })
  greynoiseClassification?: string; // 'malicious' | 'benign' | 'unknown'

  @Column('text', { array: true, default: [] })
  otxPulseIds: string[];        // AlienVault Pulse-IDs

  @Column({ type: 'timestamp' })
  fetchedAt: Date;              // Für Cache-Invalidierung (TTL: 24h)

  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;
}
```

#### Entity: `IntelFeedConfig`
```typescript
@Entity('intel_feed_configs')
export class IntelFeedConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  source: IntelSource;

  @Column({ default: false })
  enabled: boolean;

  @Column({ nullable: true })
  apiKey?: string;              // Verschlüsselt gespeichert

  @Column({ nullable: true })
  baseUrl?: string;             // Für MISP: eigene Instanz-URL

  @Column({ type: 'int', default: 1440 })
  cacheTtlMinutes: number;      // Default: 24h
}
```

#### API-Endpunkte
```
GET  /intel/asset/:assetId          → Aggregiertes Enrichment für Asset
GET  /intel/feeds                   → Konfigurierte Feeds + Status
PUT  /intel/feeds/:source           → Feed aktivieren/konfigurieren
POST /intel/enrich/asset/:assetId   → Manuelles Enrichment triggern
POST /intel/enrich/target/:targetId → Alle Assets eines Targets anreichern
```

#### BullMQ-Queue: `intel-enrichment`
```typescript
// Wird getriggert wenn:
// 1. Neues Asset discovered (Hook in AssetsService.create)
// 2. Manuell via API
// 3. Täglich via Cron (bestehende Cron-Infrastruktur nutzen)

interface IntelEnrichmentJob {
  assetId: string;
  assetValue: string;   // IP oder Domain
  assetType: 'ip' | 'domain';
  sources: IntelSource[];
  priority: 'high' | 'normal';
}
```

#### Rate-Limiting pro Provider
| Provider | Free-Tier Limit | Strategie |
|----------|----------------|-----------|
| GreyNoise | 100 Lookups/Tag | Token-Bucket Queue, TTL 24h Cache |
| AbuseIPDB | 1000 Checks/Tag | Gleich wie GreyNoise |
| AlienVault OTX | 10.000/Tag | Großzügigeres Polling |
| SpyOnWeb | Variabel | Nur bei Domain-Assets |
| MISP | Eigene Instanz | Keine externen Limits |

**Env-Vars (neu in `core-api/example.env`):**
```
INTEL_GREYNOISE_API_KEY=
INTEL_ABUSEIPDB_API_KEY=
INTEL_OTX_API_KEY=
INTEL_MISP_URL=
INTEL_MISP_API_KEY=
INTEL_SPYONWEB_API_KEY=
```

---

### 3b. HIBP Credential Breach Check

Teil des Intel-Moduls, eigene BullMQ-Queue wegen HIBP-Ratelimiting.

#### Entity: `BreachRecord`
```typescript
@Entity('breach_records')
export class BreachRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  targetId: string;             // FK → targets (Domain-Targets)

  @Column()
  domain: string;

  @Column('jsonb')
  breaches: HibpBreach[];       // Array der Breach-Objekte

  @Column({ type: 'int', default: 0 })
  breachCount: number;

  @Column({ type: 'timestamp' })
  checkedAt: Date;

  @Column({ type: 'boolean', default: false })
  hasNewBreaches: boolean;      // Seit letztem Check
}

interface HibpBreach {
  name: string;
  domain: string;
  breachDate: string;
  addedDate: string;
  dataClasses: string[];        // 'Passwords', 'Email addresses', etc.
  pwnCount: number;
}
```

#### BullMQ-Queue: `hibp-check`
```typescript
// Rate-Limit: 10 Jobs/Minute (HIBP-API-Limit)
// Retry: 3x mit exponential backoff (60s, 120s, 240s)

interface HibpCheckJob {
  targetId: string;
  domain: string;
  apiKey: string;               // HIBP API Key (API-Key erforderlich für /breacheddomain)
}
```

**Auslöser:**
1. Neues Domain-Target erstellt → Job in Queue
2. Täglich Cron (06:00 UTC) für alle Domain-Targets
3. HIBP `/api/v3/latestbreach` täglich prüfen → wenn neu, betroffene Targets re-checken

**Notification-Integration:** Bei neuen Breaches → Notification erstellen (+ Slack falls konfiguriert)

---

### 3c. Intel-Frontend

```
console/src/pages/intel/
├── intel.tsx                           // Hauptseite (Tab-Layout)
└── components/
    ├── threat-feed-status.tsx          // Feed-Konfiguration + Live-Status
    ├── ip-reputation-panel.tsx         // GreyNoise + AbuseIPDB zusammengefasst
    ├── otx-pulses.tsx                  // AlienVault Pulse-Timeline
    ├── breach-records.tsx              // HIBP Breach-Liste nach Domain
    └── ip-reputation-badge.tsx         // Inline-Badge für Asset-Listen
```

**Intel-Hauptseite – Tab-Struktur:**
```
Intel
  ├── [Übersicht]   Aggregierter Threat-Score, Top-gefährdete Assets
  ├── [IP-Reputation] GreyNoise/AbuseIPDB-Tabelle aller IPs
  ├── [Threat Feeds]  OTX Pulses, MISP Events Timeline
  ├── [Breaches]      HIBP-Ergebnisse nach Domain
  └── [Einstellungen] Feed-API-Keys konfigurieren
```

**`ip-reputation-badge.tsx`** wird auch in Asset-Listen eingebaut:
```tsx
// Kleines farbiges Badge neben jeder IP in der Assets-Tabelle
<IpReputationBadge abuseScore={72} classification="malicious" />
// → Rotes Badge: "⚠ 72/100"
```

---

## Stufe 4 – Erweiterte Scan-Phasen

---

### 4a. SSLyze TLS-Analyse (Phase P3)

**Ansatz:** SSLyze als neues Tool im bestehenden Tool-System (kein neuer Worker-Typ nötig)

#### Dockerfile-Erweiterung (worker/Dockerfile)
```dockerfile
# SSLyze installieren (Python-basiert)
RUN pip3 install --no-cache-dir sslyze
# Alternativ: sslyze binary via pip als CLI-Tool
```

#### Neues Tool in der DB (Seed/Migration)
```typescript
// core-api/src/database/seeds/tools.seed.ts
{
  name: 'sslyze',
  displayName: 'SSLyze TLS Scanner',
  category: ToolCategory.TLS_ANALYSIS,       // Neuer Enum-Wert
  command: 'sslyze --json_out=- {assetService.host}:{assetService.port}',
  version: '6.x',
  priority: 30,
  isBuiltIn: true,
}
```

#### Neuer ToolCategory Enum-Wert
```typescript
// core-api/src/modules/tools/tool.entity.ts
export enum ToolCategory {
  SUBDOMAINS    = 'SUBDOMAINS',
  HTTP_PROBE    = 'HTTP_PROBE',
  PORTS_SCANNER = 'PORTS_SCANNER',
  VULNERABILITIES = 'VULNERABILITIES',
  TLS_ANALYSIS  = 'TLS_ANALYSIS',    // NEU
  SCREENSHOT    = 'SCREENSHOT',       // NEU (Stufe 4b)
  MCP_VULN      = 'MCP_VULN',        // NEU (Stufe 4c)
}
```

#### TLS-Findings → Vulnerabilities
SSLyze-Output-Parser im Worker erstellt strukturierte Vulnerabilities:

| SSLyze-Befund | Severity | VulnCategory |
|---------------|----------|-------------|
| TLS 1.0/1.1 aktiv | HIGH | `TLS_OUTDATED_PROTOCOL` |
| RC4 / 3DES Cipher | HIGH | `TLS_WEAK_CIPHER` |
| Zertifikat < 30 Tage | HIGH | `CERT_EXPIRING_SOON` |
| Zertifikat abgelaufen | CRITICAL | `CERT_EXPIRED` |
| Self-signed Cert | MEDIUM | `CERT_SELF_SIGNED` |
| HSTS fehlt | MEDIUM | `MISSING_HSTS` |

#### Go Worker – SSLyze Output-Parser
```go
// worker/internal/sslyze/parser.go  (NEU)
type SSLyzeResult struct {
  ServerScanResults []ServerScanResult `json:"server_scan_results"`
}

func ParseSSLyzeOutput(jsonOutput []byte) ([]Finding, error) {
  // SSLyze JSON → []Finding mit Severity-Klassifizierung
}
```

---

### 4b. HTTP Screenshot Capture (Phase P4)

**Vorteil:** Rod/Chromium bereits im Worker-Dockerfile enthalten – kein neuer Service.

#### Neuer ToolCategory: `SCREENSHOT`
Wird als Sub-Task von `HTTP_PROBE` ausgeführt (nach HTTPX, auf denselben URLs).

#### Go Worker – Screenshot-Task
```go
// worker/internal/screenshot/screenshot.go  (NEU)
// Rod bereits importiert: github.com/go-rod/rod

func CaptureScreenshot(url string, outputPath string) error {
  browser := rod.New().MustConnect()
  defer browser.MustClose()
  page := browser.MustPage(url)
  page.MustWaitLoad()
  page.MustScreenshot(outputPath)
  return nil
}
```

#### Storage-Pfad
```
/app/.storage/screenshots/{workspaceId}/{assetServiceId}.png
```
→ gemountet als `api-storage` Volume, API serviert via `/api/static/screenshots/`

#### API-Endpoint (neu in StorageModule)
```
GET /storage/screenshot/:assetServiceId  →  PNG zurückgeben (mit Auth-Guard)
```

#### Frontend – Asset-Detail
```tsx
// console/src/pages/assets/detail-asset.tsx  ÄNDERN
// Neuer Bereich: "Screenshot" Tab
<img 
  src={`/api/static/screenshots/${assetService.id}.png`}
  alt="Website Screenshot"
  className="rounded border w-full"
/>
```

#### Entity-Erweiterung (AssetService / Asset)
```typescript
// Kein neues Entity nötig
// Bestehende Assets-Struktur erweitern:
screenshotPath?: string;        // relativer Pfad im Storage-Volume
screenshotCapturedAt?: Date;
```

---

### 4c. Ramparts MCP-Vulnerability-Analyse (Phase P6)

#### Ramparts installieren (worker/Dockerfile)
```dockerfile
# Ramparts: MCP Security Scanner
# https://github.com/ramparts-ai/ramparts
RUN go install github.com/ramparts-ai/ramparts/cmd/ramparts@latest
# Alternativ: Binary download aus GitHub Releases
```

#### Neues Tool in DB
```typescript
{
  name: 'ramparts',
  displayName: 'Ramparts MCP Security Scanner',
  category: ToolCategory.MCP_VULN,
  command: 'ramparts scan --json {asset}:{port}',
  version: 'latest',
  isBuiltIn: true,
}
```

#### Target-Auswahl: Welche Assets werden mit Ramparts gescannt?
Nur Assets mit MCP-typischen Ports (erkannt in Phase P2):

```typescript
// core-api/src/modules/jobs-registry/jobs-registry.service.ts  ÄNDERN
const MCP_TYPICAL_PORTS = [6274, 6277, 8080, 3000, 443];

// Nach Port-Scan: Assets mit diesen Ports → MCP_VULN Job erstellen
```

#### Neue Vulnerability-Kategorien
| Ramparts-Befund | Severity | ngasm-VulnCategory |
|----------------|----------|-------------------|
| Unauthenticated MCP server | CRITICAL | `MCP_UNAUTHENTICATED` |
| Tool schema injection | HIGH | `MCP_TOOL_INJECTION` |
| Auth bypass | CRITICAL | `MCP_AUTH_BYPASS` |
| Sensitive tool exposed | HIGH | `MCP_SENSITIVE_TOOL` |
| No rate limiting | MEDIUM | `MCP_NO_RATE_LIMIT` |

#### Frontend – MCP-Findings Erweiterung
```
console/src/pages/vulnerabilities/components/
└── mcp-finding-detail.tsx    // NEU – spezieller Detail-View für MCP-Vulns
                               // Zeigt: betroffenes Tool-Schema, PoC-Request, Remediation
```

---

## Implementierungs-Reihenfolge (aktualisiert)

```
── Vorbereitung ──────────────────────────────────────────────────────
Dockerfile Python-Update               ~0.5 Tage  Einmalig für alle Python-Tools

── Stufe 1 ───────────────────────────────────────────────────────────
Stufe 1a: Slack Notifications          ~2 Tage    Backend + Frontend
Stufe 1c: Pipeline-Visualisierung      ~2 Tage    Nur Frontend + pipeline.types.ts
Stufe 1d: theHarvester OSINT           ~4 Tage    Dockerfile + built-in-tools + OsintFinding Entity + Frontend
Stufe 1b: Erweiterte Suche             ~4 Tage    QueryParser + Frontend Token-Input

── Stufe 3 ───────────────────────────────────────────────────────────
Stufe 3b: HIBP Check                   ~3 Tage    NestJS Queue + Entity + Notification-Hook
Stufe 4a: SSLyze TLS                   ~4 Tage    built-in-tools + Go Output-Parser + Vuln-Typen
Stufe 3a: Intel-Modul (3 Provider)     ~6 Tage    GreyNoise + AbuseIPDB + OTX, Intel-Frontend
Stufe 3a: SpyOnWeb                     ~2 Tage    4. Provider im Intel-Modul
Stufe 3a: MISP                         ~3 Tage    Optional, eigene MISP-Instanz nötig

── Stufe 4 ───────────────────────────────────────────────────────────
Stufe 4c: Ramparts MCP-Analyse         ~4 Tage    Binary-Download + built-in-tools + Vuln-Typen
─────────────────────────────────────────────────────────────────────
Gesamt:                               ~34.5 Tage  (ca. 7 Wochen, 1 Entwickler)
```

**Entfallen (bereits implementiert):**
- ~~Stufe 4b: Screenshots~~ → Rod + Screenshot-Tool bereits vollständig in ngasm
- ~~Naabu hinzufügen~~ → bereits in built-in-tools.ts

---

## Neue Env-Variablen (Gesamtübersicht)

Alle in `core-api/example.env` ergänzen:

```bash
# Stufe 1a – Slack (alternativ in DB konfigurierbar)
# Keine neuen Env-Vars nötig – URL wird per API gesetzt

# Stufe 3 – Threat Intelligence
INTEL_GREYNOISE_API_KEY=
INTEL_ABUSEIPDB_API_KEY=
INTEL_OTX_API_KEY=
INTEL_HIBP_API_KEY=
INTEL_MISP_URL=
INTEL_MISP_API_KEY=
INTEL_SPYONWEB_API_KEY=
```

## Neue docker-compose Services (Stufe 3+)

Keine neuen Services nötig – alle Features laufen im bestehenden Stack:
- Intel-Provider-Calls: in `core-api` (HTTP-Calls nach außen)
- HIBP/Intel-Queue: in bestehender Redis + BullMQ-Infrastruktur
- SSLyze/Ramparts: im bestehenden `oasm-worker` Container (via Dockerfile-Erweiterung)

Einzige Ausnahme: **Stufe 5** (Prometheus/Grafana) bräuchte neue Services – ist hier nicht im Scope.
