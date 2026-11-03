import type { Metadata } from 'next';
import { ActionForm, SubmitButton } from '@/components/admin/ActionForm';
import { CapiTestButton } from '@/components/admin/CapiTestButton';
import { Badge, Card, Field, PageHeader, Stat, input } from '@/components/admin/ui';
import { getCapiHealth } from '@/lib/analytics/queries';
import { fmtDateTime } from '@/lib/admin/time';
import { getSettingsFresh } from '@/lib/settings';
import { saveTestCodeAction } from './actions';

export const metadata: Metadata = { title: 'Tracking' };
export const dynamic = 'force-dynamic';

export default async function TrackingPage() {
  const [h, s] = await Promise.all([getCapiHealth(), getSettingsFresh()]);
  return (
    <>
      <PageHeader title="Tracking" subtitle="Meta Pixel + Conversions API health (last 24 hours)." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pixel ID" value={<span className="text-lg">{h.pixelId || 'Not set'}</span>} tone={h.pixelId ? undefined : 'bad'} />
        <Stat label="CAPI sent" value={h.sent24h} tone="good" />
        <Stat label="CAPI pending" value={h.pending} />
        <Stat label="CAPI failed" value={h.failed24h} tone={h.failed24h > 0 ? 'bad' : undefined} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Stat label="Deduplicated pairs (24h)" value={h.dedupPairs24h} hint="Browser + server events sharing one event_id" />
        <Stat label="Mode" value={s.capi_test_event_code ? <Badge tone="warn">Test events</Badge> : <Badge tone="good">Production</Badge>} />
      </div>
      {h.lastError && (
        <Card title="Last error" className="mt-4">
          <p className="text-sm text-red-700">{h.lastError.message}</p>
          <p className="mt-1 text-xs text-muted">{fmtDateTime(h.lastError.at, true)}{h.lastError.fbtraceId ? ` · fbtrace_id ${h.lastError.fbtraceId}` : ''}</p>
        </Card>
      )}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Test event code">
          <ActionForm action={saveTestCodeAction} className="space-y-3">
            <Field label="Test event code" hint="From Meta Events Manager → Test events. Overrides the env value. Clear it before going live.">
              <input name="code" defaultValue={s.capi_test_event_code} placeholder="TEST12345" className={input} />
            </Field>
            <SubmitButton>Save</SubmitButton>
          </ActionForm>
        </Card>
        <Card title="Send a test event"><p className="mb-3 text-sm text-muted">Sends a server-side PageView with the test code above, so it shows in Events Manager → Test events.</p><CapiTestButton /></Card>
      </div>
    </>
  );
}
