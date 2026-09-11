# WhatsAppTaskManager — Final Dashboard Product Specification

**Role:** Senior Product Designer + UX Architect
**Status:** Specification for approval — no implementation code included
**Scope:** Complete dashboard UI/UX redesign, preserving all existing functionality

---

## A. Product Vision

### UX Philosophy

The dashboard exists to answer one question the instant it loads: **"What do I need to do, and what happens if I don't?"** Every design decision below is graded against five criteria, in this priority order:

1. **Urgency** — overdue and due-today items must be impossible to miss, and must outrank everything else visually.
2. **Actionability** — a task should be completable, deletable, or dismissible without more than one click beyond opening it.
3. **Scannability** — the eye should be able to sweep 20+ tasks in a few seconds and understand priority/status without reading every line.
4. **Context** — a task is meaningless without knowing who sent it and what the original message said; that context must be one click away, never more.
5. **Organization** — sender/date/priority structure should be visible in the data, not something the user reconstructs manually.

Density and whitespace are treated as a trade-off, not an aesthetic preference: the current dashboard fails on both ends at once (bloated rows *and* wasted rail space). The fix is a genuine information-density upgrade — smaller row heights, tighter type, more visible tasks per screen — not decoration.

### Primary Workflow

```
Open dashboard
   → Land on "Today" (default view) — see Overdue + Due Today, already triaged
   → Scan compact task rows (title, priority, deadline, sender all visible, no clicking required)
   → Click a task → Task Details opens as a floating panel over the list (list stays visible behind it)
   → Read original WhatsApp message, confirm details
   → Mark Complete / Delete / Close
   → Return to the same scroll position in the list, task visually updates (strikethrough → fades out or moves to Completed)
```

Secondary workflows (sender groups, calendar, search, filters) all funnel into the **same** Task Details component — there is exactly one way a task ever gets inspected in this product.

---

## B. Complete Information Architecture

**Final navigation structure (left sidebar, top-level):**

| Item | Purpose |
|---|---|
| **Today** *(default landing view)* | Overdue + Due Today, split into two clearly labeled sections. This replaces the current dead "Today's Agenda" widget — see Section G. |
| **All Tasks** | Full unfiltered task list, default sort by deadline ascending (soonest first) rather than "recent," since urgency > recency for a task manager. |
| **Upcoming** | Pending tasks with a future deadline, beyond today. |
| **Overdue** | Same data as the Overdue section on Today, but as a dedicated full-screen triage workspace with bulk actions (Section H). Kept as its own nav item *and* embedded in Today — they are the same underlying query, not two features. |
| **High Priority** | Pending tasks flagged High, regardless of deadline. |
| **Completed** | Historical log, most-recently-completed first. |
| **Calendar** | Month / Agenda toggle (unchanged structural concept, redesigned visuals — Section I). |
| **Sender Groups** | Replaces the current always-expanded sidebar sender list with a dedicated, searchable, collapsible section (Section J). |

**Change from current IA:** Sender Groups moves from "always visible, taking permanent vertical space in the left rail" to a collapsed-by-default nav entry with its own view, reached the same way Calendar is reached. The sidebar's job becomes *navigation*, not *sender browsing* — this directly addresses "sidebar feels rigid" and "wall of two-letter badges."

**What does NOT change:** the underlying meaning of every filter (Pending/Completed/High Priority/Overdue) is identical to today. This is a UI/IA reorganization, not a redefinition of what counts as overdue, pending, etc.

---

## C. Final Desktop Layout

```
┌─────────────┬───────────────────────────────────────────┬───────────────┐
│  Sidebar    │            Main Workspace                  │  Context Rail │
│  (nav +     │  Header (view title, tabs, sort, search)   │  (metrics,    │
│  sender     │  ─────────────────────────────────────     │   today's     │
│  groups,    │  Task list (compact rows, scrollable)      │   snapshot)   │
│  collapsed) │                                             │               │
│             │  [Task Details opens as an overlay HERE,    │               │
│             │   list dims/blurs slightly behind it]       │               │
└─────────────┴───────────────────────────────────────────┴───────────────┘
```

This three-column skeleton is kept because it matches the existing app's mental model and all current features map onto it cleanly — but its **proportions change substantially**:

- **Sidebar:** narrows from its current fixed width to a slim nav rail (~72px collapsed icon-only, ~220px expanded with labels). Sender Groups is *not* rendered inline here anymore (see B) — it becomes a normal nav entry, collapsing the biggest source of current sidebar bloat.
- **Main workspace:** becomes the dominant area, roughly 60–70% of viewport width instead of today's ~55%, because it no longer competes with a permanently-expanded sender list.
- **Context rail:** stays right-aligned but shrinks to fit only Quick Metrics + Today's Snapshot (a small "N overdue, N due today" line, replacing the currently-dead Today's Agenda widget). It is not a task-details panel and never was — that requirement is already satisfied by the modal approach in images 2/5, which is correct and is kept.

