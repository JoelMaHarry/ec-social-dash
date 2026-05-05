# EC Social Dashboard — Project Instructions

**Version:** 2.0
**Maintainer:** Joel MaHarry
**Last updated:** May 4, 2026
**Live site:** https://ec-social-dash.netlify.app
**Repo:** https://github.com/JoelMaHarry/ec-social-dash (branch: `main`)

---

## 1. Project Identity

The Energy Corps Social Media Dashboard & Command Center is a single-file SPA that serves as a content workflow, account monitoring, and analytics hub for the EC team and Underground Agency collaborators. It is password-protected and intended for a small group of internal users and clients.

- **Stack:** Single self-contained `index.html` — vanilla JS, embedded CSS, embedded base64 fonts, Chart.js via CDN, Netlify Functions for serverless storage
- **No framework, no build process** for the front end. One file is the deployable unit.
- **Backend:** Netlify Functions (`netlify/functions/calendar.js`) backed by Netlify Blobs for shared persistent state
- **Hosting:** Netlify Pro ($19/mo plan), continuous deployment from GitHub
- **Access control:** Netlify Visitor Passcode (a Pro feature)

---

## 2. Deployment Workflow

The project is deployed via GitHub → Netlify continuous deployment. Drag-and-drop folder uploads are no longer used.

### Standard flow

1. Claude edits `index.html` (or supporting files) and pushes directly to the `JoelMaHarry/ec-social-dash` repo via the GitHub REST API
2. Netlify watches `main` and auto-deploys on push
3. Joel verifies the deploy and reviews the change on the live site

### GitHub API push pattern

Pushes are always a two-step operation:

1. **GET** the existing file from `/repos/{owner}/{repo}/contents/{path}` to retrieve the current `sha` and the base64-encoded content
2. **PUT** the updated content back, providing:
   - `message` — commit message
   - `content` — new content, base64-encoded
   - `sha` — the value retrieved in step 1
   - `branch` — `main`

For new files, omit the `sha` field on the PUT.

### Implementation notes

- Use Python's `urllib` (not curl) for large files. Curl heredocs are unreliable for files this size.
- **Use a classic GitHub PAT with `repo` scope.** Fine-grained tokens have had permission issues in this context. The active token must be fresh — older tokens that may have been exposed should be revoked.
- Surgical edits via `str_replace` are strongly preferred over full-file rewrites. See §7 Coding Rules.

### Editor

Joel's local editor is BBEdit. With the GitHub API push pattern, manual file management is no longer required — Claude pushes directly and Netlify deploys automatically.

---

## 3. Architecture

### Front end

The entire app simulates a multi-page SPA inside one HTML file. Page switching is handled by a `navigate(pageId)` function that toggles visibility of `<div class="page">` elements:

