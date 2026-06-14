import { useCallback, useEffect, useState } from 'react';
import { MessageSquarePlus, X } from 'lucide-react';

type Comment = {
  id: string;
  variant: string;
  selector: string;
  elementDescription: string;
  text: string;
};

function getVariantFromElement(el: Element | null): string {
  let node: Element | null = el;
  while (node) {
    const variant = node.getAttribute('data-variant');
    if (variant) return variant;
    node = node.parentElement;
  }
  return 'Unknown';
}

function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const testId = el.getAttribute('data-testid');
  const text = (el.textContent ?? '').trim().slice(0, 40);
  if (testId) return `${tag} with data-testid="${testId}"`;
  if (text) return `${tag} with "${text}"`;
  const cls = el.className;
  if (typeof cls === 'string' && cls.trim()) {
    const first = cls.split(/\s+/).find((c) => c && !c.startsWith('hover:'));
    if (first) return `${tag}.${first}`;
  }
  return tag;
}

function buildSelector(el: Element): string {
  const testId = el.getAttribute('data-testid');
  if (testId) return `[data-testid='${testId}']`;
  const id = el.id;
  if (id) return `#${id}`;
  const tag = el.tagName.toLowerCase();
  const cls = el.className;
  if (typeof cls === 'string') {
    const stable = cls.split(/\s+/).find((c) => c && !c.includes(':') && !c.startsWith('['));
    if (stable) return `${tag}.${stable}`;
  }
  return tag;
}

function formatFeedback(targetName: string, comments: Comment[], overall: string): string {
  const byVariant = new Map<string, Comment[]>();
  for (const c of comments) {
    const list = byVariant.get(c.variant) ?? [];
    list.push(c);
    byVariant.set(c.variant, list);
  }

  let out = `## Design Lab Feedback\n\n**Target:** ${targetName}\n**Comments:** ${comments.length}\n`;
  for (const [variant, items] of [...byVariant.entries()].sort()) {
    out += `\n### Variant ${variant}\n`;
    items.forEach((item, i) => {
      out += `${i + 1}. **${item.elementDescription.split(' ')[0] ?? 'Element'}** (\`${item.selector}\`, ${item.elementDescription})\n   "${item.text}"\n`;
    });
  }
  out += `\n### Overall Direction\n${overall.trim() || '(none provided)'}\n`;
  return out;
}

export function FeedbackOverlay({ targetName }: { targetName: string }) {
  const [picking, setPicking] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState('');
  const [overall, setOverall] = useState('');
  const [pending, setPending] = useState<{ el: Element; variant: string; selector: string; desc: string } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const onDocClick = useCallback(
    (e: MouseEvent) => {
      if (!picking) return;
      const target = e.target as Element | null;
      if (!target?.closest('[data-feedback-root]')) return;
      if (target.closest('[data-feedback-ui]')) return;

      e.preventDefault();
      e.stopPropagation();

      const clickable = target.closest('button, a, input, label, h1, h2, h3, h4, p, form, section, article, [data-testid]') ?? target;
      setPending({
        el: clickable,
        variant: getVariantFromElement(clickable),
        selector: buildSelector(clickable),
        desc: describeElement(clickable),
      });
      setDraft('');
      setPicking(false);
      setPanelOpen(true);
    },
    [picking]
  );

  useEffect(() => {
    if (!picking) return;
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, [picking, onDocClick]);

  useEffect(() => {
    document.body.style.cursor = picking ? 'crosshair' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [picking]);

  function saveComment() {
    if (!pending || !draft.trim()) return;
    setComments((cur) => [
      ...cur,
      {
        id: `${Date.now()}`,
        variant: pending.variant,
        selector: pending.selector,
        elementDescription: pending.desc,
        text: draft.trim(),
      },
    ]);
    setPending(null);
    setDraft('');
  }

  async function submitAll() {
    const text = formatFeedback(targetName, comments, overall);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      window.prompt('Copy this feedback:', text);
    }
  }

  return (
    <div data-feedback-ui>
      <button
        type="button"
        data-feedback-ui
        onClick={() => {
          setPicking((p) => !p);
          setPanelOpen(true);
        }}
        className="fixed bottom-6 right-6 z-[200] inline-flex h-12 items-center gap-2 rounded-full bg-ink px-5 text-[14px] font-semibold text-white shadow-[0_12px_32px_rgba(0,0,0,0.18)] transition hover:bg-ink-80 active:scale-[0.98]"
      >
        <MessageSquarePlus size={18} strokeWidth={2} aria-hidden />
        {picking ? 'Click an element…' : 'Add Feedback'}
      </button>

      {panelOpen ? (
        <div
          data-feedback-ui
          className="fixed bottom-24 right-6 z-[200] w-[min(100vw-2rem,380px)] rounded-2xl border border-ink-10 bg-white p-4 shadow-[0_20px_48px_rgba(0,0,0,0.12)]"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[13px] font-extrabold text-ink">Feedback panel</p>
            <button
              type="button"
              data-feedback-ui
              className="rounded-lg p-1 text-ink-40 hover:bg-ink-5 hover:text-ink"
              onClick={() => setPanelOpen(false)}
              aria-label="Close panel"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {pending ? (
            <div className="mb-4 space-y-2 rounded-xl bg-surface-tint p-3">
              <p className="text-[11px] font-bold uppercase text-ink-40">Variant {pending.variant}</p>
              <p className="font-mono text-[11px] text-ink-60">{pending.selector}</p>
              <textarea
                data-feedback-ui
                className="w-full rounded-xl border border-ink-10 px-3 py-2 text-[13px] outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
                rows={3}
                placeholder="Your comment…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  data-feedback-ui
                  className="rounded-full bg-coral px-4 py-2 text-[12px] font-semibold text-white"
                  onClick={saveComment}
                >
                  Save
                </button>
                <button
                  type="button"
                  data-feedback-ui
                  className="rounded-full px-3 py-2 text-[12px] font-semibold text-ink-60"
                  onClick={() => setPending(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {comments.length > 0 ? (
            <ul className="mb-3 max-h-32 space-y-2 overflow-y-auto text-[12px] text-ink-60">
              {comments.map((c) => (
                <li key={c.id} className="rounded-lg bg-ink-5 px-2 py-1.5">
                  <span className="font-bold text-ink">[{c.variant}]</span> {c.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-3 text-[12px] text-ink-40">No comments yet. Click Add Feedback, then click any element.</p>
          )}

          <label className="block">
            <span className="text-[11px] font-bold uppercase text-ink-40">Overall direction (required)</span>
            <textarea
              data-feedback-ui
              className="mt-1 w-full rounded-xl border border-ink-10 px-3 py-2 text-[13px] outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
              rows={3}
              placeholder="Which variant wins? What should change?"
              value={overall}
              onChange={(e) => setOverall(e.target.value)}
            />
          </label>

          <button
            type="button"
            data-feedback-ui
            disabled={!overall.trim() || comments.length === 0}
            onClick={() => void submitAll()}
            className="mt-3 w-full rounded-full bg-ink py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
          >
            {copied ? 'Copied to clipboard' : 'Submit all feedback'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
