# Session — Master Prompt & Project Spec

> This file is the persistent context document for building **Session**.
> Place it at the root of the project repo as `CLAUDE.md` so Claude Code
> automatically reads it at the start of every session.

---

## 1. Vision

Session brings back the lost ritual of the carp angler's catch album — the
guarded, personal, beautifully kept logbooks of the 70s/80s/90s — as a modern,
minimalist app. It replaces scattered camera-roll photos with a proper archive
of every capture: the details, the story, the timeline, and eventually the
patterns that emerge across a season or a lifetime.

Long-term, Session becomes a place anglers share lake intelligence with each
other — spots, rigs, hookbaits, weather patterns — with fishery managers able
to curate what's public vs. members-only per venue.

**Brand tone:** modern, clean, minimal, premium. Think a beautifully designed
photo/journal app, not a cluttered fishing forum. Typography and whitespace
do a lot of the work. Photos are the hero.

---

## 2. Phased Scope

### Phase 1 (current focus — build this first)
- Personal catch logging & album
- Timeline view of all captures
- Basic pattern insights (personal, not communal)
- Friend sharing (private, opt-in — not public/global)
- Personal target fish list (manual entry)
- Solid, delightful core UX before anything else

### Phase 2 (future — do not build yet, but design data models to allow it)
- Public/global lake database
- Community catch reports per venue
- Aggregate pattern data (best baits/conditions per lake, from many anglers)

### Phase 3 (future)
- Fishery manager accounts & venue administration
- Lake admin / bailiff roles, gated behind identity verification (method
  TBD — likely manual review given impersonation risk)
- Admin-only real-time notification when a fish from their lake is
  captured (who/what/when/weight) — a private admin channel, distinct
  from group-wide sharing, and still bound by the no_publicity rule.
  Framed correctly, this is a genuine selling point to syndicates:
  Session helps them monitor their own water rather than exposing it.
- Public vs. members-only information tiers per lake
- Community spaces per venue
- Syndicate ticket applications via the app, linked to verified lake
  admin accounts

**Rule for this project:** don't build Phase 2/3 features early, but avoid
data model decisions in Phase 1 that would make them painful to add later
(e.g. catches should reference a `lake` entity even if lakes are just
personal/free-text for now, not a shared global table yet).

---

## 3. Phase 1 Feature Set

### Catch logging
Species scope: carp-focused (common/mirror/linear/fully scaled/leather/grass
as sub-types, kept as flat sibling options for one-tap selection rather than
nested under mirror) but any species loggable (pike, bream, tench, etc. as
extras).

Units: weight stored internally in grams (integer, unit-agnostic). Display
defaults to **lb/oz** (UK carp scene convention) with a settings toggle to
switch personal display preference to kg at any time — doesn't touch stored
data, just changes rendering.

**Every field below is optional except date and at least one photo.** The
core UX principle here: an angler should be able to log a catch in 15
seconds with just a photo, date, and weight, or spend 5 minutes capturing
every detail if they want to. Never make the form feel mandatory or like a
chore. Fields are grouped into collapsible, individually skippable tiles so
the quick-log flow stays fast and the detailed flow stays inviting, not
overwhelming.

**Quick-log (always visible, no tile needed):**
- Photo(s)
- Date & time
- Weight

**📍 Location (tile):**
- Lake/venue (pick from saved list, or add new — free text/personal entity
  for now, becomes a real shared entity in Phase 2)
- Swim/peg name

**🐟 Fish details (tile):**
- Species (carp default, others selectable)
- Sub-type — common/mirror/linear/fully scaled/leather/grass (carp only)
- Length, girth

**🎣 Tackle (tile):**
- Rig used (free text or saved rig presets the angler can reuse)
- Hookbait
- Hook pattern/size
- Baiting strategy (free text)
- Wraps/cast distance

**🌍 Conditions (tile — auto-fetched later, manual for now):**
- Air temperature, air pressure
- Wind direction & speed
- Bottom type (silt, gravel, weed, clay, etc.)
- *Water temperature deliberately excluded from the default form* — an
  unreliable single-point reading given lake stratification, and most
  anglers won't probe for it. The column stays in the schema (nullable,
  unused) in case future demand justifies surfacing it.

**⏱️ Session (tile):**
- Duration — stored as **hours (decimal)**, not minutes; carp sessions
  range from a few hours to multi-week campaigns, so hours is the right
  base unit. UI: quick-tap presets **12h / 24h / 36h / 48h / 72h**, plus a
  **Custom** toggle between **Days (1–14)** and **Weeks (1–4)**, converted
  to hours behind the scenes. Angler never manually enters or sees raw
  hours.
- Session notes

**📝 Story (tile):**
- Freeform personal notes

