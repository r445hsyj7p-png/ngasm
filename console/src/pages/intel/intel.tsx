import Page from '@/components/common/page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate, useParams } from 'react-router-dom';
import { BreachRecords } from './components/breach-records';
import { IpReputationPanel } from './components/ip-reputation-panel';
import { ThreatFeedStatus } from './components/threat-feed-status';

const TABS = [
  { value: 'reputation', label: 'IP Reputation' },
  { value: 'breaches', label: 'Breaches (HIBP)' },
  { value: 'settings', label: 'Feed Settings' },
];

export default function IntelPage() {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();

  const activeTab = TABS.some((t) => t.value === tab) ? tab! : 'reputation';

  const handleTabChange = (value: string) => {
    navigate(`/intel/${value}`);
  };

  return (
    <Page
      title="Threat Intelligence"
      header={
        <p className="text-sm text-muted-foreground">
          IP reputation, credential breach detection, and threat feed management
        </p>
      }
    >
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="hover:cursor-pointer">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="reputation" className="py-4">
          <IpReputationPanel />
        </TabsContent>

        <TabsContent value="breaches" className="py-4">
          <BreachRecords />
        </TabsContent>

        <TabsContent value="settings" className="py-4">
          <div className="max-w-xl">
            <div className="mb-4">
              <h3 className="font-medium">Threat Feed Configuration</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Enable feeds and add API keys. Enrichment runs automatically on new assets and refreshes every 24h.
              </p>
            </div>
            <ThreatFeedStatus />
          </div>
        </TabsContent>
      </Tabs>
    </Page>
  );
}
