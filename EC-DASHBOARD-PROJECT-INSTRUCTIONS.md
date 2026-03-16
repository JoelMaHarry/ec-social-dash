EC Social Dashboard Technical Instructions
Version: 1.1
Maintainer: Joel MaHarry
Last updated: March 15, 2026

# EC Social Media Dashboard — Claude Project Instructions

## Project Identity
- **Project:** Energy Corps Social Media Dashboard & Command Center
- **Live URL:** https://ec-social-dash.netlify.app
- **Netlify Project:** `ec-social-dash`
- **Stack:** Single self-contained `index.html` — vanilla JS, embedded CSS, embedded base64 fonts, Chart.js via CDN
- **No build process.** No framework. No dependencies to install. Everything is in one file.

---

## 1. Dashboard Architecture

The entire app is a **single HTML file** that simulates a multi-page SPA using a `navigate()` function that shows/hides `div.page` elements by ID. There is no routing library — just:

```javascript
function navigate(pageId) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  document.getElementById('page-' + pageId).style.display = 'block';
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-page="${pageId}"]`)?.classList.add('active');
}
```

**Layout:** Fixed sidebar (220px) + fixed topbar (56px) + scrollable main content area. Canvas target: 1440×900px.

**State:** localStorage is used for status dots on the account monitor cards on the home page. No other persistent state.

---

## 2. Modules and Their Purpose

### MAIN
| Page ID | Nav Label | Purpose |
|---|---|---|
| `home` | Daily Monitor | Command center home. Three panels: account monitor grid (left), calendar preview (center), analytics snapshot (right). |

### WORKFLOW
| Page ID | Nav Label | Purpose |
|---|---|---|
| `content-bank` | Content Bank | Embedded Google Sheet for content planning and storage. |
| `adm-conduit` | ADM Conduit | Two-way channel for ADM/UA reviews and approvals. Embedded Google Sheet. |
| `live-post-tracker` | Live Post Tracker | Embedded Google Sheet (EC NEW POST TRACKER tab). Tracks all live LinkedIn posts. |
| `repost-alert` | Repost Alert | Embedded Google Sheet tab for repost monitoring. |
| `ideation` | Ideation | **PENDING MAJOR REVISION** — currently placeholder. |

### INTELLIGENCE
| Page ID | Nav Label | Purpose |
|---|---|---|
| `analytics` | Analytics | Hardcoded LinkedIn metrics (Feb 7–Mar 8 2026). Needs live data update. |
| `content-calendar` | Content Calendar | Embedded Google Calendar (live, auto-updates). Replaced original sheet embed. |
| `strategy-2026` | 2026 Strategy | Read-only Google Doc embed. EC social strategy document. |
| `hashtag-bank` | Hashtag Bank | Embedded Google Sheet tab. |
| `fundraising` | Fundraising | **PLACEHOLDER ONLY** — not yet built. |

### AUDIENCE
| Page ID | Nav Label | Purpose |
|---|---|---|
| `linkedin-network` | LinkedIn Network | Embedded Google Sheet tab. |
| `influencer-network` | Influencer Network | Embedded Google Sheet tab. |
| `ngo-corp-network` | NGO & Corp Network | Embedded Google Sheet tab. |

---

## 3. UI/UX Decisions

### Design System

**Colors:**
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

**Typography — ALL FONTS ARE BASE64 EMBEDDED in the HTML file:**
```css
--font-brand: Sunset Gothic Pro Bold      /* H1, topbar wordmark, display numbers */
--font-sub:   Rothwood Book / Italic      /* H2, H3, subheads */
--font-emph:  ITC Franklin Gothic Demi   /* H4, labels, card titles, nav section headers */
--font-body:  DM Sans                    /* body text, nav items, captions — loaded from Google CDN */
```

### Key UI Decisions Made
- **Topbar:** 3-column grid. Left: "SOCIAL MEDIA DASHBOARD & COMMAND CENTER". Center: EC logo (base64 PNG) + "Energy Corps". Right: current date only.
- **No "Internal" badge** — removed from topbar.
- **No "Client Approval" tab** — deleted entirely (page and nav item).
- **No "Calendar Preview" or "Analysis Snapshot"** in sidebar nav — those panels exist on the home page only, not as separate nav items.
- **Page header titles** use Title Case, not ALL CAPS.
- **Home page card titles** (Daily Monitor, Preview, Analytics Snapshot) are styled dark teal (`--teal-dk`), bold Franklin Gothic (`--font-emph`).
- **Sheet embeds** use `.sheet-embed` class — full-width iframe filling the content area.
- **Google Calendar embed** uses `mode=MONTH`, `showTitle=0`, `showNav=1`, no print/tabs/timezone clutter.
- **Google Doc embed** uses `/preview` suffix for clean read-only view with no toolbar.

---

## 4. Data Sources and Linked Documents

### Main EC Google Sheet
**Sheet ID:** `1bii8rxNq3JVJ8E_diHpVQaWr2tLSTmMCkjPYq6u8qYM`

**Embed URL pattern:**
```
https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit?gid=[GID]&single=true&widget=true&headers=false
```

**Tab GIDs:**
| Tab | GID |
|---|---|
| Live Post Tracker (EC NEW POST TRACKER) | `1419036321` |
| Repost Alert | `1756250426` |
| Content Calendar (original — replaced by Google Cal) | `1598571393` |
| Hashtag Bank | `1650176984` |
| LinkedIn Following | `1523049774` |
| Influencer Network | `1246759808` |
| NGO & Corp Network | `1487081840` |

### Separate Google Sheets
| Sheet | URL |
|---|---|
| Content Bank | `https://docs.google.com/spreadsheets/d/1qGyX__9fA0DzkLW8ucGq3gRAy-SQpzQkNL69sEyQKks/edit?gid=1920724446` |
| ADM Conduit | `https://docs.google.com/spreadsheets/d/1YpmQxblzsOLPaTTQPBmTJWqD6njwZkeggX43ldewRXQ/edit?gid=1920724446` |