```javascript
function navigate(pageId) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  document.getElementById('page-' + pageId).style.display = 'block';
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-page="${pageId}"]`)?.classList.add('active');
}
```

**Layout:** Fixed sidebar (220px) + fixed topbar (56px) + scrollable main content. Canvas target: 1440 × 900px.

### Persistent state

Two layers, used for different purposes:

| Layer                                               | Use                                                          | Why                                                          |
| --------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `localStorage`                                      | Per-user UI state — e.g. status dots on account monitor cards | Per-browser, fast, no network call                           |
| Netlify Blobs (via `netlify/functions/calendar.js`) | **Shared** state across all dashboard users — currently the Content Calendar | localStorage doesn't sync across browsers/users; Blobs is the right layer for collaborative data |

**Rule:** Anything that needs to be visible to more than one user goes through Netlify Blobs. Anything that's just a local preference can stay in `localStorage`.

### `package.json` requirement

Any file under `netlify/functions/` that imports an npm package (e.g. `@netlify/blobs` in `calendar.js`) requires a `package.json` at the repo root listing that dependency. Without it, Netlify's Functions bundler fails the build.

---

## 4. Modules

### MAIN

| Page ID | Nav Label     | Purpose                                                      | Status |
| ------- | ------------- | ------------------------------------------------------------ | ------ |
| `home`  | Daily Monitor | Three-panel command center: account monitor grid (left), calendar preview (center), analytics snapshot (right). Includes Quick Scan / Full Scan tab launchers. | Live   |

### WORKFLOW

| Page ID             | Nav Label         | Purpose                                                      | Status |
| ------------------- | ----------------- | ------------------------------------------------------------ | ------ |
| `content-bank`      | Content Bank      | Embedded Google Sheet for content planning.                  | Live   |
| `adm-conduit`       | ADM Conduit       | Embedded Google Sheet — two-way channel for ADM/UA reviews and approvals. | Live   |
| `live-post-tracker` | Live Post Tracker | Embedded EC NEW POST TRACKER tab from main sheet.            | Live   |
| `repost-alert`      | Repost Alert      | Embedded sheet tab for repost monitoring.                    | Live   |
| `ideation`          | Ideation          | Hardcoded iframe to `!EC Ideation` Drive folder + "Open in Drive →" button. | Live   |

### INTELLIGENCE

| Page ID            | Nav Label        | Purpose                                                      | Status     |
| ------------------ | ---------------- | ------------------------------------------------------------ | ---------- |
| `analytics`        | Analytics        | LinkedIn metrics. **Currently hardcoded** (Feb 7 – Mar 8, 2026). | Stale data |
| `content-calendar` | Content Calendar | **Custom HTML/CSS/JS calendar** backed by Netlify Blobs via `netlify/functions/calendar.js`. Replaced the broken Google Calendar embed. | Live       |
| `strategy-2026`    | 2026 Strategy    | Read-only Google Doc embed.                                  | Live       |
| `hashtag-bank`     | Hashtag Bank     | Embedded sheet tab.                                          | Live       |
| `fundraising`      | Fundraising      | Placeholder.                                                 | Not built  |

### AUDIENCE

| Page ID              | Nav Label          | Purpose             | Status |
| -------------------- | ------------------ | ------------------- | ------ |
| `linkedin-network`   | LinkedIn Network   | Embedded sheet tab. | Live   |
| `influencer-network` | Influencer Network | Embedded sheet tab. | Live   |
| `ngo-corp-network`   | NGO & Corp Network | Embedded sheet tab. | Live   |

---

## 5. Daily Monitor

The home page combines three panels and runs the only non-iframe workflow on the dashboard.

### Account monitor grid

Hardcoded cards with status dots (persisted in `localStorage`) and edit-pencil toggles. Status dots are per-browser by design — each user marks their own state.

### Quick Scan / Full Scan

Two buttons launch a sequence of LinkedIn source pages in new browser tabs for the user to review manually. The set of accounts is controlled by a `MONITOR_SOURCES` config at the top of the script block. Each source has a `quick` flag — `true` puts it in the Quick Scan set, `false` means it only appears in Full Scan.

This is the **semi-automatic** version of the Daily Monitor. It is intentionally simple — no scraping, no automation, no third-party tools that put the EC LinkedIn account at risk.

### Calendar preview panel

Pulls the next several events from the Content Calendar (Netlify Blobs) and renders them as date-badged list items.

### Analytics snapshot panel

Currently shows hardcoded LinkedIn metrics. Wiring this to live data is on the punch list.

---

## 6. Design System

### Colors

```css
--purple:   #3C3F74   /* primary, sidebar background */
--orange:   #FF8F22   /* accents, badges, highlights */
--teal-lt:  #00909d   /* links, active states */
--teal-dk:  #004a52   /* card titles, section headers */
--white:    #ffffff
--fog:      #f3f4f6   /* page background */
--mist:     #e8eaed   /* card borders */
--ink:      #111820   /* body text */
```

### Typography

All custom fonts are base64-embedded in the HTML file as `@font-face` declarations.

| Variable       | Font                       | Usage                                        |
| -------------- | -------------------------- | -------------------------------------------- |
| `--font-brand` | Sunset Gothic Pro Bold     | H1, topbar wordmark, display numbers         |
| `--font-sub`   | Rothwood Book / Italic     | H2, H3, subheads                             |
| `--font-emph`  | ITC Franklin Gothic Demi   | H4, labels, card titles, nav section headers |
| `--font-body`  | DM Sans (Google Fonts CDN) | Body, nav items, captions                    |

### Layout decisions

- **Topbar:** 3-column grid. Left: "SOCIAL MEDIA DASHBOARD & COMMAND CENTER". Center: EC logo (base64 PNG) + "Energy Corps". Right: current date.
- **Page header titles** use Title Case, not ALL CAPS.
- **Home page card titles** (Daily Monitor, Preview, Analytics Snapshot) are dark teal (`--teal-dk`), bold Franklin Gothic.
- **Sheet embeds** use the `.sheet-embed` class — full-width iframe filling the content area.
- **Google Doc embeds** use the `/preview` suffix for clean read-only rendering with no toolbar.

---

## 7. Coding Rules

These exist because they've each broken a build at some point. Treat them as load-bearing.

1. **No template literals in JS that gets pushed via Python heredoc.** Backticks inside heredoc strings have caused Netlify build failures. Use string concatenation (`+`) and Unicode escapes (`\u2192`, `\u2026`) instead.
2. **`package.json` at repo root is required** for any function that imports an npm package. Listed dependency or no build.
3. **Surgical edits over full rewrites.** Default to `str_replace` with unique surrounding context. Only output the full file when the change spans many distant sections, when Joel asks for it, or when the change is too integrated to patch safely.
4. **Verify after editing.** Grep the result before pushing to confirm the replacement landed where intended.
5. **Preserve the single-file architecture.** Don't split CSS or JS into separate files unless we explicitly decide to change the architecture.
6. **Preserve existing page IDs and nav structure** unless we're intentionally restructuring.
7. **Use `view_range`** when inspecting specific sections of `index.html` — the file is ~2,800 lines.

### Page structure pattern

```html
<div class="page" id="page-[page-id]">
  <div class="page-header">
    <div class="page-header-eyebrow">Section Name</div>
    <h1 class="page-header-title">Page Title</h1>
    <p class="page-header-desc">Description text.</p>
  </div>
  <div class="placeholder-page">
    <!-- content here, usually an iframe or custom component -->
  </div>
