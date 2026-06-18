# HHX-OS — Hakim Haiman's Portfolio

A personal portfolio for **Hakim Haiman**, UI/UX Designer, presented as **HHX-OS**:
a retro phosphor-green operating system. On desktops it boots and runs *inside* a
CRT television (the "Retro DVD TV"); on phones it becomes a Pip-Boy–style
**handheld** running the same OS. Power it on, explore the case files, tune the
radio, poke the terminal.

The site is **responsive**: it serves the handheld to narrow/touch screens and
the TV to wide ones automatically. Force either on any device with a query param:
`?view=tv` or `?view=mobile`.

Implemented from a [Claude Design](https://claude.ai/design) handoff bundle,
recreated as a fast, dependency-light static site.

---

## Running it

It's a static site — serve the folder with anything:

```bash
# Python (no install)
python3 -m http.server 8123
# then open http://localhost:8123

# …or any static server
npx serve .
```

> A server is recommended over opening `index.html` directly (`file://`) so the
> assets and CDN scripts resolve cleanly. No build step, no `npm install`.

Deploy by uploading the folder to any static host (GitHub Pages, Netlify,
Cloudflare Pages, Vercel, S3, …).

---

## How it's built

- **Preact + htm**, loaded as UMD globals from a CDN — JSX-like authoring and
  real reconciliation (so the live terminal, the contact form, and focused
  inputs survive the once-a-second clock re-render) **without a build step**.
- The OS runs inside a fixed **960×768 "stage"** that is transform-scaled to
  fill the CRT glass; window positions, dragging, and maximize all work in that
  coordinate space.
- Most visual styling is inline (ported verbatim from the prototype so the look
  matches); `styles.css` carries resets, fonts, keyframes, `:hover` states and
  scrollbars.

```
index.html        — shell: fonts, CDN runtime, mounts the app
styles.css        — base reset, @keyframes, hover states, scrollbars
src/data.js       — shared content (work cases, services, reviews, tracks, boot…)
src/app.js        — TvFrame (CRT cabinet) + HhxOs (desktop OS) + responsive device switch
src/mobile.js     — HhxMobile (the Pip-Boy handheld)
assets/
  vault/          — desktop / dock icons, avatar, emblem
  social/         — Dribbble / Instagram / LinkedIn / X glyphs
  work/           — case-study thumbnails (6 local)
.claude/launch.json — dev-server config for the preview tooling (optional)
```

## Features

- **Boot sequence** — BIOS termlink readout → "PLEASE STAND BY" splash → desktop
  (click anywhere to skip).
- **Windowed apps** — draggable, focusable, minimize / maximize / close:
  - **Personnel File** — bio, portfolio + contact links
  - **System Settings** — phosphor Green/Amber (re-tints the whole OS), scanlines,
    brightness & volume, 12/24-hour clock, live system info
  - **Project Archive** — 14 case files with sidebar + detail view
  - **Service Modules**, **Intercepted Transmissions** (reviews),
    **Outgoing Transmission** (contact form → `mailto:`)
  - **Audio Module** — a working radio with animated EQ and playlist
  - **Terminal** — real commands: `help`, `about`, `work`, `services`,
    `contact`, `social`, `radio`, `neofetch`, `ls`, `date`, `echo`, `clear`
  - **Disposal Unit**
- **Menu bar** dropdowns, a **dock** with running indicators, and a **start menu**
  (About / Terminal / Restart / Shut Down).
- **Power button** on the TV cabinet — authentic CRT collapse/bloom on/off.
- **Responsive** — the cabinet/handheld scales to fit any viewport (capped at the
  design's ~1.5×) and stays centred.

### On mobile (HHX-OS Mobile)

A Pip-Boy–style handheld with the same `#1aff80` phosphor, CRT overlay and content:

- **Home** — status bar, profile header, a 2×4 grid of 8 app tiles
- **PERSONNEL / ARCHIVE / MODULES / COMMS / TRANSMIT / RADIO / SYSTEM / TERMINAL** —
  the same apps, re-laid-out for a phone (ARCHIVE → tappable list → full-screen detail)
- **SYSTEM** settings — phosphor Green/Amber (re-tints the whole screen), scanlines
  toggle, brightness & volume, 12/24H clock, live system info + memory, and reboot
- **Monitor-style controls** below the screen — a glowing centre power button
  (toggles STANDBY and replays the boot on power-on) flanked by speaker grilles
- The same **boot sequence** on load, power-on, and the terminal `reboot` command

## Notes

- 6 case-study thumbnails are bundled in `assets/work/`; the other 8 are
  hot-linked from Dribbble's CDN and need a live connection. To go fully offline,
  download those images locally and point `src/data.js` at them.
- The fonts (VT323, Share Tech Mono) and the Preact/htm runtime load from CDNs.

## Credits

Designed and built by Hakim Haiman. Original mockup authored in Claude Design;
implemented to code with Claude Code.
