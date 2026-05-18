# Vibe-Coding Prompt – OASM Console UI

Verwende diesen Prompt, um die UI-Oberfläche dieser Anwendung mit einem KI-Tool (Cursor, Lovable, v0, Bolt etc.) immer wieder neu zu erzeugen oder zu erweitern.

---

## Aufgabe

Baue eine **Security-Plattform-Weboberfläche** namens **OASM (Open Attack Surface Management Console)** mit folgenden Eigenschaften.

---

## Tech-Stack (zwingend)

- **React 19 + TypeScript**
- **Vite** als Build-Tool
- **Tailwind CSS v4** (mit `@import 'tailwindcss'`)
- **shadcn/ui** Komponentenbibliothek (Sidebar, Card, Button, Badge, Dialog, Sheet, Tabs, DropdownMenu, Avatar, Tooltip, Input, Form, Select, Table, Popover, Sonner/Toaster)
- **React Router v6** (`createBrowserRouter`)
- **TanStack Query v5** (`QueryClientProvider`, `persistQueryClient` mit localStorage)
- **Recharts** für alle Diagramme (AreaChart, BarChart, LineChart, PieChart, ComposedChart)
- **Lucide React** für alle Icons
- **Geist + Geist Mono** (Google Fonts) als Schriftarten
- **react-hook-form + zod** für alle Formulare

---

## Design-System

### Farbsystem (oklch, dark-mode-first)

```css
/* Light */
--background: oklch(0.99 0 0);
--foreground: oklch(0 0 0);
--primary: oklch(0 0 0);
--secondary: oklch(0.94 0 0);
--muted: oklch(0.97 0 0);
--muted-foreground: oklch(0.44 0 0);
--border: oklch(0.92 0 0);
--destructive: oklch(0.63 0.19 23.03);

/* Dark */
--background: oklch(0 0 0);          /* reines Schwarz */
--foreground: oklch(1 0 0);           /* reines Weiß */
--card: oklch(0.14 0 0);
--popover: oklch(0.18 0 0);
--secondary: oklch(0.25 0 0);
--muted: oklch(0.23 0 0);
--muted-foreground: oklch(0.72 0 0);
```

Standard-Theme: **dark**. Toggle per `localStorage` Schlüssel `"theme"`.

### Schriften
```css
--font-sans: Geist, sans-serif;
--font-mono: Geist Mono, monospace;
--radius: 0.5rem;
```

### Severity-Farben (für Badges & Text)
- critical → `text-red-500`
- high → `text-orange-500`
- medium → `text-yellow-500`
- low → `text-blue-500`
- info → `text-gray-500`

---

## Gesamt-Layout

```
┌─────────────────────────────────────────────────────────┐
│  SIDEBAR (collapsible, icon-mode)  │  HEADER BAR (sticky)│
│  ┌──────────────────────────────┐  │  [☰] [LOGO?]        │
│  │ Logo (large)                 │  │  [Global Search]    │
│  │ Workspace Switcher           │  │  [🔔 Notification]  │
│  │──────────────────────────────│  │                     │
│  │ Overview                     │  ├─────────────────────┤
│  │   Dashboard                  │  │                     │
│  │   Agents ✨NEW               │  │   PAGE CONTENT      │
│  │──────────────────────────────│  │   (p-4, flex-col)   │
│  │ Admin (nur role=admin)       │  │                     │
│  │   Users                      │  │                     │
│  │──────────────────────────────│  │                     │
│  │ Attack Surface               │  │                     │
│  │   Targets                    │  │                     │
│  │   Groups                     │  │                     │
│  │   Assets                     │  │                     │
│  │──────────────────────────────│  │                     │
│  │ Security                     │  │                     │
│  │   Vulnerabilities            │  │                     │
│  │   Issues                     │  │                     │
│  │   Intel ✨NEW                │  │                     │
│  │──────────────────────────────│  │                     │
│  │ Management                   │  │                     │
│  │   Tools                      │  │                     │
│  │   Workers                    │  │                     │
│  │   Jobs Registry              │  │                     │
│  │──────────────────────────────│  │                     │
│  │ [Avatar] Name / Email        │  │                     │
│  └──────────────────────────────┘  │                     │
└─────────────────────────────────────────────────────────┘
```