**Task Details never consumes permanent layout space.** It is confirmed here as an overlay (floating panel/modal), matching what's already shipped (image 2, image 5) and matching your explicit requirement in item C. This is preserved, not rebuilt.

---

## D. Resizable Panels

| Panel | Min width | Max width | Default | Collapse behavior | Persistence |
|---|---|---|---|---|---|
| Sidebar | 72px (icon-only) | 280px | 220px expanded | Collapses to icon rail via a toggle button; auto-collapses below 1280px viewport | Width + collapsed state saved to `localStorage`/user preference, restored on load |
| Main workspace | 480px | flexible (fills remaining space) | flexible | Never collapses — it's the primary content | N/A |
| Context rail | 240px | 360px | 280px | Collapses fully (hidden) via a toggle; auto-hides below 1024px viewport | Width + hidden state saved, restored on load |

**Drag resize:** a thin (4px) drag handle sits on the sidebar's right edge and the context rail's left edge. Dragging updates width in real time with a subtle resize cursor; releasing snaps to the nearest 8px to avoid sub-pixel jitter. No resize handle on the main workspace — it's the flexible middle, not a fixed panel.

**Fragility guardrail:** resizing is CSS `flex-basis`/`grid-template-columns` driven, not JS-computed pixel math per task row — so panel resize never triggers a reflow/re-render of the task list's internal layout. The task list is responsive to *its own* container width (see below) independent of how that width was produced.

**Mobile behavior:** resizing is disabled entirely. Sidebar and context rail collapse into the mobile navigation pattern described in Section N (bottom nav / drawer), not into narrow desktop-style columns.

---

## E. Task List

This is the highest-priority fix, since it's the direct answer to "not congested, not collapsed."

**Design principle:** every piece of information you listed (checkbox, title, priority, deadline, sender, short message snippet) is **always visible, always on one row**, with no click-to-expand and no accordion. Density comes from tighter spacing and smaller type, not from hiding data.

**Row anatomy (single line, left to right):**

```
[ ] ● Title of the task ............................... [Priority pill]  [Deadline]  [Sender ·]
      ↳ short one-line message snippet, muted/smaller text, truncated with ellipsis
```

- **Checkbox** — square, left-aligned, 18×18px.
- **Priority indicator** — a small colored dot (4–6px) directly before the title, *not* a text badge. Color communicates priority at a glance without adding a text element to scan. A separate small "Overdue" text pill still appears at the right when applicable (red), since overdue is a distinct signal from priority.
- **Title** — 14–15px medium weight, single line, truncates with ellipsis if too long (full title always available in Task Details).
- **Snippet line** — directly beneath the title, 12–13px, muted gray, single line, ellipsis-truncated. This is the one-line preview of the original message — always visible, never requiring a click. It is *not* the 3–4 line preview box from the current design; that verbose block moves exclusively into Task Details.
- **Sender** — right-aligned, shown as the cleaned sender name (post senderKey-fix — see Section J) plus a small message-count indicator, e.g. `Kishor M · 2`.
- **Deadline** — right-aligned, compact date format (`Sep 6, 5:29 AM` → can shorten to `Sep 6` with time on hover/tooltip if width is tight).

