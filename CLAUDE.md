# Session — Master Prompt & Project Spec

> This file is the persistent context document for building **Session**.
> Place it at the root of the project repo as `CLAUDE.md` so Claude Code
> automatically reads it at the start of every session.

**Naming note:** "Session" throughout this doc, the repo, and the codebase
is the internal/dev project name — it stays as-is everywhere here. The
actual public App Store / TestFlight name is **"(OB)Session"**, chosen to
avoid a naming collision with the existing Session messenger app (the
real word is "Obsession," not "Session" — deliberately different from a
trademark standpoint, not just a stylistic variant). `app.json`'s `name`
field and the sign-in screen wordmark reflect the public name; nothing
else needs to change to match. A clarifying descriptor (e.g. "carp
fishing") for public App Store search/discovery is a future task for
App Store Connect metadata once this goes past private beta — not
something baked into the app name itself.

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

**Brand tone:** carp anglers' best friend, not a generic multi-species utility
app. Session is deliberately niche, deliberately guarded, and unmistakably
built by someone who lives the culture — not a booking platform with a
logbook bolted on (see "Competitive positioning" below).

---

## 2. Phased Scope

### Phase 1 (current focus — build this first)
- Personal catch logging & album (carp only)
- Home hub: icon-dock navigation, personal Stats, Targets, Sessions, Groups,
  Favourite Lakes, Syndicate Tickets, Friends
- "The Book" — full-screen photo album/timeline, page-turning experience
- Basic pattern insights (personal, not communal)
- Friend sharing (private, opt-in — not public/global)
- Personal target fish list (manual entry)
- **Shared group lakes.** A lake can be owned by a group, not just an
  individual — group members see the same lake page and collaboratively
  add to it (known fish, spots). See "Shared group lakes" under Section 3.
- **In-lake spot marking, Tier 1** (moved up from Phase 2 — see Section 3).
  The core mechanism for anglers "feeding each other intelligence" on a
  shared lake: compass bearing + distance (wraps or estimate) + notes
  (depth, bottom type, features).
- Solid, delightful core UX before anything else

### Phase 1.5 (build after core logging is solid)
- Recapture / fish recognition (image similarity matching)

### Phase 2 (future — do not build yet, but design data models to allow it)
- Public/global lake database
- Community catch reports per venue
- Aggregate pattern data (best baits/conditions per lake, from many anglers)
- Favourited lakes gain live status ("quiet lately" / "producing well"),
  derived from the angler's own recent catches at that lake — Phase 1 keeps
  favourited lakes as a simple saved list only
- **Group shared calendars.** Each group gets a shared calendar view —
  members' planned sessions (from the `sessions` table, Phase 1) surface here
  if marked visible to the group. Overlap detection: if two or more members
  have overlapping dates *and* the same lake, surface a quiet notification
  (e.g. "Looks like you and Curtis are both at Broom on the 17th"). No forum
  energy — a helpful nudge, not a feed post. Depends only on `sessions` and
  `groups`, both already in Phase 1, so the data foundation is ready when
  this gets built.

### Phase 3 (future)
- Fishery manager accounts & venue administration
- Lake admin / bailiff roles, gated behind identity verification (method
  TBD — likely manual review given impersonation risk). **A verified lake
  owner's privacy policy is an absolute floor** over every angler's or
  group's personal lake record tied to that venue — individual anglers can
  match it or be more restrictive, never looser. Otherwise the whole
  "verified fishery owner" feature protects nothing. Mechanically: when the
  Phase 2 shared venue entity and the claim mechanism exist, every
  angler/group `lakes` row gets an optional link to the canonical venue;
  once linked, the venue's `publicity_policy` caps how open that row is
  allowed to be — a linked row can still be locked down tighter than the
  venue if an angler wants, just never opened up past what the venue owner
  allows. Claiming a venue never touches any angler's own catches or photos —
  those stay owned by the angler, full stop; a venue claim only ever
  reaches the shared lake/venue record itself.
- Admin-only real-time notification when a fish from their lake is
  captured (who/what/when/weight) — a private admin channel, distinct
  from group-wide sharing, and still bound by the no_publicity rule.
  Framed correctly, this is a genuine selling point to syndicates:
  Session helps them monitor their own water rather than exposing it.
- **Bailiff duty rostering**, via the same group-calendar mechanic as
  Phase 2's session calendar — a bailiff team is structurally a group with
  duty-type entries (patrol, maintenance, swim clearing) instead of fishing
  trips. Calendar entries gain a `type` field (`fishing` | `duty`). Overlap
  detection repurposes into gap detection — "no one's covering the 23rd."
  Requires the lightweight admin/permission structure above (who can assign
  a duty), so this is a *use* of the calendar feature by verified admins,
  not new engineering once permissions exist.
- **In-lake spot marking, Tier 2.** The precision upgrade to Phase 1's
  Tier 1 (bearing + wraps/estimate): GPS-anchored precise spot (recorded
  once, e.g. via marker float/boat over the exact location), then live
  bearing + distance calculated from the angler's current position on any
  future visit (standard geodesic bearing/distance calculation — same math
  golf rangefinders and marine nav apps use). Compass-arrow UI: "cast this
  way, 47 metres." Reuses Tier 1's private/group visibility model — an
  exact GPS spot is more sensitive than a bearing-and-wraps one, so it
  should default private even on a lake where other spots default group,
  but the mechanism itself doesn't change.
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
**Species scope: carp only, deliberately.** Session is carp anglers' best
friend, not a generic multi-species logbook — adding other species would
dilute the cultural niche this app is built for. No species field needed
anywhere in the schema — carp is implicit throughout.

Sub-types: common / mirror / linear / fully scaled / leather / grass / koi /
ghost — kept as flat sibling options for one-tap selection rather than
nested under mirror.

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
- Photo(s) — **multiple photos per catch, supported from V1** (not deferred)
- Date & time
- Weight
- Lake — **auto-suggested via GPS** against the angler's saved lakes list,
  confirm or override manually

**📍 Location (tile):**
- Lake/venue (pick from saved list, or add new — free text/personal entity
  for now, becomes a real shared entity in Phase 2)
- Swim/peg name

**🐟 Fish details (tile):**
- Sub-type — common / mirror / linear / fully scaled / leather / grass /
  koi / ghost

**🎣 Tackle (tile):**
- Rig used (free text or saved rig presets the angler can reuse)
- Hookbait
- Hook pattern/size
- Baiting strategy (free text)
- Wraps/cast distance

**🌍 Conditions (tile — auto-fetched on save, editable if needed):**
- Air temperature, air pressure
- Wind direction & speed
- Bottom type (silt, gravel, weed, clay, etc.)
- Auto-fetched via a Supabase Edge Function triggered on catch save (see
  "Weather & moon phase auto-fetch" below) — tile opens pre-filled, angler
  can correct if it ever seems off (weather stations aren't hyper-local)
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

### Weather & moon phase auto-fetch
On catch save, a Supabase Edge Function fires automatically:
- Calls **Open-Meteo's historical weather API** (free, no API key required
  at current scale) with the catch's timestamp + lake coordinates — returns
  temperature, wind speed/direction, and pressure for that exact hour
- Moon phase calculated **locally** within the same function — a
  deterministic astronomical calculation, no external dependency needed
- Results write directly into the `catches` row (air_temp_c,
  air_pressure_hpa, wind_direction, wind_speed)
- If a lake has no saved coordinates yet (angler typed a free-text lake
  name), prompt once per lake — "Drop a pin for [lake name] so we can
  auto-fetch conditions" — a single small ask that pays off on every future
  catch at that venue
- Worth knowing: Open-Meteo's free tier is aimed at non-commercial/small
  scale — fine for beta and realistically well beyond, but revisit their
  commercial terms once Session is generating real revenue at scale

### Target fish list (Phase 1)
Anglers can build a personal target list — specific named fish (e.g.
"Petals") or general goals (e.g. "30lb+ common from Broom"). Manual entry
only in Phase 1; auto-recognition is Phase 1.5.

New entities:
- `known_fish`: scoped per lake (not global). Fields: name/nickname, notes,
  added_by, added_at, visibility (private | group).
- `targets`: owner_id, known_fish_id (nullable), lake_id (nullable),
  species (nullable), notes, achieved_at (nullable — set when the angler
  lands it, linking back to the catch). A "desired syndicate/lake" target
  (no specific fish, just a venue ambition) is just a `targets` row with
  `lake_id` set and no `known_fish_id` — no separate entity needed.

**Access rule:** tapping a fish you don't have capture-level access to (no
shared catch, not in the relevant group) still shows that the fish exists
and its lake, but withholds capture details (weight, angler, date, photo).
Knowing a fish exists is not the same as having intel on it.

