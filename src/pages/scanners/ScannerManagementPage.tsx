import { Button } from '@/components/ui/Button';
import { ScannerAssignmentPanel } from '@/components/scanners/ScannerAssignmentPanel';
import { createScanner, listScanners, listScanLogs } from '@/services/scannersService';
import { listEvents } from '@/services/eventsService';
import { formatOrganizerApiError } from '@/lib/api/extractOrganizerApiError';
import { firstMessagesFromApiError, pickApiFieldMessage } from '@/lib/api/apiValidationErrors';
import { toast } from '@/lib/appToast';
import type { OrganizerEvent, ScannerAccount } from '@/types/domain';
import { ClipboardList, QrCode, ScanLine, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

type ScannerTab = 'accounts' | 'assign' | 'logs';

export function ScannerManagementPage() {
  const [searchParams] = useSearchParams();
  const focusEventId = searchParams.get('eventId') ?? '';
  const [scanners, setScanners] = useState<ScannerAccount[]>([]);
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof listScanLogs>>>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tab, setTab] = useState<ScannerTab>('accounts');
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [scannerFieldErrors, setScannerFieldErrors] = useState<{ name?: string; email?: string }>({});

  async function reload() {
    const [s, e, l] = await Promise.all([listScanners(), listEvents(), listScanLogs()]);
    setScanners(s);
    setEvents(e.filter((x) => x.status === 'published' || x.status === 'sold_out' || x.status === 'in_progress'));
    setLogs(l.slice(-30).reverse());
  }

  useEffect(() => {
    const t = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="space-y-10">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-40">Operations</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Scanner management</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-ink-60">
          Create scanner accounts, assign them to published events, and review recent scan attempts. Editing or deleting scanner accounts is not available in the documented organizer API — use unassign and device revoke on the backend when supported.
        </p>
      </div>
      {focusEventId ? (
        <div className="rounded-2xl border border-indigo/30 bg-indigo/10 px-4 py-3 text-[13px] text-ink">
          Focus event: <strong>{events.find((e) => e.id === focusEventId)?.title ?? focusEventId}</strong>. Assign scanners below.
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

      {tab === 'assign' ? <ScannerAssignmentPanel events={events} initialEventId={focusEventId || undefined} /> : null}

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
                setScannerFieldErrors({});
                setOpenCreateDialog(true);
              }}
            >
              Create scanner
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
          <div className="w-full max-w-lg rounded-3xl border border-ink-10 bg-white p-6 shadow-card-lg">
            <h3 className="text-lg font-extrabold text-ink">Create scanner account</h3>
            <p className="mt-1 text-[13px] text-ink-60">Add a new scanner user for assignment across live events.</p>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const next: { name?: string; email?: string } = {};
                const nm = name.trim();
                const em = email.trim();
                if (!nm) next.name = 'Name is required.';
                if (!em) next.email = 'Email is required.';
                else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) next.email = 'Enter a valid email address.';
                if (Object.keys(next).length > 0) {
                  setScannerFieldErrors(next);
                  return;
                }
                setScannerFieldErrors({});
                void (async () => {
                  try {
                    await createScanner({ name: nm, email: em, active: true, assignedEventIds: [] });
                    setName('');
                    setEmail('');
                    setOpenCreateDialog(false);
                    toast.success('Scanner account created.');
                    await reload();
                  } catch (err) {
                    const raw = firstMessagesFromApiError(err);
                    const fe: { name?: string; email?: string } = {};
                    const nErr = pickApiFieldMessage(raw, 'name');
                    const eErr = pickApiFieldMessage(raw, 'email');
                    if (nErr) fe.name = nErr;
                    if (eErr) fe.email = eErr;
                    setScannerFieldErrors(fe);
                    if (!fe.name && !fe.email) {
                      toast.error(formatOrganizerApiError(err));
                    }
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
                Email
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
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setOpenCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="dark">
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