### Sidebar-Details
- `SidebarProvider` + `SidebarInset` wrappen den gesamten Bereich
- Collapsible mit `collapsible="icon"` (Icons bleiben sichtbar, Labels ausgeblendet)
- `SidebarRail` für Resize-Handle
- Header enthält Logo-Komponente (`AppLogo type="large"`) und darunter `WorkspaceSwitcher` (Dropdown zum Workspace-Wechsel)
- Footer enthält `NavUser` (Avatar → Dropdown mit Settings + Logout)
- Gruppen-Labels sind **fett** (`font-bold text-md`)
- Aktiver Link: `isActive` Prop auf `SidebarMenuButton`
- Mobile: `setOpenMobile(false)` beim Link-Klick

### Header Bar
- `sticky top-0 z-10 h-16 border-b bg-background`
- Links: `SidebarTrigger`, ggf. Logo auf Mobile
- Mitte: `SearchForm` (globale Suche, `w-1/2`)
- Rechts: `NotificationBell` (Glockensymbol mit ungelesen Badge)

---

## Routing-Struktur

```
/                         → Dashboard
/login                    → Login (Guest only)
/init-admin               → Register (einmalig)
/workspaces/create        → Workspace erstellen
/workspaces               → Workspace-Übersicht
/notifications            → Benachrichtigungen
/targets                  → Target-Liste
/targets/start-discovery  → Discovery starten
/targets/:id/:tab         → Target-Detail (tabs: inventory, osint, …)
/assets                   → Asset-Liste (mit Tab-Navigation)
/assets/:id               → Asset-Detail
/groups                   → Asset-Gruppen
/groups/:id               → Gruppen-Detail
/vulnerabilities          → Schwachstellen-Liste
/vulnerabilities/:id      → Schwachstellen-Detail
/issues                   → Issues-Liste
/issues/create            → Issue erstellen
/issues/:id               → Issue-Detail
/intel/reputation         → Threat Intelligence – IP Reputation
/intel/breaches           → Threat Intelligence – Breaches (HIBP)
/intel/settings           → Threat Intelligence – Feed-Einstellungen
/tools                    → Tools (Marktplatz)
/tools/:id                → Tool-Detail
/workers                  → Worker-Übersicht
/jobs                     → Jobs Registry
/jobs/runs/:id            → Job-Runs-Detail
/providers                → Provider-Liste
/providers/create         → Provider erstellen
/providers/:id            → Provider-Detail
/providers/:id/edit       → Provider bearbeiten
/agents                   → KI-Agenten Landing (Chat-Interface)
/agents/create            → Agent erstellen
/agents/conversations     → Gesprächs-Verlauf
/agents/conversations/:id → Chat-Konversation
/agents/:id               → Agent-Detail
/agents/:id/edit          → Agent bearbeiten
/settings                 → Einstellungen (Tabs: workspace, api-keys, security, slack, preferences, branding, about)
/admin/users              → Admin – Benutzerverwaltung
```

---

## Seiten im Detail

### Dashboard (`/`)

Grid-Layout mit responsiver 4-Spalten-Aufteilung (`2xl:grid-cols-4`):

**Linke 3/4-Spalte (Hauptinhalt):**
1. **Stat Cards** – 4 Kacheln in 1 Reihe (`xl:grid-cols-4`):
   - Targets (Target-Icon), Assets (CloudCheck-Icon), Services (Server-Icon), Technologies (Cpu-Icon)
   - Jede Karte: großer Monospace-Zahl-Counter mit NumberAnimate-Animation, Trend-Indikator (TrendingUp/TrendingDown in grün/rot), kleines `AreaChart` im Kartenunterbereich (Höhe 60px, leicht transparent, wird bei Hover voll sichtbar)
   - Karten sind klickbar → navigieren zur jeweiligen Route
2. **Issues Timeline** – Liniendiagramm, Issues über Zeit
3. **Asset Trends** – Flächendiagramm, Asset-Wachstum
4. **TLS Expiration Table** – Tabelle ablaufender TLS-Zertifikate
5. **Top Assets by Vulnerabilities** – Balkendiagramm

**Rechte 1/4-Spalte:**
1. **Vulnerability Statistic Card** – Security Score (Kreis-Score-Anzeige) + 6 Severity-Zähler in 3×2-Grid (Total, Critical, High | Medium, Low, Info), klickbar → `/vulnerabilities`
2. **Top Tags** – Tag-Liste der häufigsten Asset-Tags