**UI — "Recon Mode" (Targets detail page only):** the Targets page gets a
distinct tactical/military visual treatment, deliberately separate from the
sleek-but-neutral tone everywhere else — carp culture already leans into
tactical/precision language and camo aesthetics (see any carp tackle
marketing), so this page earns a knowing wink rather than clashing with the
brand.
- Fish thumbnails get a subtle crosshair/reticle overlay (thin lines, not a
  garish red-dot sight)
- Headers on this screen only use a stencil-style display font, contrasting
  against the rest of the app's typography
- Fish info cards styled like a dog-tag/mission-briefing readout rather
  than standard data rows
- Copy leans tactical where natural: "Last sighted," "Intel," "Target
  acquired" (on achieved_at) instead of generic labels/checkmarks
- Olive/camo accent as background texture or border treatment
- **Boundary:** this tone is contained to the Targets detail page only.
  Everywhere else stays sleek/minimal. "No forum energy" still applies —
  this is a wink, not a gimmick.

### Shared group lakes (Phase 1)
A lake isn't only a personal record. It can also be owned by a **group**
instead of an individual — `lakes.group_id` (nullable, alongside the
existing personal `owner_id`). When set, every member of that group sees
the same lake page and can contribute to it (add known fish, add spots —
see below), rather than each member privately tracking their own separate
copy of "Broom Big Pit." This is the mechanism behind anglers "feeding
each other intelligence" about the lakes they fish together — the whole
point of a group.

