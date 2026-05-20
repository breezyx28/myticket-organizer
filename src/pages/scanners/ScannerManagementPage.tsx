import { Button } from '@/components/ui/Button';
import { ScannerAssignmentPanel } from '@/components/scanners/ScannerAssignmentPanel';
import { createScanner, deleteScanner, listScanners, listScanLogs } from '@/services/scannersService';
import { listEvents } from '@/services/eventsService';
import { formatOrganizerApiError } from '@/lib/api/extractOrganizerApiError';
import { firstMessagesFromApiError, pickApiFieldMessage } from '@/lib/api/apiValidationErrors';
import { toast } from '@/lib/appToast';
import type { OrganizerEvent, ScannerAccount } from '@/types/domain';
import { ClipboardList, QrCode, ScanLine, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

type ScannerTab = 'accounts' | 'assign' | 'logs';

const LIVE_STATUSES = new Set(['published', 'sold_out', 'in_progress']);

export function ScannerManagementPage() {
  const [searchParams] = useSearchParams();
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

  function toggleCreateEvent(eventId: string) {
    setCreateEventIds((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">Operations</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Scanner management</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-ink-60">
          Create gate staff (login credentials are emailed automatically), assign multiple scanners per event, and
          review scan logs. Remove staff with delete — assignments and devices are revoked on the server.
        </p>
      </div>
      {focusEventId ? (
        <div className="rounded-2xl border border-indigo/30 bg-indigo/10 px-4 py-3 text-[13px] text-ink">
          Focus event: <strong>{events.find((e) => e.id === focusEventId)?.title ?? focusEventId}</strong>. Assign
          scanners in the Assignments tab.
        </div>
      ) : null}

      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
        {(
          [
            ['accounts', 'Accounts', Users],
            ['assign', 'Assignments', QrCode],
            ['logs', 'Scan logs', ScanLine],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-[12px] font-bold ${
              tab === id ? 'bg-ink text-white shadow-card-sm' : 'bg-ink-5 text-ink-60 ring-1 ring-ink-10 hover:bg-ink-5/80'
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'assign' ? (
        <ScannerAssignmentPanel events={events} initialEventId={focusEventId || undefined} onAssignmentsChange={reload} />
      ) : null}

      {tab === 'accounts' ? (
        <section className="rounded-3xl border border-ink-10 bg-white p-6 shadow-card-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-ink-50" />
              <h2 className="text-lg font-extrabold text-ink">Scanner accounts</h2>
            </div>
            <Button
              variant="dark"
              size="sm"
              onClick={() => {
                setName('');
                setEmail('');
                setPassword('');
                setGateLabel('');
                setCreateEventIds(focusEventId ? [focusEventId] : []);
                setScannerFieldErrors({});
                setOpenCreateDialog(true);
              }}
            >
              Add gate staff
            </Button>
          </div>
          <ul className="mt-4 divide-y divide-ink-10">
            {scanners.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-bold text-ink">{s.name}</p>
                  <p className="text-[12px] text-ink-60">{s.email}</p>
                  <p className="mt-1 text-[11px] text-ink-40">
                    {s.assignedEventIds.length} event assignment(s) · {s.active ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-coral hover:border-coral/40 hover:bg-coral/10"
                  onClick={() => {
                    if (!window.confirm(`Remove scanner "${s.name}"? They will lose access and all assignments.`)) {
                      return;
                    }
                    void (async () => {
                      try {
                        await deleteScanner(s.id);
                        toast.success('Scanner account removed.');
                        await reload();
                      } catch (err) {
                        toast.error(formatOrganizerApiError(err));
                      }
                    })();
                  }}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                  Remove
                </Button>
              </li>
            ))}
            {scanners.length === 0 ? <li className="py-4 text-[13px] text-ink-40">No scanner accounts yet.</li> : null}
          </ul>
        </section>
      ) : null}

      {tab === 'logs' ? (
        <section className="rounded-3xl border border-ink-10 bg-ink p-6 text-white shadow-card-lg">
          <h2 className="text-lg font-extrabold">Recent scan logs</h2>
          <ul className="mt-4 space-y-2 text-[13px] text-white/80">
            {logs.map((l) => (
              <li key={l.id} className="flex flex-wrap justify-between gap-2 rounded-2xl bg-white/10 px-4 py-3">
                <span className="font-mono font-semibold text-white">{l.ticketRef}</span>
                <span className="font-bold uppercase text-lemon">{l.result}</span>
                <span>{new Date(l.at).toLocaleString()}</span>
              </li>
            ))}
            {logs.length === 0 ? <li>No scan logs.</li> : null}
          </ul>
        </section>
      ) : null}

      {openCreateDialog ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-ink-10 bg-white p-6 shadow-card-lg">
            <h3 className="text-lg font-extrabold text-ink">Add gate staff</h3>
            <p className="mt-1 text-[13px] text-ink-60">
              A login password is generated and emailed unless you set one below. Staff sign in at the scanner app with
              this email.
            </p>
            <form
              className="mt-4 space-y-3"
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
              <label className="block text-[12px] font-semibold text-ink-60">
                Name
                <input
                  className={`mt-1 w-full rounded-xl border bg-white px-3 py-2 text-[14px] ${
                    scannerFieldErrors.name ? 'border-coral' : 'border-ink-10'
                  }`}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setScannerFieldErrors((c) => ({ ...c, name: undefined }));
                  }}
                  autoFocus
                />
                {scannerFieldErrors.name ? <p className="mt-1 text-[12px] text-coral">{scannerFieldErrors.name}</p> : null}
              </label>
              <label className="block text-[12px] font-semibold text-ink-60">
                Email (scanner app login)
                <input
                  type="email"
                  className={`mt-1 w-full rounded-xl border bg-white px-3 py-2 text-[14px] ${
                    scannerFieldErrors.email ? 'border-coral' : 'border-ink-10'
                  }`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setScannerFieldErrors((c) => ({ ...c, email: undefined }));
                  }}
                />
                {scannerFieldErrors.email ? <p className="mt-1 text-[12px] text-coral">{scannerFieldErrors.email}</p> : null}
              </label>
              <label className="block text-[12px] font-semibold text-ink-60">
                Password (optional)
                <input
                  type="password"
                  autoComplete="new-password"
                  className={`mt-1 w-full rounded-xl border bg-white px-3 py-2 text-[14px] ${
                    scannerFieldErrors.password ? 'border-coral' : 'border-ink-10'
                  }`}
                  value={password}
                  placeholder="Leave blank to email a generated password"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setScannerFieldErrors((c) => ({ ...c, password: undefined }));
                  }}
                />
                {scannerFieldErrors.password ? (
                  <p className="mt-1 text-[12px] text-coral">{scannerFieldErrors.password}</p>
                ) : null}
              </label>
              <label className="block text-[12px] font-semibold text-ink-60">
                Gate label (optional, shown in welcome email)
                <input
                  className="mt-1 w-full rounded-xl border border-ink-10 bg-white px-3 py-2 text-[14px]"
                  value={gateLabel}
                  placeholder="e.g. North Entrance"
                  onChange={(e) => setGateLabel(e.target.value)}
                />
              </label>
              {events.length > 0 ? (
                <fieldset className="rounded-xl border border-ink-10 bg-ink-5/30 px-3 py-3">
                  <legend className="px-1 text-[12px] font-semibold text-ink-60">Assign to events on create (optional)</legend>
                  <ul className="mt-2 max-h-36 space-y-2 overflow-y-auto">
                    {events.map((ev) => (
                      <li key={ev.id}>
                        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink">
                          <input
                            type="checkbox"
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
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={() => setOpenCreateDialog(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button type="submit" variant="dark" disabled={creating}>
                  {creating ? 'Creating…' : 'Create & send login'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