**Both must be shared:** *Anyone with link can edit*

### Google Calendar
**EC Content Calendar embed URL:**
```
https://calendar.google.com/calendar/embed?src=c_5d5ae908952c9f19307339ad9c318a05c2d13bd61e658d46aee37efa7149af8f%40group.calendar.google.com&ctz=America%2FLos_Angeles&mode=MONTH&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&showTz=0
```
**Must be set to public** in Google Calendar settings → Access permissions → Make available to public.

Populated via Apps Script (`sync-to-gcal-v2.gs`) from the CONTENT CALENDAR tab of the main sheet. Columns: DATE (A), EVENT (B), CATEGORY (C), STRATEGIC ANGLE (D), NOTES (E). Column F used for sync status (✓).

### Google Doc
**2026 Strategy:** `https://docs.google.com/document/d/1BX9MacWCaKUBenz_frQxc_zQwh3sOKD7AtnYUWyuVys/preview`
**Must be shared:** *Anyone with link can view*

### Analytics Data (hardcoded — needs update)
- Period: Feb 7–Mar 8, 2026
- Impressions: 321,458 | Reactions: 514 | Followers: 820 | New followers: +474
- Company: energy-corps | LinkedIn ID: 105966990

### Chrome Account Note
The Chrome browser used for viewing the dashboard must be signed into **joel@undergroundads.com** for Google Sheet/Doc/Calendar embeds to render correctly.

---

## 5. Known Issues / Bugs

| Issue | Status | Notes |
|---|---|---|
| Analytics page has hardcoded data | Open | Needs live LinkedIn data update |
| Ideation page is placeholder | Open | Major revision planned |
| Fundraising page is placeholder | Open | Not yet scoped |
| Content Bank sharing | Needs verification | Must be "Anyone with link can edit" |
| ADM Conduit sharing | Needs verification | Must be "Anyone with link can edit" |
| Content Calendar public access | Needs verification | Must be set to public in Google Calendar |
| 2026 Strategy doc sharing | Needs verification | Must be "Anyone with link can view" |
| Missing 17 events on first calendar sync | Resolved | Fixed in v2 of Apps Script |

---

## 6. Next Priorities

1. **Ideation section** — major revision (scoping in progress)
2. **Fundraising page** — needs design and content
3. **Analytics page** — wire to live LinkedIn data
4. **Morning Scan Engine** — planned feature, wire to Claude/extension

---

## 7. Coding Patterns and Implementation Notes

### Deployment — CRITICAL
- **Deployment method:** GitHub → Netlify continuous deployment (automatic)
- **Repository:** https://github.com/JoelMaHarry/ec-social-dash.git (branch: `main`)
- **Workflow:** Claude edits `index.html` in the container → pushes directly to GitHub via the GitHub API using the stored PAT → Netlify auto-deploys on commit
- **No manual steps required** — no drag-and-drop, no BBEdit, no folder packaging
- **Old drag-and-drop workflow is retired** — do not use it
- Netlify account is on Pro plan ($19/mo) — upgraded March 2026 to enable Visitor Passcode password protection
- **Password protection:** Netlify Visitor Passcode is active on the site — no changes to `index.html` needed to maintain it

### Single File Patterns
- All fonts are base64-encoded and embedded in `<style>` as `@font-face` with `src: url(data:font/...)`
- EC logo is base64-encoded PNG embedded inline
- All JavaScript is in a single `<script>` block at the bottom
- All CSS is in a single `<style>` block in `<head>`
- No external JS dependencies except Chart.js and DM Sans (both CDN)

### Page Structure Pattern
Every page follows this structure:
```html
<div class="page" id="page-[page-id]">
  <div class="page-header">
    <div class="page-header-eyebrow">Section Name</div>
    <h1 class="page-header-title">Page Title</h1>
    <p class="page-header-desc">Description text.</p>
  </div>
  <div class="placeholder-page">
    <!-- content here — usually an iframe -->
  </div>
</div>
```

### Adding a New Page Checklist
1. Add nav item in the correct `<div class="nav-section">` with `data-page="[id]"` and `onclick="navigate('[id]')"`
2. Add `<div class="page" id="page-[id]">` in the pages section
3. No routing registration needed — the `navigate()` function handles all IDs automatically

### Google Sheet Embed Pattern
```html
<iframe class="sheet-embed" 
  src="https://docs.google.com/spreadsheets/d/[ID]/edit?gid=[GID]&single=true&widget=true&headers=false" 
  title="Tab Name">
</iframe>
```

### Google Calendar Embed Pattern
```html
<iframe class="sheet-embed" 
  src="https://calendar.google.com/calendar/embed?src=[ENCODED_CAL_ID]&ctz=America%2FLos_Angeles&mode=MONTH&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&showTz=0" 
  title="Calendar Name" 
  style="border:none;">
</iframe>
```

### Google Doc Embed Pattern
```html
<iframe class="sheet-embed" 
  src="https://docs.google.com/document/d/[DOC_ID]/preview" 
  title="Doc Title" 
  style="border:none;">
</iframe>
```
Use `/preview` not `/edit` for clean read-only rendering.

### Making Changes
- Always `grep` for the relevant section before editing to find exact line numbers
- Use `str_replace` with unique surrounding context to avoid wrong replacements
- After every change, verify with `grep` that the replacement is correct before deploying
- The file is ~2800 lines — always use `view_range` when inspecting specific sections