### Target fish list (Phase 1)
Anglers can build a personal target list — specific named fish (e.g.
"Petals") or general goals (e.g. "30lb+ common from Broom"). Manual entry
only in Phase 1; auto-recognition is Phase 1.5 (see below).

New entities:
- `known_fish`: scoped per lake (not global). Fields: name/nickname, notes,
  added_by, added_at, visibility (private | group).
- `targets`: owner_id, known_fish_id (nullable), lake_id (nullable),
  species (nullable), notes, achieved_at (nullable — set when the angler
  lands it, linking back to the catch).

UI: Album pane gains a **Targets tab** alongside Timeline. Opens a
two-column list — fish photo (or placeholder if unnamed) on the left, fish
name/lake/last known capture (weight, angler, date) on the right. Tapping a
row opens the fish's full passport page.

**Access rule:** tapping a fish you don't have capture-level access to (no
shared catch, not in the relevant group) still shows that the fish exists
and its lake, but withholds capture details (weight, angler, date, photo).
Knowing a fish exists is not the same as having intel on it.

### Publicity & governance safeguards (Phase 1, critical)
Many syndicates operate strict no-publicity policies on their fish. Session
cannot fully prevent leaks (screenshots, phone galleries circulating
outside the app) but must not be an easy leak vector itself, and should
visibly push responsibility onto the angler rather than defaulting to
permissive sharing.

- `lakes.publicity_policy`: enum (open | no_publicity), **defaults to
  no_publicity** — an angler must actively opt a lake into "open," never
  the reverse.