- A lake is either personal (`group_id` null, only the creator sees/edits
  it) or group-owned (`group_id` set, the whole group shares it). Not both.
- Any group member can add to a group lake (known fish, spots, and tag
  their own catches to it). Catches themselves stay opt-in-shared per catch
  via the existing sharing model — tagging a catch to the shared lake does
  *not* auto-expose it to the group; that's still a deliberate share.
- **Changing a group lake's `publicity_policy` is restricted to the
  group's owner role**, not any member — flipping privacy on shared water
  affects everyone at once, so it doesn't get the same low-friction access
  as adding a known fish or a spot.
- Forward-compat: this is exactly the entity a verified fishery owner
  claims in Phase 3 (see the floor-rule note under Phase 3 above) — whether
  a `lakes` row started personal or group-owned doesn't matter to that
  mechanism, both link to the canonical venue the same way.

### In-lake spot marking, Tier 1 (Phase 1 — moved up from the original Phase 2 plan)
Digitizes the traditional marker-rod method: bearing toward a far-bank
marker plus distance (wraps, or a metres estimate), with notes (depth,
bottom type, features). On a return trip, the app shows "face this
bearing, same wrap count." This is the concrete mechanism behind "feeding
each other intelligence" on a shared group lake (see above) — Tier 2's
GPS-anchored precision upgrade stays Phase 3.

