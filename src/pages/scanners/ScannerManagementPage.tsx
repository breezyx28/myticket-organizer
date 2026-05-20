import { Button } from '@/components/ui/Button';
import { ScannerAccountsSection } from '@/components/scanners/ScannerAccountsSection';
import { ScannerAssignmentPanel } from '@/components/scanners/ScannerAssignmentPanel';
import { createScanner, listScanners, listScanLogs } from '@/services/scannersService';
import { listEvents } from '@/services/eventsService';
import { formatOrganizerApiError } from '@/lib/api/extractOrganizerApiError';
import { firstMessagesFromApiError, pickApiFieldMessage } from '@/lib/api/apiValidationErrors';
import { toast } from '@/lib/appToast';
import type { OrganizerEvent, ScannerAccount } from '@/types/domain';
import { ScanLine, Users, QrCode } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

type ScannerTab = 'accounts' | 'assign' | 'logs';

const LIVE_STATUSES = new Set(['published', 'sold_out', 'in_progress']);

const TABS: { id: ScannerTab; label: string; description: string; Icon: typeof Users }[] = [
  { id: 'accounts', label: 'Accounts', description: 'Create & delete gate staff', Icon: Users },
  { id: 'assign', label: 'Assignments', description: 'Assign or unassign per event', Icon: QrCode },
  { id: 'logs', label: 'Scan logs', description: 'Recent check-ins', Icon: ScanLine },
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

  return (
    <div className="space-y-8 sm:space-y-10">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">Operations</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Scanner management</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-60">
          Manage gate staff accounts, control who can scan tickets at each event, and review recent check-ins.
        </p>
      </header>

      {focusEventId ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-indigo/30 bg-indigo/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[14px] text-ink">
            Assigning scanners for{' '}
            <strong className="font-bold">{events.find((e) => e.id === focusEventId)?.title ?? 'this event'}</strong>
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => goToAssignments(focusEventId)}>
            Open assignments
          </Button>
        </div>
      ) : null}

      <nav
        className="grid grid-cols-1 gap-2 sm:grid-cols-3"
        aria-label="Scanner sections"
      >
        {TABS.map(({ id, label, description, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex flex-col items-start gap-1 rounded-2xl border px-4 py-3.5 text-left transition ${
                active
                  ? 'border-ink bg-ink text-white shadow-card-sm'
                  : 'border-ink-10 bg-white text-ink hover:border-ink-20 hover:bg-ink-5/50'
              }`}
            >
              <span className="flex items-center gap-2 text-[13px] font-bold">
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                {label}
              </span>
              <span className={`text-[12px] leading-snug ${active ? 'text-white/75' : 'text-ink-50'}`}>
                {description}
              </span>
            </button>
          );
        })}
      </nav>

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
        <section className="rounded-3xl border border-ink-10 bg-ink p-6 text-white shadow-card-lg sm:p-8">
          <h2 className="text-xl font-extrabold tracking-tight">Recent scan logs</h2>
          <p className="mt-2 text-[14px] text-white/70">Last 30 check-ins across your live events.</p>
          <ul className="mt-6 space-y-3">
            {logs.map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-3.5 text-[13px]"
              >
                <span className="font-mono font-semibold text-white">{l.ticketRef}</span>
                <span className="font-bold uppercase text-lemon">{l.result}</span>
                <span className="text-white/70">{new Date(l.at).toLocaleString()}</span>
              </li>
            ))}
            {logs.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-white/20 px-4 py-8 text-center text-white/60">
                No scan activity yet.
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {openCreateDialog ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-ink-10 bg-white p-6 shadow-card-lg sm:p-8">
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
              <label className="block text-[12px] font-semibold text-ink-60">
                Name
                <input
                  className={`mt-1.5 h-10 w-full rounded-xl border bg-white px-3 text-[14px] ${
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
                  className={`mt-1.5 h-10 w-full rounded-xl border bg-white px-3 text-[14px] ${
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
                  className={`mt-1.5 h-10 w-full rounded-xl border bg-white px-3 text-[14px] ${
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
                  className="mt-1.5 h-10 w-full rounded-xl border border-ink-10 bg-white px-3 text-[14px]"
                  value={gateLabel}
                  placeholder="e.g. North Entrance"
                  onChange={(e) => setGateLabel(e.target.value)}
                />
              </label>
              {events.length > 0 ? (
                <fieldset className="rounded-2xl border border-ink-10 bg-ink-5/30 px-4 py-4">
                  <legend className="px-1 text-[12px] font-semibold text-ink-60">
                    Assign to events on create (optional)
                  </legend>
                  <ul className="mt-3 max-h-36 space-y-2.5 overflow-y-auto">
                    {events.map((ev) => (
                      <li key={ev.id}>
                        <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-ink">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
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
              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <Button variant="ghost" type="button" size="md" onClick={() => setOpenCreateDialog(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button type="submit" variant="dark" size="md" disabled={creating}>
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
