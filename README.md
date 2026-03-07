# LintMail

A Chrome extension for auditing HTML emails before sending. Runs entirely in the browser — no backend, no API calls, no data leaves your machine.

![Chrome](https://img.shields.io/badge/Chrome-MV3-4285F4?logo=googlechrome&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/badge/version-0.5.0-blue)

---

## What it does

You paste (or upload, or capture) an email's HTML. LintMail runs a static audit across six categories and gives you a weighted score with actionable feedback per rule.

**Audit categories:**

| Category | What it checks |
|---|---|
| Accessibility | Alt text, font sizes, WCAG AA contrast ratios, heading structure, tap target sizes, `lang` attribute, table `role` attributes |
| Deliverability | Unsubscribe link, spam word patterns, text/image area ratio, email size, link density, redirect chains |
| Best Practices | Inline CSS, viewport meta, HTML doctype, table-based layout, external CSS, image dimensions |
| Compatibility | CSS properties against a Can I Email matrix (Flexbox, Grid, animations, transforms, web fonts, etc.) |
| Dark Mode | `prefers-color-scheme` support, hardcoded background colors, image transparency |
| Spam Score | SpamAssassin-based patterns, excessive caps/exclamation, money symbols, hidden text, JavaScript, form tags |

**Other features:**

- **Campaign type weighting** — the overall score weights categories differently for Promotional, Transactional, Welcome, Abandoned Cart, and Newsletter campaigns. A transactional email gets penalized more for poor accessibility than a promotional one.
- **ESP detection** — detects merge tag syntax from 10+ platforms (Mailchimp, Klaviyo, HubSpot, Salesforce MC, Braze, etc.) and validates tags are closed.
- **Email client compatibility matrix** — runs CSS property checks against Gmail, Outlook, Apple Mail, Yahoo Mail, and Samsung Mail, including version-specific notes.
- **Preview panel** — renders the email in an iframe with Dark Mode simulation, No Images mode, and a fold line at 600px.
- **A/B comparison** — analyze two versions side by side with diff scores per category.
- **Analysis history** — stores up to 20 runs in `chrome.storage.local` with diff badges between consecutive analyses.
- **Export** — JSON (full report), Markdown, PDF (via print), Excel.
- **AI summaries** — optional. Bring your own API key for Claude, Gemini, or OpenAI.
- **i18n** — English and Brazilian Portuguese throughout.

---

## Installation

LintMail is not yet on the Chrome Web Store. To install manually:

1. Download or clone this repository
2. Open `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the `lintmail` folder
5. Click the puzzle icon in the toolbar → pin LintMail → click it to open the side panel

---

## Architecture

### Why a side panel instead of a popup?

Popups close the moment they lose focus. To audit an email you need to keep the panel open while switching between tabs — checking the original send, looking at a preview URL, comparing two versions. The Chrome Side Panel API (MV3) stays open across navigation, which is the right primitive for this use case.

### Module structure

```
lintmail/
├── manifest.json
├── icons/
└── src/
    ├── panel.html          # UI shell — layout and CSS only
    ├── panel.js            # All UI logic and event handling
    ├── background.js       # Service worker — opens side panel on action click
    ├── settings.js         # chrome.storage.local read/write for user preferences
    ├── history.js          # Analysis history — storage, diff, delete
    ├── benchmarks.js       # Industry benchmark scores per campaign type
    ├── providers.js        # Email client compatibility checks (5 clients)
    ├── ai.js               # AI provider abstraction (Claude / Gemini / OpenAI)
    ├── export.js           # Export to JSON, Markdown, PDF, Excel
    └── rules/
        ├── utils.js        # calcScore() — shared, no imports
        ├── engine.js       # Orchestrates all rule runners, applies weights
        ├── accessibility.js
        ├── deliverability.js
        ├── bestPractices.js
        ├── compatibility.js
        ├── darkMode.js
        └── spam.js
```

### Why `utils.js` exists

The rule files (`accessibility.js`, `spam.js`, etc.) all need `calcScore()` to compute their category score. The obvious place for that function is `engine.js`, since the engine is what calls the rules.

The problem: that creates a circular dependency.

```
engine.js → accessibility.js → engine.js → ...
```

In Chrome's MV3 ES module environment, circular imports fail silently — the module graph resolves but functions come back `undefined`. The whole extension loads without an error, but nothing works.

The fix is to move `calcScore()` into `utils.js`, which has zero imports. It sits at the bottom of the dependency tree. Now the graph is a clean DAG:

```
utils.js  ←  accessibility.js  ←  engine.js  ←  panel.js
          ←  deliverability.js ↗
          ←  bestPractices.js  ↗
          ←  compatibility.js  ↗
          ←  darkMode.js       ↗
          ←  spam.js           ↗
```

### Why `chrome.storage.local` instead of `localStorage`

`localStorage` doesn't reliably persist between Side Panel sessions in MV3. The side panel is essentially a separate renderer process that gets torn down when closed — `localStorage` survives in a regular tab context but not consistently here. `chrome.storage.local` is the correct storage primitive for extension state and persists across panel open/close cycles.

### Layout: why `#resultArea` is a separate container

The panels (`#rp-analysis`, `#rp-preview`, etc.) use `position: absolute; inset: 0` to fill the result area completely. This means they need a positioned parent with a defined height — not a flow element in a scrollable list.

The shell is a flex column:

```
header          (44px, flex-shrink: 0)
#inputSection   (scrollable, collapses after analysis)
#statusBar      (flex-shrink: 0)
#rtabs          (flex-shrink: 0)
#resultArea     (flex: 1 — takes all remaining height)
  #rp-analysis  (position: absolute, overflow-y: auto)
  #rp-preview   (position: absolute, overflow-y: auto)
  #rp-compat    (position: absolute, overflow-y: auto)
  #rp-history   (position: absolute, overflow-y: auto)
```

Only the active panel has `display: flex`. The others have `display: none`. `#resultArea` itself needs `.on` (which sets `display: block`) — if it stays `display: none`, all child panels are invisible regardless of their own classes.

### Scoring

Each rule returns `pass`, `warn`, or `fail`. `calcScore()` maps these to 1, 0.5, and 0, then normalizes to 0–100:

```js
score = round((passes + warns * 0.5) / total * 100)
```

The overall score is a weighted average across the six categories. Weights vary by campaign type — for example, Transactional campaigns weight Accessibility at 22% vs 18% for Promotional, because a password reset email failing WCAG is a more serious problem than a promo failing it.

---

## Roadmap

- [ ] Chrome Web Store submission
- [ ] Unit tests for audit rules (Vitest)
- [ ] CAN-SPAM compliance rule (unsubscribe + physical address)
- [ ] MJML source detection
- [ ] CSS inlining suggestions
- [ ] More ESP platforms (ActiveCampaign, Iterable, Marketo)
- [ ] Rule: check for broken merge tags in preview
- [ ] Dark mode preview using actual `prefers-color-scheme` iframe trick

---

## License

MIT