- `swims`: lake_id, name, created_by. Swims/pegs have their own naming
  scheme per lake (e.g. Arrow Pit's "Mollie Moo's") — not a fixed list,
  manually maintained by whoever fishes that lake. Same
  viewer/contributor access rule as the lake itself (any group member on
  a group lake, or the personal owner) — no separate visibility concept
  of its own, since a swim name isn't sensitive on its own; the spots
  inside it still carry their own private/group visibility.
- `spots`: lake_id, swim_id (nullable — which swim the spot belongs to;
  a spot can also exist with no swim assigned), created_by, name
  (nullable — the spot's own nickname, e.g. "The Willow Swim"),
  far_bank_marker (nullable — what you physically cast towards, e.g.
  "the dead tree" — distinct from name: a spot can be nicknamed one
  thing while being cast towards something else entirely on the far
  bank), bearing_degrees (nullable), rod_length_ft (nullable — the rod a
  wrap
  count was measured against; a wrap only means a fixed distance once
  you know the rod, since a 9ft rod's wrap covers less line than a 13ft
  rod's), distance_wraps (nullable), distance_estimate_m (nullable —
  angler uses whichever method suits), depth_m (nullable — stored in
  metres regardless of which unit the angler typed; the form has a ft/m
  toggle next to the field, converting on save so the column stays
  unit-agnostic like `catches.weight_grams`), bottom_type (nullable — a
  chip picker, silt/choddy/weed/gravel/clay/sand, **multi-select**: a real
  lakebed is often a mix, stored as a comma-joined string rather than one
  value), notes (nullable), visibility (private | group).
- **Defaults to private**, same caution as `known_fish.visibility` — the
  angler consciously opts a specific spot into `group` visibility rather
  than every spot on a shared lake being exposed by default. `group`
  visibility only makes sense (and is only allowed) on a group-owned lake;
  a spot on a personal lake can only ever be private.
- **Direct sharing (tier 3) also applies to spots.** A spot's Share
  setting is a three-way choice — Private / A friend / The group (the
  last option only offered on a group-owned lake, and *is* the
  `visibility='group'` mechanism above). "A friend" is different: it
  targets one specific person regardless of the lake's own group,
  reusing `shared_items` (previously catch-only — `catch_id` is now
  nullable, a `spot_id` column carries the spot case) rather than a
  second visibility enum. `can_view_spot` checks both paths.
- Only the lake's group members can add spots to a group lake (or, for a
  personal lake, only its owner) — same access rule as adding known fish.
- A spot's creator can edit/delete their own spot; no separate moderation
  role for spots in Phase 1.
- **A major, first-class feature, not a minor tile** — Spots gets its own
  Home dock row (recent spots across every lake, "so I know where my
  spots are that session"). Navigation follows the real hierarchy anglers
  think in: Lake > Swim > that swim's saved spots — a Lake's detail page
  lists its swims (tap to add a new one inline, since naming schemes are
  lake-specific), tapping a swim shows just the spots saved there, so
  next time you're on that lake you go straight to "Mollie Moo's" and see
  what's already been marked. Rod length picks from a fixed set
  (9/10/11/12/13ft) via a slide-out chip reveal rather than free entry.

### Syndicate tickets (Phase 1, personal tracking only)
Manual, personal record-keeping — not tied to verified syndicate admin
accounts (that's Phase 3). Simple entity:
- `tickets`: owner_id, lake_id (or free-text syndicate name), status
  (held | wanted), renewal_date (nullable), notes

Surfaces in the Home dock as a short list — held tickets and wanted tickets
shown with a status indicator, tap through for detail.

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
  record of who set what, when. Index `fish_id` — this table is queried
  rarely (dispute/admin lookup only), not on every fish view.

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

### The Book (photo album / timeline)
The chronological catch feed lives here, not as a separate scrolling tab —
opened full-screen from the "Your Book" hero card on Home. This is the one
warm, journal-feeling element in the app (cream, serif typography,
tactile) — everywhere else stays sleek and minimal (see Section 6a).

- Page-turning experience, video-game-inspired: **V1** is a convincing
  swipe-to-turn transition (3D perspective tilt + slide, no true curl
  physics) — achievable without a major standalone build. **V2** (later,
  once core app is solid) upgrades to true physics-based page curl if still
  wanted once V1's been felt in hand — this would use Skia + Reanimated,
  a proper mini-project on its own.
- Photo-forward cards, one per catch — personal bests get a subtle visual
  marker (e.g. amber accent border), not a badge (no forum energy)
- **"On this day"** — a small, quiet card surfacing past catches from the
  same date in previous years, occasionally, not pinned or repeated. Quiet
  nostalgia, not a notification.
- **Scale:** cursor-based pagination from day one — loads the next batch
  as the angler scrolls, not "load everything." Invisible at 5 friends,
  essential once someone's logged hundreds of catches over years.

### Home screen (hub)
Home is a hub, not a dashboard — deliberately restrained, most weight given
to The Book.

**Layout, top to bottom:**
1. **"Your Book"** — hero card, warm/tactile (the one exception to the
   sleek dark UI elsewhere), opens The Book full-screen when tapped
2. **Icon dock** — a single vertical list of rows: Stats, Targets, Sessions,
   Groups, Favourite Lakes, Syndicate Tickets, Friends. Each row shows an
   icon, label, and count.

**Interaction model:**
- Tapping the **chevron/row body** expands an inline accordion — a quick
  peek at that section's list, collapses again on second tap. Where an
  item in the peek can be acted on directly (mark a target achieved, flip
  a ticket's held/wanted status, accept or decline a friend request, open
  a session/group/lake), it's a real control, not read-only text.
- Tapping the **icon itself** slides out two quick-action buttons — Add
  [X] and [X]'s saved list — rather than jumping straight to the full
  page. Tapping the icon again collapses it. Stats is the one exception
  (plain tap straight through, since there's nothing to "add" there).

**Stats** (new, ties into Pattern Insights below): best session, trip-outs
(count of sessions logged), total hours on the bank, personal bests — this
is where "Pattern insights" gets a proper front door in the UI, rather than
being buried.

**Bottom nav bar:** just **Home** and **Profile** — no repetition with the
dock. Profile holds account/settings only, not stats (stats live in the
dock per above).

**Quick-log:** floating action button, bottom-right, always present —
**opens straight to the photo library** (not a camera capture flow, since
anglers take the photo on their phone first and add it to the app after —
no reason to duplicate camera functionality).

**Design tone for Home/dock:** sleek, clean, minimal, dark — near-black
olive base, thin hairline borders between rows, condensed sans typography
(not the warm serif reserved for The Book). Amber accent is used
**sparingly, reserved for meaningful counts/badges** (e.g. a "wanted"
ticket status) rather than decorating every icon — keeps the highlight
colour meaningful rather than becoming wallpaper.

### Timeline (superseded — see "The Book" above)
No separate Timeline tab. The chronological feed is what "The Book" opens
into.

### Pattern insights (personal only in Phase 1)
- Personal bests (biggest, most captures, longest session, etc.)
- Simple trends: which baits/lakes are producing for *this* angler,
  weight over time, catches by month/season
- Surfaced via the **Stats** entry in the Home dock (see above)

### Sharing model (three tiers — all Phase 1, this is core to the vision)

**1. Groups.** Anglers can create self-organized teams (e.g. "ADHDanglers")
for ongoing knowledge sharing. Group members can see each other's shared
catches/intel by default within the group context. This is the "little
team" model, not a public community. Only the group's owner role can add
members (matches the same restriction already established for changing a
group lake's `publicity_policy` — flipping shared access affects
everyone at once).

**How a friend actually gets found.** No public username search or
directory — that would cut against "nothing visible to anyone by
default." Instead every angler has a short, personal, shareable
`invite_code` (`users.invite_code`, unique) — share yours with someone
you know outside the app (text, in person), they enter it, that sends a
normal friend request (still requires their accept — entering a code
isn't itself consent to anything beyond "here's who I mean"). Only after
that resolves to an accepted friendship can a group owner add them to a
group, since group membership is drawn from your accepted friends list,
not an open search.

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

### Upcoming sessions (planned trips)
New lightweight entity, distinct from a logged catch:
- `sessions`: id, owner_id, lake_id, planned_start, planned_end, notes
Surfaces in the Home dock; feeds Phase 2's group calendar/overlap detection.

### Competitive positioning
Reference competitor: **Catch** (Go Catch) — booking-first, multi-species,
AI photo-based weather/moon-phase auto-extraction, venue booking,
brand-reward monetization, activity feeds/social sharing. Genuinely strong
at booking and auto-weather; Session doesn't compete on booking.

Session's differentiation isn't a single feature — it's:
- **Carp-only, done properly** (sub-types, session culture, target-fish
  culture) vs. generic multi-species treatment
- **Privacy as the actual product**, not a setting — no_publicity default,
  share warnings, audit trail — none of which exists in a booking-first,
  activity-feed-driven app
- **Target fish list + fish passport** — not available elsewhere found in
  competitive research
- **The physical-book feeling** — nostalgia-driven design vs. utility-first
  competitors

### Differentiators (what makes Session not "just another catch log")
- **No ads, no bloat, ever.** Refined principle: **nothing an angler needs
  is ever paywalled — some things they'd want are** (see Monetization
  below). This distinction matters — carp anglers dislike subscriptions
  gating their own catch data, not subscriptions existing at all.
- **Seasonal/annual album export.** A beautifully laid-out exportable PDF
  of a year's captures — ties the digital app back to the original
  physical-book ritual. Always exports from the **original, uncompressed
  photo** (see Image handling below) — this is the one moment quality
  matters most.
- **Fish passport (ties into recapture recognition, Phase 1.5).** Each
  recognized fish gets its own page: name, full capture history across
  the friend group, not just a tag on individual catch records.
- **Trackside-friendly logging.** Voice-note-to-log option (speak the
  details, review/edit later) for cold hands/poor signal at the lake.
  Offline-first — catches log locally and sync when back in signal.
- **Auto-fetched conditions.** Weather, air pressure, and moon phase
  pulled automatically from catch time/location (see above) — angler
  never types it, but it still feeds pattern insights.
- **"On this day."** Quiet nostalgia surfacing (see The Book, above).

---

## 4. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| App framework | **Expo (React Native) + TypeScript** | Lets you build and test live on iPhone/iPad *today* via the Expo Go app, no Mac/Xcode required until final store builds. Single codebase, iOS-first, **Android supported architecturally without any stack change** — flip-the-switch later, not a parallel build. |
| Navigation | Expo Router | File-based routing, standard for modern Expo apps |
| Styling | NativeWind (Tailwind for RN) | Fast to iterate, consistent design tokens |
| Backend | **Supabase** (Postgres + Auth + Storage + Realtime) | Generous free tier, handles auth/db/image storage in one place, works cleanly with Expo, easy for Claude Code to scaffold against. Postgres scales comfortably to tens of thousands of users on this same schema. |
| Image handling | `expo-image-picker` + client-side compression before upload, **two-tier storage** | See "Image handling & scale" below |
| Server state | TanStack Query (React Query) | Clean data-fetching/caching against Supabase |
| Local/app state | Zustand | Lightweight, minimal boilerplate |
| Auth | Supabase Auth — Apple Sign-In (iOS primary), Google Sign-In (Android, when built), email fallback | Apple Sign-In expected on iOS; Google Sign-In is the natural equivalent when Android ships |
| Version control | GitHub (private repo) | Standard, needed for Claude Code and EAS builds |
| Build/deploy | EAS Build (Expo Application Services) | Cloud builds — installable iOS build before Xcode is even installed locally |
| Weather data | Open-Meteo (historical API) | Free at current scale, no API key; revisit commercial tier once Session has real revenue |

**Not needed for Phase 1:** any global/shared lake database infrastructure,
admin roles, or public content moderation — keep the backend schema simple
and personal/friends-scoped.

### Image handling & scale
Photos are the product ("photos are the hero") — this is the real cost/
complexity driver at scale, not user count.
- **Client-side compression before upload** — non-negotiable, keeps uploads
  fast without perceptible quality loss (modern compression, e.g. WebP/HEIC,
  cuts file size 60-80% with no visible difference at normal viewing sizes)
- **Two-tier storage:** an always-kept, untouched **original** (feeds the
  annual PDF export and full-screen zoom), and a compressed **display
  version** used for Timeline/Book scrolling and thumbnails — the angler
  never sees a lower-quality photo, they just don't download the full
  original every time they scroll past it
- The annual PDF export always pulls the **original**, even though it's
  heavier/slower to process — the one moment quality matters most

### Scale considerations (build in now, cheap; retrofit later, expensive)
- **Cursor-based pagination** on the Book/Timeline feed from day one (see
  above) — not "load everything"
- **Indexed RLS (Row Level Security) policies** — sharing model (groups,
  time-bound links, direct shares) means "can this user see this catch?"
  checks traverse several tables; index `group_members.user_id`,
  `shared_items.shared_with_user_id`, etc. from the start
- `fish_visibility_log` — index `fish_id`, query only on dispute/admin
  lookup, not on every fish view
- Realistic cost at real scale (tens of thousands of active users):
  Supabase Team tier or a well-tuned Pro tier with overages, Expo
  Production tier if pushing frequent OTA updates, Open-Meteo commercial
  tier — a "good problem to have," not a day-one concern

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
- **Apple Developer Program** ($99/year) — only required when ready for
  TestFlight or App Store release. Expo Go covers all early testing on
  your own devices for free.
- **Google Play Developer account** ($25 one-time) — only when Android
  build is actually undertaken, post-Phase 1.

### Realistic cost summary (beta stage, 2-5 friends)
Apple Developer Program ($99/year) is the only cost that can't be avoided
for an installable (non-Expo-Go) build. Supabase, Expo/EAS, and GitHub are
all free at this scale. Testing via Expo Go itself costs nothing at all.

---

## 6. Onboarding

First-run experience should sell the vision, not just collect a signup:
1. **Welcome/splash** — wordmark, single evocative line, no logo animation
   gimmicks
2. **Value prop (2 short swipeable screens)** — a beautifully rendered
   example timeline/catch card (not an empty state), then a quick visual of
   the sharing model ("Your book. Shared only when you choose.") to
   establish privacy-first identity immediately. "Skip" always available,
   never forced.
3. **Sign up** — Apple Sign-In primary (one-tap), email secondary
4. **First light setup** — one simple choice: fishing solo for now, or
   setting up with mates (skips straight in, or prompts creating/joining a
   first group) — the only thing onboarding asks beyond signing up

## 6a. Design System

**Two distinct modes, deliberately separated:**

**Mode 1 — The Book (warm, journal-like):** cream base, serif headings,
tactile. This is the one place the original warm/earthy mood lives.
- Base/background: warm cream (`#F5F1E8`)
- Primary: deep moss green (`#3D4A34`)
- Accent: rich tobacco brown (`#8B5A2B`)
- Text/ink: warm charcoal (`#2B2620`)
- Highlight (personal bests): muted amber (`#C08A3E`)
- Typography: serif for headings (Fraunces), clean sans for body/data
  (Inter)

**Mode 2 — Everywhere else (sleek, minimal, dark, carpy):** near-black
olive base, condensed sans typography, thin hairline borders. This is Home,
the icon dock, navigation — the majority of the app.
- Background: near-black olive (`#14170F`)
- Panel: `#1B1F16`, panel-hover: `#232A1C`
- Moss accent: `#5C7A4C` (icons, default state)
- Amber: `#C9974A` — **reserved for meaningful counts/badges**, not
  decoration (e.g. a "wanted" ticket, a target close to landing)
- Text: `#EDEBE0` (primary), `#8B9184` (dim), `#5C6154` (faint)
- Typography: Oswald (condensed, tactical-adjacent) for labels/headers,
  Inter for data/body

**Targets page exception ("Recon Mode")** — see Section 3, contained
strictly to that one page, not bled into the rest of Mode 2.

**Branding/icon:** rod pod / rod-reel-bobbin motif explored in-house as a
starting direction, but the final polished icon asset should go to a proper
illustrator/designer (not hand-coded SVG) — this is a genuinely detailed
subject (fishing tackle) that deserves confident linework a designer with
the right references can deliver better. Concept direction: something
unmistakably "carp angler," not generic fishing/outdoor iconography.

## 7. Navigation structure (summary)
- **Bottom nav:** Home, Profile only — no duplication with the dock
- **Home:** "Your Book" hero + icon dock (Stats, Targets, Sessions, Groups,
  Favourite Lakes, Syndicate Tickets, Friends)
- **Dock interaction:** tap row/chevron = inline quick-peek accordion
  (individually actionable, not just a preview); tap icon = slide-out
  Add/View quick actions rather than a hard jump to the full page (Stats
  excepted — nothing to add there)
- **The Book:** opened from the Home hero card, full-screen, page-turning,
  warm design mode — this is where the chronological catch feed lives
- **Quick-log:** floating action button on Home, opens straight to photo
  library (multi-select, not camera capture)

## 8. Design Principles (apply to every screen)

1. **Photos first.** Every layout decision should ask "does this let the
   photo breathe?"
2. **Fast to log, slow to browse.** Catch entry should take under a minute
   in the field; The Book is where people linger.
3. **No forum energy.** No red badges, no engagement-bait UI patterns. This
   is a personal archive first, a quiet social layer second.
4. **Respect the guarded nature of the original session books.** Privacy
   defaults should lean private; sharing is opt-in, not assumed.
5. **Two modes, one identity.** Sleek/dark everywhere except The Book —
   consistent enough to feel like one product, distinct enough that opening
   the Book feels like a genuine change of pace.

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
- Structured tickets are posted as **GitHub Issues** via the API
- Crash/error monitoring (e.g. Sentry free tier) feeds into the *same*
  GitHub Issues pipeline, single front door for both self-reported and
  auto-detected problems
- **At real scale (well beyond beta), revisit this:** Sentry should do
  real triage/deduplication before anything reaches a human — a raw
  GitHub-issue-per-crash model works for 2-5 friends, not tens of
  thousands of users

### 9c. Owner notification & authorization
- New issue → owner gets notified (email/push)
- Owner reviews and, when ready, adds an `approved` label or comments
  `@claude` on the issue to authorize work — human-in-the-loop gate;
  nothing gets built without explicit sign-off

### 9d. Agent implementation
- `anthropics/claude-code-action` (official GitHub Action) triggers on
  the `@claude` mention, reads the issue, implements the fix/feature, and
  opens a **pull request** on a new branch
- **It never auto-merges.** Owner reviews the diff and merges manually
- Setup: run `/install-github-app` inside Claude Code as repo admin

### 9e. Build & release automation
- EAS Build triggers automatically on merge to `main`, producing an
  installable preview build for the beta group without a manual build step
- Release notes auto-drafted by Claude from the merged issue/PR
  description, feeding an in-app "what's new" card

### 9f. Data enrichment automation
- On catch creation, weather/pressure/moon phase auto-fetch (see Section 3)
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
- In-app "roadmap" view auto-generated from GitHub issue labels so testers
  see their feedback landing without the owner manually maintaining anything

### 9i. Data safety
- Scheduled automatic backups of the Supabase database from day one —
  this content is emotionally irreplaceable to users, so backups aren't a
  "later" concern

### Security notes for this architecture
- By default only users with write access can trigger the GitHub Action,
  bots are blocked — fine for a small closed beta, revisit if the group
  grows
- The `@claude` trigger prompt should be scoped/guarded against prompt
  injection from user-supplied issue content

---

## 10. Monetization (future, non-core — does not affect Phase 1 build)

Not a Phase 1 concern, but worth having a coherent direction so Phase 1
data models don't accidentally close doors.

**Guiding principle:** nothing an angler *needs* is ever paywalled (their
own catches, their own photos, core logging/timeline) — some things they'd
*want* are. This refines, not contradicts, "no ads, no bloat, ever."

**Realistic paths, roughly ranked by fit:**
1. **Physical photo book printing.** Turns the seasonal/annual PDF export
   into an actual paid product — a printed hardback of the year's catches.
   Directly extends the "session book" nostalgia at the core of the brand;
   naturally recurring (new book each year) rather than one-off.
2. **B2B syndicate/fishery accounts.** Ties into the Phase 3 admin
   notification concept — syndicates pay for real-time capture monitoring
   and eventually duty rostering on their own water. A business selling to
   businesses, healthier unit economics than squeezing individual anglers,
   and doesn't require mass individual adoption to matter.
3. **Modest subscription for genuinely additional capability** (extra
   groups, unlimited targets, advanced pattern insights) — never gates the
   core promise. A one-time "lifetime unlock" is a gentler alternative but
   weaker as a standalone business, since revenue doesn't compound the way
   subscriptions do.
4. **Curated tackle partnerships** — handle carefully; only viable if it
   stays editorially useful (e.g. a rig library with optional, clearly
   disclosed shop links), never sponsored-placement-feeling.

Not financial advice — directional thinking only, revisit with real usage
data once there's a live beta.

---

## 11. Current Status

Passion project, no monetization in Phase 1 — but built to a genuinely
professional standard; this should feel like a polished product, not a
prototype. Development pace: several evenings/weekend. Claude Code will do
the majority of implementation; the project owner directs priorities and
tests on-device via Expo Go.

Early beta group: 2–5 friends lined up to test once core logging + basic
sharing are working. Keep this in mind for practical decisions (e.g.
invite flow needs to be simple enough for a small trusted group, not
built for scale yet) — while still building with the scale considerations
in Section 4 in place from day one, since retrofitting them later is far
more expensive than including them now.

**Next step:** scaffold the Expo project, set up Supabase schema for
`users`, `catches`, `catch_photos`, `lakes` (personal or group-owned via
`group_id`), `known_fish`, `spots`, `targets`, `tickets`, `sessions`,
`friendships`, `groups`/`group_members`, `share_links`, `shared_items`,
and `fish_visibility_log`, and get the catch-logging flow + Home hub +
Book view working end-to-end before touching sharing features.

---

## 12. User Account Tiers

Built in early since retrofitting later is expensive; access rules per
tier can be decided later.

**Schema:** `users.account_tier` — enum: `standard | free_for_life |
beta_tester | ambassador`
- Defaults to `standard` for all new signups
- Manually set by the project owner (Supabase dashboard directly for now;
  a lightweight internal admin screen can be built later if this becomes
  frequent — e.g. sponsor/ambassador signups)
- No self-serve redemption flow in Phase 1 — this is owner-granted only

**Purpose of each tier (name only for now — specific perks/access TBD):**
- `free_for_life` — comped access, no payment ever required (e.g. VIPs,
  sponsors like a Korda endorsement)
- `beta_tester` — early testers (the 2–5 friend beta group), may later
  get perks as thanks for early feedback
- `ambassador` — press/sponsored relationships, distinct from casual VIP
  comps

**Implementation note:** whatever paywall/gating logic gets built in
Phase 2+ should treat any non-`standard` tier as "bypass paywall" by
default, with room to differentiate tiers further later if needed. This
column has zero effect on Phase 1 functionality — it just needs to exist
so tier assignment isn't retrofitted after real users (and potential
sponsors) are already in the system.