**Untere Vollbreite-Zeile:**
- **Asset Locations Map** – Weltkarte mit Asset-Standortpunkten (`min-h-96`)

---

### Login (`/login`)

Split-Screen:
- Links: Illustrationsbereich (brand-farbig, mit Logo und Tagline)
- Rechts: `Card` mit Formular (Email + Password, Submit-Button mit Loader-Icon bei Loading)
- Zod-Validierung: Email required, Password min 8 Zeichen

---

### Targets (`/targets`)

- Page-Titel "Targets"
- Filterleiste: Scope-Filter, Status-Filter, Target-Type-Filter
- Server-seitig paginierte Tabelle (`useServerDataTable`)
- Spalten: Name, Type, Scope, Status, Assets, Last Scan, Actions
- Discovery starten per Button → `/targets/start-discovery`

---

### Assets (`/assets`)

- Tab-Navigation: Hosts | IPs | Ports | Status Codes | Technologies | TLS
- Jeder Tab hat eigene Spalten-Konfiguration und gefacettete Filter (`FacetedFilter`)
- Screenshot-Vorschau in Hosts-Tab (Thumbnail)
- Asset-Gruppen erstellen via Dialog

---

### Vulnerabilities (`/vulnerabilities`)

- Vulnerability-Statistik oben (Severity-Breakdown als Balken)
- Filterleiste: Severity, Status, Tags
- Tabelle mit Spalten: Title, Severity (farbiger Badge), Target, Asset, Status, Date
- Dismiss-Dialog zum Schließen/Kommentieren

---

### Intel (`/intel/:tab`)

Tabs:
1. **IP Reputation** – IP-Eingabe + Reputations-Panel (AbuseIPDB, VirusTotal Scores)
2. **Breaches (HIBP)** – E-Mail-Eingabe, Breach-Ergebnisse als Karten
3. **Feed Settings** – Liste konfigurierbarer Threat-Feeds mit API-Key-Input und Enable/Disable-Toggle

---

### Agents (`/agents`)

Landing-Page mit KI-Chat-Interface:
- Große TypewriterText-Überschrift (rotiert durch Starter-Texte)
- `PromptInput` Komponente: Textarea + Submit-Button + Model-Switcher
- Schnellauswahl-Suggestions (4 zufällige aus Pool von 15)
- Link zur Gesprächsübersicht
- Wenn kein LLM konfiguriert: `LlmConnect`-Banner

---

### Settings (`/settings/:tab`)

Sidebar-Layout mit Tab-Gruppen:
- **Workspace**: Name, Logo, Konfiguration, Mitglieder
- **Integrationen**: API-Keys, Slack-Config, MCP-Verbindung
- **Security**: Passwort ändern, 2FA
- **Preferences**: Theme-Switcher (Light/Dark/System), Sprache
- **About**: Versionsinformationen

---

## Gemeinsame UI-Muster

### `Page`-Wrapper
```tsx
<Page title="Seitentitel" header={<OptionalSubheader />}>
  {/* Inhalt */}
</Page>
```
Rendert `<h1>` mit dem Titel und optionalem Beschreibungstext.

### `NewBadge`
Kleines grünes "NEW"-Badge neben Navigationsitems.

### Tabellen
- shadcn `Table` + `useServerDataTable` Hook für Server-seitige Paginierung + Sortierung
- Paginierungs-Controls immer unten

### Dialoge & Sheets
- Erstellen/Bearbeiten: meist `Dialog` für kurze Formulare
- Detail-Ansichten: `Sheet` (Slide-in von rechts)

### Severity-Badges
```tsx
<Badge variant="outline" className="text-red-500 border-red-500">Critical</Badge>
```

### Ladeanimationen
- Skeleton-Karten mit `animate-pulse` (nicht Spinner)
- `NumberAnimate` für Zahlen-Counter (zählt von 0 auf Zielwert hoch)

### Notifications
- `Toaster` (Sonner) unten mittig (`position="bottom-center"`)
- `NotificationBell` in der Header-Bar mit SSE-Stream

---

## Workspace-Konzept