- Any attempt to share a catch/fish tied to a no_publicity lake surfaces an
  explicit warning ("This lake is marked no-publicity — sharing may breach
  syndicate rules") before the share completes. Does not block the action,
  but requires conscious acknowledgement.
- No public search, discovery, or "trending fish" surfacing — permanent
  rule, holds even into Phase 2/3 when the shared lake database exists,
  for any lake flagged no_publicity.
- **Audit trail:** `fish_visibility_log` table (fish_id, changed_by,
  old_visibility, new_visibility, changed_at) — records every visibility
  change on a `known_fish` record, so any future dispute has a clean
  record of who set what, when.

### Recapture / fish recognition (Phase 1.5 — build after core logging is solid)
Goal: recognize when a photographed fish has been caught before — by the
same angler, or by anyone in their friend group/shared lake — and surface
it, e.g. *"This looks like Petals — last caught by Curtis on 5th October."*

Approach (for later technical design, not now):
- Image similarity matching on distinguishing features (scale pattern for
  mirrors, markings for commons) rather than exact-match — carp photos
  vary in angle/lighting/net vs. mat
- Slots into the `known_fish` table already established in Phase 1 (adds a
  `photo_reference`/embedding link) — no rework needed
- Requires a shared "known fish" record scoped to a friend group or lake,
  not global, in Phase 1.5 (respects the private/guarded feel — no public
  fish database yet)
- Needs a confirm/reject step from the angler — never auto-assert an ID
  with confidence, since a wrong match undermines trust in the whole
  feature. Suggest matches, let the human confirm.
- Fish can be optionally named by whoever caught it first ("Petals"),
  and that name/history follows the fish across future recaptures within
  the group
- This is genuinely complex — treat it as its own build phase, not a
  checkbox inside catch logging

### Timeline
- Chronological scroll of catches, photo-forward
- Filter by lake, species, date range, personal bests

### Pattern insights (personal only in Phase 1)
- Personal bests (biggest, most captures, longest session, etc.)
- Simple trends: which baits/lakes are producing for *this* angler,
  weight over time, catches by month/season

### Sharing model (three tiers — all Phase 1, this is core to the vision)

**1. Groups.** Anglers can create self-organized teams (e.g. "ADHDanglers")
for ongoing knowledge sharing. Group members can see each other's shared
catches/intel by default within the group context. This is the "little
team" model, not a public community.

**2. Temporary album access.** An angler can generate a share code/link
granting time-limited viewing access to their album (e.g. 12/24/36/48
hours, angler's choice). No account/follow relationship required on the
viewer's side for this — it's a guest-pass, matching the "guarded book you
occasionally let someone flick through" feeling.

**3. Individual/group spot sharing.** A specific piece of intel (e.g. "found
a great spot at Broom Big Pit") can be shared directly, independent of
sharing the whole album — angler hits Share, picks a destination (an
individual by their ID/username, or a group), and just that spot/catch
context is sent. This is the core "knowledge sharing" mechanic, distinct
from the personal album.

Design implication: sharing needs its own permission model, not just a
public/private boolean. Data model supports: group membership, time-bound
access grants (with expiry), and discrete "shared item" objects independent
of the full catch/album record. **Plain-English rule underneath all three:**
nothing is visible to anyone by default. Every single view of another
angler's data traces back to one of these three explicit records existing.

No public feed or discovery in Phase 1 — everything above requires an
explicit invite, code, or membership.

### Differentiators (what makes Session not "just another catch log")

The competitive landscape (Anglers' Log, finScribe, ANGLR, CarpersLog,
Fishbrain, etc.) is either generic multi-species utility apps or
data/stats-heavy carp apps — none chase the *feeling* of the old session
books. Reviews across all of them complain about ads, bloat, subscription
walls, and clunky forms. Session's edge:

- **No ads, no bloat, ever.** Stated principle, not just a launch
  condition — this should hold even if the app grows.
- **Seasonal/annual album export.** A beautifully laid-out exportable
  PDF (or shareable digital equivalent) of a year's captures — ties the
  digital app back to the original physical-book ritual. Not a raw data
  export; a designed artifact.
- **Fish passport (ties into recapture recognition, Phase 1.5).** Each
  recognized fish gets its own page: name, full capture history across
  the friend group, not just a tag on individual catch records.
- **Trackside-friendly logging.** Voice-note-to-log option (speak the
  details, review/edit later) for cold hands/poor signal at the lake.
  Offline-first — catches log locally and sync when back in signal.
- **Auto-fetched conditions.** Weather, air pressure, and moon phase
  pulled automatically from catch time/location — angler never types it,
  but it still feeds pattern insights.
- **"On this day."** Quiet nostalgia surfacing — past catches from the
  same date in previous years. No gamification, just memory.

---

## 4. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| App framework | **Expo (React Native) + TypeScript** | Lets you build and test live on iPhone/iPad *today* via the Expo Go app, no Mac/Xcode required until final store builds. Single codebase, iOS-first, Android later for free. |
| Navigation | Expo Router | File-based routing, standard for modern Expo apps |
| Styling | NativeWind (Tailwind for RN) | Fast to iterate, consistent design tokens for the minimal/premium look |
| Backend | **Supabase** (Postgres + Auth + Storage + Realtime) | Generous free tier, handles auth/db/image storage in one place, works cleanly with Expo, easy for Claude Code to scaffold against |
| Image handling | `expo-image-picker` + client-side compression before upload | Photos are the product — keep uploads fast without losing quality |
| Server state | TanStack Query (React Query) | Clean data-fetching/caching against Supabase |
| Local/app state | Zustand | Lightweight, minimal boilerplate |
| Auth | Supabase Auth (email or Apple Sign-In) | Apple Sign-In is expected/required-adjacent on iOS anyway |
| Version control | GitHub (private repo) | Standard, needed for Claude Code and EAS builds |
| Build/deploy | EAS Build (Expo Application Services) | Cloud builds — you can produce an installable iOS build before you even have Xcode locally |

**Not needed for Phase 1:** any global/shared lake database infrastructure,
admin roles, or public content moderation — keep the backend schema simple
and personal/friends-scoped.

---

## 5. Hardware & Accounts Needed

### Available now (before MacBook arrives)
- iPhone + iPad Pro — install **Expo Go** from the App Store; this is how
  you'll preview the app live as it's built, no Mac needed yet
- Free **Expo/EAS account**
- Free **Supabase account** (free tier is plenty for Phase 1)
- **GitHub account** for the repo

### When the MacBook Air (32GB/1TB) arrives
More than enough spec for this project. At that point:
- Install **Xcode** (needed for final iOS builds, simulator, and eventually
  App Store submission)
- Install **Claude Code** locally for direct repo-based development
- Node.js + npm/pnpm for local dev server

### Not needed yet, but eventually
- **Apple Developer Program** ($99/year) — only required when you're ready
  for TestFlight or App Store release. Expo Go covers all early testing on
  your own devices for free.

---

## 6. Onboarding

First-run experience should sell the vision, not just collect a signup:
1. Show what the album could look like (a beautifully rendered example
   timeline/catch, not an empty state)
2. Walk through key features briefly (log a catch, see your timeline,
   build a group)
3. Guide the angler through setting up their own space — creating their
   first group or understanding individual sharing — as part of the flow,
   not buried in settings later
4. Always offer a "skip to app" / help-later option — never force the
   full walkthrough

## 6a. Design System

**Mood:** warm & earthy, tactile, journal-like — not vintage pastiche, a
modern app with warmth.

**Palette:**
- Base/background: warm cream (`#F5F1E8`)
- Primary: deep moss green (`#3D4A34`)
- Accent: rich tobacco brown (`#8B5A2B`)
- Text/ink: warm charcoal, not pure black (`#2B2620`)
- Highlight (personal bests, special moments): muted amber (`#C08A3E`)

**Typography:** serif for headings (e.g. Fraunces or Lora — journal warmth)
paired with a clean sans for body/data (e.g. Inter — readability for
numbers/details).

**Branding/icon:** no strong direction from project owner — design is not
their focus. Claude should propose concrete icon/logo directions when this
becomes relevant, rather than asking the owner to specify first. Keep it
simple: likely a typographic wordmark or a single restrained icon motif
(e.g. a stylised scale pattern or a simple line-drawn carp), not an
illustrated/busy icon.

## 8. Design Principles (apply to every screen)

1. **Photos first.** Every layout decision should ask "does this let the
   photo breathe?"
2. **Fast to log, slow to browse.** Catch entry should take under a minute
   in the field; the album/timeline is where people linger.
3. **No forum energy.** No red badges, no engagement-bait UI patterns. This
   is a personal archive first, a quiet social layer second.
4. **Respect the guarded nature of the original session books.** Privacy
   defaults should lean private; sharing is opt-in, not assumed.

---

## 9. Feedback Loop & Automation Architecture

Goal: keep the project owner as the sole approver of what ships, while
removing as much manual triage/build overhead as possible. This is a real,
working pattern (not aspirational) built on Claude Code's GitHub Actions
integration.

### 9a. In-app feedback agent
- A simple chat widget in Session (Claude API-powered) where beta testers
  describe bugs/feature ideas conversationally instead of filling out a
  rigid form
- Agent asks clarifying questions if needed (which screen, can they
  attach a screenshot, etc.)
- Agent structures the conversation into a clean ticket: title,
  description, repro steps, bug vs. feature, severity

### 9b. Ticket pipeline
- Structured tickets are posted as **GitHub Issues** via the API — this
  is the natural home because of 9c
- Crash/error monitoring (e.g. Sentry free tier — plenty for a 2–5 person
  beta) feeds into the *same* GitHub Issues pipeline, so the feedback
  agent becomes the single front door for both self-reported and
  auto-detected problems

### 9c. Owner notification & authorization
- New issue → owner gets notified (email/push)
- Owner reviews and, when ready, adds an `approved` label or comments
  `@claude` on the issue to authorize work — this is the human-in-the-loop
  gate; nothing gets built without explicit sign-off

### 9d. Agent implementation
- `anthropics/claude-code-action` (official GitHub Action) triggers on
  the `@claude` mention, reads the issue, implements the fix/feature, and
  opens a **pull request** on a new branch
- **It never auto-merges.** The owner reviews the diff and merges
  manually — the right amount of automation for something friends will
  actually be using; the agent does the work, a human still gates
  production
- Setup: run `/install-github-app` inside Claude Code as repo admin —
  installs the GitHub App, adds the required secret, and scaffolds the
  workflow file

### 9e. Build & release automation
- EAS Build triggers automatically on merge to `main`, producing an
  installable preview build for the beta group without a manual build
  step
- Release notes can be auto-drafted by Claude from the merged issue/PR
  description, feeding an in-app "what's new" card (fits the journal
  tone better than a generic changelog)

### 9f. Data enrichment automation
- On catch creation, a serverless function auto-fetches weather/pressure/
  moon phase for that time+location (see "Auto-fetched conditions" above)
- Same pattern for fish recognition (Phase 1.5): image embedding computed
  automatically on upload, matched against the group's known-fish set,
  surfaced as a suggestion for the angler to confirm/reject

### 9g. Proactive insight surfacing
- A lightweight background job periodically reviews an angler's own data
  and surfaces a gentle, occasional nudge — e.g. "you catch best over
  silt on a falling pressure" — shown once, not repeatedly, not gamified

### 9h. Group cohesion automation
- Quiet weekly/monthly digest card (not a feed) — who caught what, any
  recaptured fish — no gamification
- In-app "roadmap" view auto-generated from GitHub issue labels
  (planned/in-progress/shipped) so testers can see their feedback
  landing without the owner manually maintaining anything

### 9i. Data safety
- Scheduled automatic backups of the Supabase database from day one —
  this content is emotionally irreplaceable to users, which is the whole
  premise of the app, so backups aren't a "later" concern

### Security notes for this architecture
- By default only users with write access can trigger the GitHub Action,
  and bots are blocked — fine for a small closed beta, but keep in mind
  if the group grows
- The `@claude` trigger prompt should be scoped/guarded against prompt
  injection from user-supplied issue content, since the feedback agent is
  itself writing that content into issues

---

## 10. Current Status

Passion project, no monetization in Phase 1 — but built to a genuinely
professional standard; this should feel like a polished product, not a
prototype. Development pace: several evenings/weekend. Claude Code will do
the majority of implementation; the project owner directs priorities and
tests on-device via Expo Go.

Early beta group: 2–5 friends lined up to test once core logging + basic
sharing are working. Keep this in mind for practical decisions (e.g.
invite flow needs to be simple enough for a small trusted group, not
built for scale yet).

**Next step:** scaffold the Expo project, set up Supabase schema for
`users`, `catches`, `lakes`, `known_fish`, `targets`, and `friendships`,
and get the catch-logging flow + timeline view working end-to-end before
touching sharing features.