**Approximate row height:** 56–64px including the snippet line (versus the current design's ~160–180px per card). This alone should let roughly 2.5–3x more tasks fit in the same viewport height, which is the direct fix for "each task consumes too much vertical space."

**Row spacing:** 1px hairline divider between rows (not full card borders/shadows per row — card-per-row styling is part of what makes the current version feel heavy). Rows get a subtle background tint on hover to indicate they're clickable, and a light left-edge accent color for overdue/high-priority rows so the *list itself* — not just the calendar — carries a glanceable status signal.

**What explicitly does NOT happen:** no inline accordion/expand-in-place. Clicking anywhere on the row opens Task Details (Section F). This satisfies "do not hide important information behind expansion" while still keeping rows compact, because the *summary* information is never hidden — only the *full message + metadata* (which nobody scans 36 of in a list) lives behind a click, exactly as it already does successfully in your shipped modal.

---

## F. Task Details

**Confirms and extends what's already shipped** (image 2, image 5) as the single reusable component. No second implementation is created for calendar/search/sender-group entry points — every entry point calls the same component with a `taskId`.

**Entry points (all identical behavior):** All Tasks, Today, Overdue, Upcoming, Completed, High Priority, Sender Group, Calendar (Month + Agenda), Search results.

**Contents (unchanged from current, since it's already correct):**
- Title, Status pill, Priority pill, Overdue pill (if applicable)
- Deadline, Sender (with message count folded in, as today), Created timestamp
- Original WhatsApp message (scrollable block, monospace-adjacent styling preserved)
- Links (if the message contained one — "Open Link" affordance, as in image 1's row-level button, also surfaced inside Details)
- Completion action, Delete action, Close action

**One explicit change requested by you:** the completion control becomes a **clear square/checkbox-style button** (not circular) — matching the row checkbox style used in the list, so the visual language of "this is a checkbox for completing a task" is consistent everywhere it appears (row, details, bulk-triage). This is a small but deliberate consistency fix.

**Interaction behavior:**
- **Open animation:** scale-and-fade in from ~96% to 100% opacity/scale over ~150ms, centered over the workspace, with the task list behind it dimmed (a semi-transparent scrim, ~40% black) and given a slight blur so it reads as "still there" without competing for attention. This matches your requirement that "the underlying task list should remain visible behind it where practical."
- **Close behavior:** the X button, clicking the scrim (click-outside), and **Escape** key all close it identically — fade-and-scale-down, ~120ms, return focus to the row that was clicked.
- **Mobile:** the same component renders as a full-screen sheet (slides up from the bottom, not centered) since a centered modal with a dimmed background doesn't work well on small viewports — see Section N.

---

## G. Today

Today is redefined so it can never be "empty while 15 overdue tasks exist," which was the sharpest logical gap in the current design.

```
TODAY

⚠ OVERDUE (15)
  [compact task row]
  [compact task row]
  ...

📅 DUE TODAY (0)
  [compact task row]
  ...
```

- Both sections use the exact same compact row component from Section E — no separate styling system invented for Today.
- **Overdue** section header uses a warm/red accent and shows a live count; it is a filtered view of the same "Overdue" data as the dedicated Overdue triage view, so anything actioned here (mark complete, bulk actions if you enable bulk mode inline — see H) reflects everywhere instantly.
- **Due Today** section shows tasks whose deadline falls within today's calendar date, sorted by time ascending.

**Empty states:**
- Overdue section empty → `"Nothing overdue — you're on top of it."` with a small checkmark icon, shown *only* when that section specifically has zero items (not a whole-page empty state, since Due Today might still have items).
- Due Today section empty → `"Nothing due today."` — quieter, no icon, since an empty Due Today is normal and not an achievement to celebrate the way clearing overdue is.
- Both empty (true zero-task day) → replaces both sections with the existing "You're all caught up" pattern from image 3, which you already identified as a good, keepable pattern.

---

## H. Overdue Triage

A dedicated workflow, reachable both as its own nav item and inline within Today.

**Controls:**
- Individual checkboxes on every row (reusing the same checkbox element as the main list — no new component).
- A **"Select all"** checkbox in the section header.
- Multi-select via checkbox clicks; selecting any row switches the section header's right side from "Sort by" into a **bulk action bar**: `N selected · Mark Complete · Delete · Clear selection`.
- **Bulk Mark Complete:** immediate, optimistic UI update (rows fade/strike immediately, count updates), no confirmation dialog — this is a low-risk, reversible-in-spirit action (a completed task can be reopened from Completed if your API supports it; if not, flag that as a possible future affordance, not a blocker).
- **Bulk Delete:** requires a confirmation step (`Delete 6 tasks? This can't be undone.`) since deletion is destructive and irreversible — this is the one bulk action that gets a confirmation, deliberately inconsistent with Mark Complete because the risk profile is different.
- **Clear selection:** resets checkboxes, returns the bar to normal sort/filter controls.

**Bulk rescheduling — evaluated, not included in this phase.** Rescheduling implies picking a new deadline per task or in bulk, which either requires a new "reschedule to X" bulk endpoint or opening each task individually anyway (defeating the point of bulk action). Given your instruction to prefer existing APIs, this is flagged as **SHOULD HAVE, not MUST HAVE** — see Section Q. Snooze (Section Q) covers most of the same real-world need ("I saw it, not now") with a much smaller API surface, and should ship first; true rescheduling can follow once snooze proves the pattern.

---

## I. Calendar

**Month view:** kept structurally (your truncation/"+2 more" fix already closed the core bug — not touched). Pills gain a visual status system:

| State | Treatment |
|---|---|
| Completed | Muted gray background, strikethrough text |
| Overdue | Red-tinted background, solid left border |
| High Priority (pending, not overdue) | Amber/orange-tinted background |
| Normal pending | Neutral/blue-tinted background, thinner border |

This directly fixes "every pill looks identical" — the calendar becomes scannable for pattern recognition (a wall of red on a given week immediately reads as "bad week"), which is the whole point of a calendar view.

**Agenda view:** same status-color system applied to its list rows, using the Section E compact-row component rather than a separately styled agenda row — one row component, reused everywhere a task is listed.

**+N more behavior:** clicking "+2 more" opens a small popover listing the remaining tasks for that day (compact rows again), each of which opens Task Details on click — it does not navigate away from the calendar. This avoids introducing a third "day view" screen just to see the overflow.

**Clicking any calendar task (pill or agenda row) opens the same Task Details component from Section F.** No separate calendar-specific details implementation — confirmed as required by your spec and consistent with what's already shipped.

---

## J. Sender Groups

**Data contract — confirmed as non-negotiable and unchanged from your instructions:**

- `task.sender` = original display value, **never mutated**.
- `task.senderKey` = normalized identity used only for grouping/filtering/deduplication, **never displayed**.
- No blind stripping of arbitrary sender text. Before any normalization logic changes, the actual raw `sender` values in the database need to be inspected (a simple `SELECT DISTINCT sender FROM tasks` sample) so the fix targets the real variation patterns rather than a guess. The `": ~SenderName"` pattern flagged earlier is a plausible lead, not a confirmed fix — verify against real data first.

**Sender Group UI (once fragmentation is fixed):**
- Reached via its own nav item (Section B), not permanently inline in the sidebar.
- List of sender groups sorted by task count descending (most active senders first, as previously recommended).
- Each row: cleaned sender display name, task count, and a small avatar treatment that **avoids ambiguous two-letter codes** — prefer a colored dot keyed to a hash of `senderKey`, or the sender's first initial only, over two-letter abbreviations that read as noise at a glance (directly fixes "wall of near-identical two-letter badges").
- Clicking a sender group opens a filtered task list (reusing the All Tasks compact-row list, filtered by `senderKey`) — not a new list implementation.
- A lightweight filter input at the top of this view (`Filter senders...`) is kept, since it already works and is useful once the underlying fragmentation is resolved.

---

## K. Search

**Scope:** title, original message, sender (display value), deadline, priority — as specified.

**Behavior:**
- Global search (⌘K, already present) opens a command-palette-style overlay, not a full-page navigation — keeps the user's current view intact underneath.
- Results render as compact rows (same component again), grouped loosely by relevance (title matches first, then message-content matches, then sender matches) rather than as separate visual sections, to avoid the palette feeling cluttered.
- **Opening a search result opens Task Details directly** (Section F), closing the search overlay behind it — search is a way to *find and open* a task, not a separate browsing surface.
- Empty/no-results state: see Section P.

---

## L. Filtering + Sorting

**Filters (kept simple, one row, no cluttered filter panel):**
- Status: All / Pending / Completed
- Priority: All / High / Medium / Low
- Sender: via the Sender Groups view, not duplicated as a dropdown in every list (avoids two competing ways to filter by sender)
- Deadline range: optional, exposed only inside a single "More filters" popover rather than as permanent inline controls, since deadline-range filtering is a secondary/occasional need, not a constant one.

**Sorting:** a single dropdown — Deadline (soonest first, default for Today/Upcoming/Overdue) / Priority (High→Low) / Recent (newest created) / Oldest. All Tasks defaults to Deadline ascending rather than "Recent," since a task manager should default to urgency, not creation order — flagged as a deliberate change from current behavior.

**Guardrail:** filters live in a single horizontal bar directly under the view header (tabs you already have — All Tasks/Pending/Completed/High Priority/Overdue — are kept as-is, since they already work well as quick filters per image 1). Sort is a dropdown at the right of that same bar, as it is today. No second filter UI is introduced elsewhere.

---

## M. Quick Metrics

**Keep, with one clarification, not a structural change:**

Total / Pending / Completed / Overdue / High Priority — all five are meaningful and map directly to nav items, so they stay.

**Non-negotiable rule (per your explicit requirement):** these numbers reflect the *actual underlying task state* at all times. They must **not** recompute based on the current filter, search query, or bulk-selection state — i.e., if the user filters the list to "High Priority" or selects 6 tasks for bulk action, the Overdue count in the rail still shows the true total overdue count, not "overdue count within the current filtered view." This needs to be an explicit acceptance test in implementation (Section S), since it's an easy thing for an agent to get subtly wrong by wiring metrics to the filtered dataset instead of the source dataset.

**Addition:** a small "Today's Snapshot" line replaces the currently-dead "Today's Agenda" widget — e.g. `15 overdue · 0 due today` — a one-line summary, not a redesigned widget, that gives the rail a reason to reference Today without duplicating the Today view itself.

---

## N. Mobile

Mobile is treated as its own layout, not a squeezed desktop.

- **Navigation:** bottom tab bar with the core 4–5 destinations (Today, All Tasks, Calendar, Search, Sender Groups collapsed into a "More" tab if needed). Sidebar as a left column disappears entirely on mobile.
- **Task list:** same compact-row component, full width, no rail — priority dot, title, snippet, deadline/sender stack onto two lines instead of one row if width forces it (title+priority on line 1, deadline+sender on line 2), but the row stays a single tappable unit.
- **Task Details:** renders as a bottom sheet that slides up and covers ~90% of the screen (not a centered modal — centered modals waste space and feel awkward on small viewports). Swipe-down or a top drag handle closes it, in addition to a close button.
- **Calendar:** Month view becomes horizontally scrollable/swipeable per week or collapses to Agenda view by default on small screens, since a 7-column month grid is cramped below ~400px width; Agenda is the primary mobile calendar experience.
- **Search:** full-screen takeover (not an overlay palette) when the search icon is tapped, since ⌘K-style floating palettes don't translate to touch.
- **Filters:** collapse into a single "Filters" button that opens a bottom sheet with the same controls from Section L, rather than an inline horizontal bar (no room for one on mobile).
- **Bulk actions:** the bulk action bar (Section H) becomes a sticky bar pinned to the bottom of the screen once a selection is active, above the tab bar, so it's always reachable by thumb.
- **Sidebar/sender groups:** reached via the "More" or a dedicated tab, rendered as a full-screen list, not a slide-out drawer over the task list (avoids the common mobile pattern where a drawer half-covers content awkwardly).

---

## O. Visual Design System

**Typography**
- Font: system UI stack (`-apple-system, Segoe UI, Roboto, ...`) — no new font/library dependency.
- Sizes: 12px (metadata/snippets), 13px (secondary labels), 14–15px (task titles, body), 18–20px (view headers), 24px (page title, e.g. "Today").
- Weights: 400 regular for body/snippets, 500 medium for titles and nav labels, 600 semibold for view headers and metric numbers only — avoid bold as a general emphasis tool.

**Spacing scale:** 4 / 8 / 12 / 16 / 24 / 32px — used consistently for padding/margins/gaps, no arbitrary values. Task row internal padding: 8–12px vertical, 16px horizontal.

**Border radius:** 6px for small elements (pills, buttons, checkboxes), 10px for cards/panels/modals — one consistent scale, not per-component values.

**Shadows:** a single elevation used sparingly — the Task Details overlay and any popovers get a soft shadow (`0 8px 24px rgba(0,0,0,0.12)`); task rows get **no** shadow (this is part of why the current cards feel heavy — remove per-row shadow entirely).

**Borders/surfaces:** workspace background a very light neutral gray (`#F7F8FA`-ish), task rows on white with a 1px hairline divider (`#E8E9EC`-ish) between them rather than individual bordered cards — this single change (divider-list instead of card-list) is one of the biggest "less congested" wins available.

**Status colors** (used consistently across row accents, calendar pills, badges — one palette, not per-component colors):
- Overdue: red (`#DC2626`-ish)
- High priority: amber/orange (`#D97706`-ish)
- Completed: muted green, low-saturation (`#16A34A`-ish, often shown desaturated with strikethrough rather than a loud green)
- Normal/pending: neutral blue or gray, low visual weight since it's the default/majority state and shouldn't compete with overdue/high-priority signals

**States:**
- Hover: subtle background tint (~4–6% black) on task rows and nav items.
- Selected (bulk mode): light blue-tinted background + visible checkbox fill.
- Completed: reduced opacity (~60%) + strikethrough title, snippet stays legible but muted.
- Overdue: left-edge 3px accent bar in red on the row, in addition to the priority dot — this is the one place two signals stack, because overdue is the single most important state in the whole product.

**Animation:** kept minimal and fast — 120–180ms ease-out for modal open/close, hover states, and row-completion transitions. No decorative motion, no bouncy easing — "professional and restrained" as specified.

**No new UI libraries** — everything above is achievable with the existing styling approach (Tailwind utility classes if that's what's already in use, per the current app's apparent stack) plus the existing modal/component patterns already shipped.

---

## P. Empty States

| Context | Message | Notes |
|---|---|---|
| No tasks at all (fresh account) | "No tasks yet — tasks will appear here once WhatsApp messages are captured." | Onboarding-flavored, only shown when Total Tasks = 0 |
| No tasks today (both sections clear) | "You're all caught up." (existing pattern, kept) | From image 3 — preserved as-is |
| No overdue tasks (Today or Overdue view) | "Nothing overdue — you're on top of it." | Positive framing, small check icon |
| No search results | "No matches for '\<query\>' — try a different sender or keyword." | Echoes the query back so the user knows what was searched |
| No sender results (filtered sender list) | "No senders match '\<filter\>'." | Simple, no icon needed |
| All tasks completed (Completed view has everything, Pending = 0) | "Nothing pending — everything's done." | Distinct from the Today empty state; this is a whole-workspace state, shown site-wide as a banner-style note if desired, not required |

---

## Q. Productivity Features — Evaluated

| Feature | Classification | Reasoning |
|---|---|---|
| Bulk actions on overdue (mark complete / delete) | **MUST HAVE** | Directly addresses your single biggest current pain point (15 stale overdue tasks, no fast path) |
| Compact/readable task rows (Section E) | **MUST HAVE** | Core ask of this entire redesign |
| Calendar color-by-status | **MUST HAVE** | Cheap, high-impact, fixes a real scannability gap |
| Today = Overdue + Due Today | **MUST HAVE** | Fixes a genuine logical hole (Today showing empty while work exists) |
| Snooze | **SHOULD HAVE** | Real recurring need (acknowledged-but-not-urgent items), smaller API surface than full reschedule, natural Phase-2 add |
| Task edit (priority/deadline correction) | **SHOULD HAVE** | You already hit a concrete case (image 1's misclassified "Results release" event) — not urgent for every task, but needed occasionally |
| Sender search/filter (dedicated view) | **SHOULD HAVE** | Solves current fragmentation-driven clutter once senderKey is fixed |
| Bulk reschedule | **SHOULD HAVE**, not now | Real value, but a new API surface most likely required — sequence after Snooze proves the pattern |
| Keyboard shortcuts (beyond existing ⌘K) | **NICE TO HAVE** | Useful for power users, no current pain point evidence for it |
| Command/search palette enhancements (filters within ⌘K) | **NICE TO HAVE** | Search already exists and works; deepening it is polish, not a gap |
| Task aging indicator (e.g. "overdue 8 days") | **NICE TO HAVE** | Adds useful context cheaply once bulk triage exists, but not required to ship triage itself |
| Unread/new task indicator | **DO NOT ADD NOW** | No evidence this is a current problem; adds a new state to track (read/unread) with no clear current use case |
| Reminders / notifications | **DO NOT ADD NOW** | Substantial new subsystem (scheduling, delivery), well outside a UI redesign's scope, and overlaps with the Android notification-capture path you've explicitly said not to touch |
| Daily summary (digest) | **DO NOT ADD NOW** | Same reasoning as reminders — a genuinely new feature, not a redesign item; revisit only after the core redesign ships and proves out |

---

## R. Data/API Safety

**FRONTEND-ONLY changes:**
- Entire layout restructure (Sections C, D)
- Task row component redesign (Section E)
- Task Details visual/interaction polish (checkbox shape, animation) — logic unchanged
- Calendar pill coloring (uses existing status/priority fields already returned by the API)
- Metrics rail layout, Today's Snapshot line
- All visual design system changes (Section O)
- Filter/sort UI reorganization (Section L) — assuming filtering logic is already client-side or already exposed via existing query params; verify before assuming

**BACKEND changes (required, scoped):**
- senderKey normalization fix (Section J) — **only after** inspecting real raw sender data; this is a backend/data-layer change (wherever senderKey is currently computed), not a frontend display trick
- Bulk Mark Complete / Bulk Delete — confirm whether the existing single-task complete/delete endpoints can simply be called N times client-side (acceptable for the volumes seen here, ~15 items) versus needing a genuine bulk endpoint. **Prefer looping the existing per-task endpoint** unless response latency proves it's a problem — avoids a new API surface for a first version.

**DATABASE changes:**
- None required for the redesign itself. The senderKey fix is a **logic** change (how the key is computed from existing `sender` text), not a schema change — `senderKey` presumably already exists as a column/derived field per your data contract in Section J.

**Explicitly NOT touched, per your instruction:**
- Android notification capture
- Authentication
- Existing API contracts (aside from the scoped senderKey normalization logic, which changes a computation, not a contract)
- Task extraction (the WhatsApp message → task parsing pipeline)
- PostgreSQL data (no migrations, no data rewrites — normalization changes how `senderKey` is *computed going forward/on read*, not a bulk rewrite of historical data, unless you separately decide a backfill is worth doing)
- Prisma schema

---

## S. Implementation Plan — 5 Phases

**Design principle for sequencing:** ship the parts with the best effort-to-impact ratio first, avoid touching any component twice, and don't build bulk-triage UI on top of unfixed sender/data issues.

### Phase 1 — Data Correctness: senderKey Normalization
- **Goal:** Inspect real raw `sender` values, fix normalization so sender groups stop fragmenting, verify against the actual fragmentation cases you found (3rd year Kurinji, CSE_2024-2028, ACT 26-27).
- **Files/areas:** backend senderKey computation logic only.
- **Impact:** Backend only. No schema/migration required unless a backfill of existing rows is chosen.
- **Risk:** Low-medium — isolated logic change, but needs real-data verification before committing to a specific regex, per your explicit instruction not to guess.
- **Dependencies:** None — this can and should happen first, since Sections J and (implicitly) E/G/H's sender display all depend on clean data.
- **Validation:** Query distinct `senderKey` counts before/after on the current 36-task dataset; manually confirm the three fragmentation examples now collapse into one group each; confirm `sender` (display) values are untouched.

### Phase 2 — Task List & Row Redesign
- **Goal:** Ship the compact task row (Section E) across every view that lists tasks (All Tasks, Today, Upcoming, Overdue, High Priority, Completed, Sender Group detail, Calendar Agenda, Search results) as one shared component.
- **Files/areas:** the task-row component and every view currently rendering the old card layout.
- **Impact:** Frontend only.
- **Risk:** Medium — touches many call sites, but it's one component change propagated, not per-view redesigns.
- **Dependencies:** Phase 1 (so sender names shown in rows are already clean).
- **Validation:** Visual check against the row-height target (~56–64px); confirm checkbox, title, priority dot, deadline, sender, snippet all render without truncation bugs at common viewport widths (1280, 1440, 1920).

### Phase 3 — Today Redefinition + Layout/Rail Restructure
- **Goal:** Implement the Overdue + Due Today split (Section G), restructure the three-column layout and panel proportions (Sections C, D), update Quick Metrics to the corrected always-true-total behavior (Section M), add Today's Snapshot.
- **Files/areas:** Today view, top-level layout/grid component, metrics rail component, sidebar nav restructure (moving Sender Groups out of the always-visible list per Section B).
- **Impact:** Frontend only.
- **Risk:** Medium — layout restructuring touches shared shell components used everywhere; needs careful regression-checking of every other view that sits inside that shell.
- **Dependencies:** Phase 2 (Today needs the new row component already available).
- **Validation:** Confirm Today never shows the "all caught up" empty state while overdue items exist; confirm metrics stay constant while filtering/selecting; resize panels at min/max widths and confirm no layout breakage; confirm collapsed-sidebar state persists across reload.

### Phase 4 — Overdue Triage + Bulk Actions
- **Goal:** Multi-select, select-all, bulk Mark Complete, bulk Delete (with confirmation), clear selection — inside both the dedicated Overdue view and Today's Overdue section.
- **Files/areas:** Overdue view, Today view (Overdue section), a new lightweight bulk-action-bar component, wiring to existing per-task complete/delete endpoints (looped client-side per Section R).
- **Impact:** Frontend primarily; backend only if looping the existing endpoints proves too slow and a real bulk endpoint becomes necessary.
- **Risk:** Medium — Delete is destructive, so this phase needs the most careful QA of the confirmation flow and of the "selection state doesn't corrupt metrics" rule from Section M.
- **Dependencies:** Phases 2 and 3 (needs the row component and the Today/Overdue structure already in place).
- **Validation:** Select N tasks, bulk-complete, confirm all N update and disappear from Overdue/Today and metrics recompute correctly; bulk-delete with confirmation, cancel path leaves data untouched; confirm selection state clears correctly when switching views.

### Phase 5 — Calendar Status Coloring + Visual Design System Pass
- **Goal:** Apply the four-state pill coloring to Month and Agenda views (Section I); do a full visual-system pass across the whole app (typography, spacing, borders, shadows, status colors per Section O) so every screen — not just the newest ones — looks like one coherent product.
- **Files/areas:** Calendar Month/Agenda components; global design tokens/theme file; a pass over Task Details, Sender Groups, Search, and any screen not already touched in Phases 2–4.
- **Impact:** Frontend only.
- **Risk:** Low-medium — mostly styling, but touches every screen, so regressions are easy to introduce broadly if a shared token is renamed carelessly.
- **Dependencies:** Phases 1–4 (this is the polish pass that unifies everything already built).
- **Validation:** Visual review against the palette/spacing/typography scale in Section O across every view; confirm calendar pills correctly reflect completed/overdue/high-priority/normal in a full month with mixed data; cross-check mobile layout (Section N) against this same pass since mobile styling should derive from the same tokens.

*(Snooze and Task Edit from Section Q, Section H's bulk-reschedule evaluation, and Sender Group view polish beyond the fragmentation fix are deliberately left as a Phase 6+ backlog rather than folded into the above — they're real but not blocking, and forcing them in risks repeating the "first Phase 4 report overclaimed scope" problem you flagged earlier in this project.)*

---

## T. Critical Review of Your Existing Phase A/B/C Proposal

**1. What's correct:**
- The instinct to phase this rather than one giant prompt is correct and is preserved above — just re-sequenced.
- Calendar color-by-priority as a cheap, high-impact fix is correct and kept as-is (now Phase 5).
- The "three-tier visual hierarchy, not an accordion" judgment call for task rows was the right read of "not congested, not collapsed" — carried forward unchanged into Section E.

**2. What should be changed:**
- Phase B (task row redesign) was scoped as a patch to the *existing* row component. Given you've now decided on a full redesign, it should be scoped as Section E above — same underlying idea, but as a from-scratch shared component used everywhere, not a modification in place.
- The original three phases treated senderKey normalization as a first *task* inside a UI-focused phase. It's promoted to its own standalone Phase 1 here, because it's backend/data work with a different risk profile and verification method (inspect real data first) than everything else — bundling it with UI work under-emphasizes the "verify before fixing" requirement.

**3. What should be merged:**
- The original Phase A (senderKey fix) and the sidebar cleanup that naturally follows from it are one causal chain, not two separate efforts — Phase 1 here absorbs both the backend fix and its direct UI consequence (Sender Groups no longer needing to render a fragmented always-expanded list).

**4. What should be postponed:**
- Snooze and full Task Edit were in your "prioritize now" list from the earlier report. Given the fuller picture in this spec, they're reclassified SHOULD HAVE rather than part of the first five phases — bulk triage (Mark Complete/Delete) already addresses the sharpest pain point (15 stale overdue tasks); snooze is a refinement on top of a workflow that needs to exist first.
- Bulk reschedule, explicitly evaluated in Section H/Q, is postponed pending confirmation of whether a new backend endpoint is truly needed.

**5. What should be removed:**
- Nothing from the original three phases is wrong enough to drop outright — the earlier analysis (sender fragmentation is real, calendar pills are undifferentiated, overdue has no bulk path, Today is disconnected from Overdue) all still holds and is incorporated. The change is sequencing and scope, not direction.

**6. What was missing:**
- The layout/panel-resize system (Sections C, D) wasn't addressed at all in the original three-phase proposal — it was scoped as a task-list and calendar patch, not a layout rearchitecture. This spec adds it explicitly because you've now asked for the sidebar/rail proportions themselves to change (Sender Groups moving out of the permanent sidebar), which the original phases didn't anticipate.
- Explicit empty-state design (Section P) beyond the one existing "all caught up" pattern wasn't specified.
- The "metrics must not change when filtering" rule (Section M) wasn't stated as an explicit constraint anywhere in the earlier work — it's easy for an implementing agent to get wrong silently, so it's now called out as a required acceptance test.

**7. What Antigravity should NOT touch, restated for clarity:**
- Android notification capture, authentication, task-extraction/parsing logic, the Prisma schema, and PostgreSQL data itself. The only backend logic change in this entire spec is the senderKey computation (Phase 1), and even that is a targeted fix to existing logic, not new infrastructure.

---

## Summary for Sign-Off

This specification is a single coherent redesign, not three disconnected patches. It:

- Preserves every piece of existing functionality you listed in your request.
- Fixes the two structural problems (congested task rows, fragmented senders) before any cosmetic polish happens.
- Keeps Task Details as the one component every entry point shares, as already shipped.
- Defines exact behavior for resizing, empty states, bulk actions, and metrics so an implementing developer or agent doesn't have to make product decisions mid-build.
- Sequences implementation into 5 phases, each independently buildable and testable, with Phase 1 (data correctness) intentionally first so nothing downstream is built on top of fragmented sender data.

Once you approve this document, each phase in Section S can be turned into its own scoped, non-negotiables-and-acceptance-criteria prompt for Antigravity — the same format that worked for your Sidebar/Calendar rebuilds.