- Jeder Benutzer hat einen oder mehrere Workspaces
- `WorkspaceSwitcher` im Sidebar-Header (Dropdown mit Workspace-Namen + Create-Button)
- `RequireWorkspace`-Guard: Wenn kein Workspace existiert → zeige `CreateWorkspace`-Seite statt Inhalt
- `selectedWorkspaceId` in `localStorage` persistiert; alle API-Calls senden es als Header/Query

---

## Auth-System

- `authClient` (better-auth kompatibel) mit `useSession()`-Hook
- Routen-Guards:
  - `ProtectedRoute`: Redirect zu `/login` wenn nicht eingeloggt
  - `GuestRoute`: Redirect zu `/` wenn bereits eingeloggt
  - `AdminRoute`: Nur für `user.role === 'admin'`
  - `RegisterRoute`: Nur wenn noch kein Admin existiert
- Session enthält: `user.id`, `user.name`, `user.email`, `user.role`, `user.image`

---

## API-Anbindung

- Axios-Client (`axios-client.ts`) mit Basis-URL aus `VITE_API_URL`
- OpenAPI-generierte Queries in `services/apis/gen/queries.ts` (TanStack Query)
- SSE für Benachrichtigungen: `use-notification-stream.ts` (EventSource)
- SSE für AI-Antworten: `ai-assistant-sse.ts`

---

## Zusätzliche Komponenten

| Komponente | Verwendung |
|---|---|
| `AppLogo` | Logo in Sidebar (`type="large"`) und Header Mobile (`type="small"`) |
| `WorkspaceSwitcher` | Dropdown-Menü im Sidebar-Header |
| `NavUser` | Avatar + Dropdown (Settings, Logout) im Sidebar-Footer |
| `SearchForm` | Globale Suche in der Header-Bar, navigiert zu `/search?q=...` |
| `NotificationBell` | Glockensymbol mit Badge-Zähler, öffnet Notification-Drawer |
| `TypewriterText` | Animierter Text der zwischen Strings wechselt |
| `TlsDateBadge` | Badge das TLS-Ablaufdatum farblich kodiert |
| `ScanScheduleSelect` | Dropdown für Scan-Intervall-Auswahl |
| `AgentSettingsDialog` | Dialog für Agent-Konfiguration |
| `McpServersManager` | MCP-Server Liste + Verbindungsmanagement |
| `LlmConnect` | Banner wenn noch kein LLM-Provider konfiguriert |
| `CodeBlock` | Syntax-gehighlighteter Code-Block (mit Kopieren-Button) |
| `Markdown` | Markdown-Renderer für KI-Antworten |

---

## Stile & Animationen

- Scrollbar: `rounded`, transparent Hintergrund, gedimmter Thumb (50% Opacity)
- `scrollbar-hide`-Klasse: Scrollbar komplett ausgeblendet (für horizontales Scrollen)
- Custom Bounce: `.animate-bounce-slow-high` (realistische Bounce-Physik, 4s loop)
- Hover-Effekte: `hover:bg-accent/70` auf klickbaren Karten
- Transitions: `transition-colors`, `transition-opacity duration-300`
- Karten-Überlauf: `overflow-hidden` auf allen Stat-Cards (für Chart-Clipping)

---

## Beispiel-Prompt für eine einzelne Seite

> Erstelle die **Vulnerabilities-Seite** (`/vulnerabilities`) der OASM-Console:
> - Tech: React, TypeScript, Tailwind CSS v4, shadcn/ui
> - Design: dark mode mit oklch-Farbsystem, Geist-Schrift
> - Oben: Severity-Breakdown-Karte mit 6 Zählern (Total, Critical, High, Medium, Low, Info) in 3×2-Grid, je Zähler ein farbkodierter Wert
> - Darunter: gefilterte, paginierte Tabelle mit Spalten Title, Severity-Badge, Target, Asset, Status, Date
> - Filter: Severity-Dropdown, Status-Dropdown, Tags-Combobox
> - Severity-Farben: critical=red-500, high=orange-500, medium=yellow-500, low=blue-500, info=gray-500
> - Skeleton-Loading mit animate-pulse
> - Dismiss-Dialog beim Klick auf einen Eintrag

---

*Dieser Prompt beschreibt den Stand des Projekts `r445hsyj7p-png/oasm` auf Branch `claude/ui-vibecoding-prompt-uMrZm`.*
