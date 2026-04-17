# MyTicket — Organizer Dashboard (standalone)

Mock-first organizer application described in `myticket_organizer_dashboard_flow.md`. UI follows `CLAUDE_DESIGN_SYSTEM.md` (Plus Jakarta Sans, Space Grotesk numerals, token colors, Lucide icons).

## Scripts

```bash
npm install
npm run dev
npm run build
npm run test
```

Dev server: [http://localhost:5174](http://localhost:5174)

## Demo login

- Email: `organizer@myticket.demo`
- Password: any string with length ≥ 4  
- Or use **Continue with Google (demo)**

Non-organizer demo: use an email containing `attendee` — login will show access denied.

## Main website handoff

Point the main site env `VITE_ORGANIZER_DASHBOARD_URL` to this dev server, e.g.:

`VITE_ORGANIZER_DASHBOARD_URL=http://localhost:5174`