</div>
```

### Adding a new page

1. Add a nav item inside the correct `<div class="nav-section">` with `data-page="[id]"` and `onclick="navigate('[id]')"`
2. Add a `<div class="page" id="page-[id]">` block in the pages section
3. No router registration needed — `navigate()` handles all IDs

---

## 8. Data Sources

### Main EC Google Sheet

**Sheet ID:** `1bii8rxNq3JVJ8E_diHpVQaWr2tLSTmMCkjPYq6u8qYM`

**Embed URL pattern:**

```
https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit?gid=[GID]&single=true&widget=true&headers=false
```

**Tab GIDs:**

| Tab                                     | GID          |
| --------------------------------------- | ------------ |
| Live Post Tracker (EC NEW POST TRACKER) | `1419036321` |
| Repost Alert                            | `1756250426` |
| Hashtag Bank                            | `1650176984` |
| LinkedIn Following                      | `1523049774` |
| Influencer Network                      | `1246759808` |
| NGO & Corp Network                      | `1487081840` |

### Separate Google Sheets

| Sheet        | URL                                                          |
| ------------ | ------------------------------------------------------------ |
| Content Bank | `https://docs.google.com/spreadsheets/d/1qGyX__9fA0DzkLW8ucGq3gRAy-SQpzQkNL69sEyQKks/edit?gid=1920724446` |
| ADM Conduit  | `https://docs.google.com/spreadsheets/d/1YpmQxblzsOLPaTTQPBmTJWqD6njwZkeggX43ldewRXQ/edit?gid=1920724446` |

Both must be shared as *Anyone with the link can edit*.

### Google Doc

**2026 Strategy:** `https://docs.google.com/document/d/1BX9MacWCaKUBenz_frQxc_zQwh3sOKD7AtnYUWyuVys/preview`
Sharing: *Anyone with the link can view*.

### Google Drive

**Ideation folder ID:** `1UZ0r3ohAd7bCrCv9Mz0xaYBEAFgiW9RI`
Embedded as a Drive folder iframe with an "Open in Drive →" button.

### Chrome account requirement

For Google embeds (sheets, doc, Drive folder) to render correctly, the browser must be signed into `joel@undergroundads.com`. This applies to anyone testing the dashboard locally with their own Chrome profile.

### Content Calendar (custom)

Stored in Netlify Blobs via `netlify/functions/calendar.js`. No Google Calendar embed in the current build. The `sync-to-gcal-v2.gs` Apps Script that previously populated a Google Calendar from the sheet is **likely obsolete** — verify and either remove or clearly document as legacy.

### Analytics

Hardcoded in `index.html`:

- Period: Feb 7 – Mar 8, 2026
- Impressions: 321,458 | Reactions: 514 | Followers: 820 | New: +474
- Company handle: `energy-corps` | LinkedIn ID: `105966990`

---

## 9. Open Punch List

**Priority (in order):**

1. **Full Daily Monitor automation** — Feedly + Zapier + Google Sheets + Netlify Function + Claude API. Architecture is fully specced. Parked until prioritized.
2. **Fundraising page** — needs design and content.
3. **Analytics page** — wire to live LinkedIn data instead of hardcoded numbers.
4. **Stabilization items** from the original v1.0 punch list that weren't completed (audit and close out).

**Verification needed:**

- Netlify Blobs is enabled in site settings (required for the custom Content Calendar to function). Confirm.
- Content Bank sheet sharing — *Anyone with link can edit*.
- ADM Conduit sheet sharing — *Anyone with link can edit*.
- 2026 Strategy doc sharing — *Anyone with link can view*.
- `sync-to-gcal-v2.gs` Apps Script — confirm whether to retire or document as legacy.

---

## 10. Working Style

- **Documentation is the source of truth.** This file lives in the repo and is the canonical reference. Update it when state changes.
- **Direct execution.** Inspect the code or repo state rather than asking Joel to re-explain. No circular confirmations.
- **Surgical edits.** Targeted string replacements over rewrites.
- **No clarifying questions when code inspection answers them.** Read first, ask only when something is genuinely ambiguous.
- **Memory persistence matters.** Update saved memory when architecture or workflow changes meaningfully.

---

## 11. Reference

| Resource                  | Where                                                   |
| ------------------------- | ------------------------------------------------------- |
| Live site                 | https://ec-social-dash.netlify.app                      |
| Repo                      | https://github.com/JoelMaHarry/ec-social-dash           |
| Netlify project           | `ec-social-dash`                                        |
| Deploy history (rollback) | https://app.netlify.com/projects/ec-social-dash/deploys |
| Active branch             | `main`                                                  |
| Single deployable file    | `index.html` (repo root)                                |
| Functions                 | `netlify/functions/calendar.js`                         |
| Dependencies              | `package.json` (repo root)                              |
