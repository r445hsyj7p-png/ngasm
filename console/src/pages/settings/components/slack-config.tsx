import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  useSystemConfigsControllerGetConfig,
  useSystemConfigsControllerUpdateConfig,
} from '@/services/apis/gen/queries';
import { axiosInstance } from '@/services/apis/axios-client';
import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const slackSchema = z.object({
  slackEnabled: z.boolean(),
  slackWebhookUrl: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  slackAlertThreshold: z.enum(['info', 'low', 'medium', 'high', 'critical']),
});

type SlackFormValues = z.infer<typeof slackSchema>;

const SEVERITY_OPTIONS = [
  { value: 'info', label: 'Info and above' },
  { value: 'low', label: 'Low and above' },
  { value: 'medium', label: 'Medium and above' },
  { value: 'high', label: 'High and above' },
  { value: 'critical', label: 'Critical only' },
];

export default function SlackConfigSettings() {
  const { data: config, isLoading, refetch } = useSystemConfigsControllerGetConfig();
  const [isTesting, setIsTesting] = React.useState(false);

  const updateConfigMutation = useSystemConfigsControllerUpdateConfig({
    mutation: {
      onSuccess: () => {
        toast.success('Slack settings saved');
        refetch();
      },
      onError: () => {
        toast.error('Failed to save Slack settings');
      },
    },
  });

  const form = useForm<SlackFormValues>({
    resolver: zodResolver(slackSchema),
    defaultValues: {
      slackEnabled: false,
      slackWebhookUrl: '',
      slackAlertThreshold: 'high',
    },
  });

  React.useEffect(() => {
    if (config) {
      form.reset({
        slackEnabled: config.slackEnabled ?? false,
        slackWebhookUrl: config.slackWebhookUrl ?? '',
        slackAlertThreshold: (config.slackAlertThreshold as SlackFormValues['slackAlertThreshold']) ?? 'high',
      });
    }
  }, [config, form]);

  const onSubmit = (values: SlackFormValues) => {
    updateConfigMutation.mutate({
      data: {
        slackEnabled: values.slackEnabled,
        slackWebhookUrl: values.slackWebhookUrl || null,
        slackAlertThreshold: values.slackAlertThreshold,
      },
    });
  };

  const handleTest = async () => {
    const url = form.getValues('slackWebhookUrl');
    if (!url) {
      toast.error('Enter a webhook URL first');
      return;
    }
    setIsTesting(true);
    try {
      await axiosInstance.post('/system-configs/slack/test', { webhookUrl: url });
      toast.success('Test message sent to Slack');
    } catch {
      toast.error('Failed to send test message');
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center items-center h-32">
          <div>Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="slackEnabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between">
                <FormLabel>Enable Slack Notifications</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slackWebhookUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Webhook URL</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      placeholder="https://hooks.slack.com/services/..."
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTest}
                    disabled={isTesting}
                  >
                    {isTesting ? 'Testing...' : 'Test'}
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slackAlertThreshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alert Threshold</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select threshold" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={updateConfigMutation.isPending}>
              {updateConfigMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}
