import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { ScannerAccountsSection } from '@/components/scanners/ScannerAccountsSection';
import { ScannerAssignmentPanel } from '@/components/scanners/ScannerAssignmentPanel';
import {
  ScannerDialogOverlay,
  ScannerFocusBanner,
  ScannerFormLabel,
  ScannerMainPanel,
  ScannerMetricCard,
  ScannerMetricStrip,
  ScannerPageHeader,
  ScannerPanelBody,
  ScannerTabNav,
  scannerInputErrorClass,
} from '@/components/scanners/scannerUi';
import { createScanner, listScanners, listScanLogs } from '@/services/scannersService';
import { listEvents } from '@/services/eventsService';
import { formatOrganizerApiError } from '@/lib/api/extractOrganizerApiError';
import { firstMessagesFromApiError, pickApiFieldMessage } from '@/lib/api/apiValidationErrors';
import { toast } from '@/lib/appToast';
import type { OrganizerEvent, ScannerAccount } from '@/types/domain';
import { cn } from '@/lib/utils';
import { ScanLine, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

type ScannerTab = 'accounts' | 'assign' | 'logs';

const LIVE_STATUSES = new Set(['published', 'sold_out', 'in_progress']);

const TAB_ITEMS: { id: ScannerTab; label: string }[] = [
  { id: 'accounts', label: 'Accounts' },
  { id: 'assign', label: 'Assignments' },
  { id: 'logs', label: 'Scan logs' },
];

export function ScannerManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const focusEventId = searchParams.get('eventId') ?? '';
  const [scanners, setScanners] = useState<ScannerAccount[]>([]);
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof listScanLogs>>>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gateLabel, setGateLabel] = useState('');
  const [createEventIds, setCreateEventIds] = useState<string[]>([]);
  const [tab, setTab] = useState<ScannerTab>(focusEventId ? 'assign' : 'accounts');
  const [assignEventId, setAssignEventId] = useState(focusEventId);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [scannerFieldErrors, setScannerFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  async function reload() {
    const [s, e, l] = await Promise.all([listScanners(), listEvents(), listScanLogs()]);
    setScanners(s);
    setEvents(e.filter((x) => LIVE_STATUSES.has(x.status)));
    setLogs(l.slice(-30).reverse());
  }

  useEffect(() => {
    const t = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (focusEventId) {
      setTab('assign');
      setAssignEventId(focusEventId);
    }
  }, [focusEventId]);

  function toggleCreateEvent(eventId: string) {
    setCreateEventIds((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    );
  }

  function goToAssignments(eventId?: string) {
    setTab('assign');
    if (eventId) {
      setAssignEventId(eventId);
      const next = new URLSearchParams(searchParams);
      next.set('eventId', eventId);
      setSearchParams(next, { replace: true });
    }
  }

  function openCreateStaff() {
    setName('');
    setEmail('');
    setPassword('');
    setGateLabel('');
    setCreateEventIds(focusEventId || assignEventId ? [focusEventId || assignEventId] : []);
    setScannerFieldErrors({});
    setOpenCreateDialog(true);
  }

  const activeStaff = scanners.filter((s) => s.active).length;
  const focusTitle = events.find((e) => e.id === focusEventId)?.title;

  return (
    <div className="space-y-8">
      <ScannerPageHeader
        eyebrow="Operations"
        title="Scanner management"
        description="Gate staff accounts, per-event assignments, and check-in history for your live events."
        action={
          tab === 'accounts' ? (
            <Button variant="dark" size="md" className="gap-2" onClick={openCreateStaff}>
              <UserPlus className="h-4 w-4" strokeWidth={2} aria-hidden />
              Add gate staff
            </Button>
          ) : null
        }
      />

      <ScannerMetricStrip>
        <ScannerMetricCard label="Gate staff" value={String(scanners.length)} accent="bg-sky/20" />
        <ScannerMetricCard label="Active" value={String(activeStaff)} accent="bg-mint/25" />
        <ScannerMetricCard label="Live events" value={String(events.length)} accent="bg-lemon/30" />
        <ScannerMetricCard label="Recent scans" value={String(logs.length)} accent="bg-ink-5/60" />
      </ScannerMetricStrip>

      {focusEventId ? (
        <ScannerFocusBanner
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => goToAssignments(focusEventId)}>
              View assignments
            </Button>
          }
        >
          Focused on <strong className="font-bold">{focusTitle ?? 'this event'}</strong> — assign staff in the
          Assignments tab.
        </ScannerFocusBanner>
      ) : null}

      <ScannerMainPanel>
        <ScannerTabNav tabs={TAB_ITEMS} active={tab} onChange={setTab} />

        <ScannerPanelBody>
          {tab === 'accounts' ? (
            <ScannerAccountsSection
              scanners={scanners}
              events={events}
              onAddStaff={openCreateStaff}
              onGoToAssignments={goToAssignments}
              onChanged={reload}
            />
          ) : null}

          {tab === 'assign' ? (
            <ScannerAssignmentPanel
              events={events}
              initialEventId={assignEventId || focusEventId || undefined}
              onAssignmentsChange={reload}
            />
          ) : null}

          {tab === 'logs' ? (
            <div>
              <div className="mb-5">
                <h2 className="text-lg font-extrabold text-ink">Scan activity</h2>
                <p className="mt-1 text-[13px] text-ink-60">Last 30 check-ins across live events.</p>
              </div>
              {logs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-ink-20 bg-ink-5/25 px-6 py-12 text-center">
                  <ScanLine className="mx-auto h-8 w-8 text-ink-30" strokeWidth={1.5} aria-hidden />
                  <p className="mt-3 text-[14px] font-semibold text-ink">No scans yet</p>
                  <p className="mt-1 text-[13px] text-ink-50">Activity appears here once tickets are scanned at the gate.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-ink-10">
                  <table className="w-full min-w-[520px] border-collapse text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-ink-10 bg-ink-5/50 text-[11px] font-bold uppercase tracking-wide text-ink-50">
                        <th className="px-4 py-3">Ticket</th>
                        <th className="px-4 py-3">Result</th>
                        <th className="px-4 py-3">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-10">
                      {logs.map((l) => (
                        <tr key={l.id} className="bg-white transition hover:bg-ink-5/30">
                          <td className="px-4 py-3 font-mono font-semibold text-ink">{l.ticketRef}</td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase',
                                l.result === 'ok' ? 'bg-mint/25 text-ink' : 'bg-coral/15 text-coral'
                              )}
                            >
                              {l.result}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-ink-60">{new Date(l.at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </ScannerPanelBody>
      </ScannerMainPanel>

      {openCreateDialog ? (
        <ScannerDialogOverlay>
          <h3 className="text-xl font-extrabold text-ink">Add gate staff</h3>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-60">
            A login password is generated and emailed unless you set one below. Staff sign in at the scanner app with
            this email.
          </p>
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const next: { name?: string; email?: string; password?: string } = {};
              const nm = name.trim();
              const em = email.trim();
              const pw = password.trim();
              if (!nm) next.name = 'Name is required.';
              if (!em) next.email = 'Email is required.';
              else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) next.email = 'Enter a valid email address.';
              if (pw && pw.length < 8) next.password = 'Password must be at least 8 characters.';
              if (Object.keys(next).length > 0) {
                setScannerFieldErrors(next);
                return;
              }
              setScannerFieldErrors({});
              void (async () => {
                setCreating(true);
                try {
                  const result = await createScanner({
                    name: nm,
                    email: em,
                    password: pw || undefined,
                    gateLabel: gateLabel.trim() || undefined,
                    eventIds: createEventIds.length ? createEventIds : undefined,
                  });
                  setOpenCreateDialog(false);
                  if (result.credentialsEmailed) {
                    toast.success(`Login details were sent to ${em}.`);
                  } else {
                    toast.success('Scanner account created.');
                  }
                  await reload();
                } catch (err) {
                  const raw = firstMessagesFromApiError(err);
                  const fe: { name?: string; email?: string; password?: string } = {};
                  const nErr = pickApiFieldMessage(raw, 'name');
                  const eErr = pickApiFieldMessage(raw, 'email');
                  const pErr = pickApiFieldMessage(raw, 'password');
                  if (nErr) fe.name = nErr;
                  if (eErr) fe.email = eErr;
                  if (pErr) fe.password = pErr;
                  setScannerFieldErrors(fe);
                  if (!fe.name && !fe.email && !fe.password) {
                    toast.error(formatOrganizerApiError(err));
                  }
                } finally {
                  setCreating(false);
                }
              })();
            }}
          >
            <ScannerFormLabel error={scannerFieldErrors.name}>
              Name
              <input
                className={scannerInputErrorClass(Boolean(scannerFieldErrors.name))}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setScannerFieldErrors((c) => ({ ...c, name: undefined }));
                }}
                autoFocus
              />
            </ScannerFormLabel>
            <ScannerFormLabel error={scannerFieldErrors.email}>
              Email (scanner app login)
              <input
                type="email"
                className={scannerInputErrorClass(Boolean(scannerFieldErrors.email))}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setScannerFieldErrors((c) => ({ ...c, email: undefined }));
                }}
              />
            </ScannerFormLabel>
            <ScannerFormLabel error={scannerFieldErrors.password}>
              Password (optional)
              <PasswordInput
                autoComplete="new-password"
                className={scannerInputErrorClass(Boolean(scannerFieldErrors.password))}
                hasError={Boolean(scannerFieldErrors.password)}
                value={password}
                placeholder="Leave blank to email a generated password"
                onChange={(e) => {
                  setPassword(e.target.value);
                  setScannerFieldErrors((c) => ({ ...c, password: undefined }));
                }}
              />
            </ScannerFormLabel>
            <ScannerFormLabel>
              Gate label (optional)
              <input
                className={scannerInputErrorClass(false)}
                value={gateLabel}
                placeholder="e.g. North Entrance"
                onChange={(e) => setGateLabel(e.target.value)}
              />
            </ScannerFormLabel>
            {events.length > 0 ? (
              <fieldset className="rounded-2xl border border-ink-10 bg-ink-5/25 px-4 py-4">
                <legend className="px-1 text-[12px] font-semibold text-ink-60">Assign on create (optional)</legend>
                <ul className="mt-3 max-h-32 space-y-2 overflow-y-auto">
                  {events.map((ev) => (
                    <li key={ev.id}>
                      <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-ink">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-ink-20"
                          checked={createEventIds.includes(ev.id)}
                          onChange={() => toggleCreateEvent(ev.id)}
                        />
                        <span className="truncate">{ev.title}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            ) : null}
            <div className="flex flex-col-reverse gap-2 border-t border-ink-10 pt-4 sm:flex-row sm:justify-end">
              <Button variant="ghost" type="button" size="md" onClick={() => setOpenCreateDialog(false)} disabled={creating}>
                Cancel
              </Button>
              <Button type="submit" variant="dark" size="md" disabled={creating}>
                {creating ? 'Creating…' : 'Create & send login'}
              </Button>
            </div>
          </form>
        </ScannerDialogOverlay>
      ) : null}
    </div>
  );
}
