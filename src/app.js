/* ============================================================================
 * Retro DVD TV + HHX-OS — application
 *
 * A faithful port of the "Retro DVD TV" / "HHX-OS Terminal" Claude Design
 * prototypes. Built on Preact + htm (loaded as globals, no build step) which
 * gives us React-style reconciliation — so the live terminal, the mail form,
 * and focused inputs survive the once-a-second clock re-render.
 *
 * Two prototype quirks are intentionally corrected:
 *   1. The OS runs in a fixed 960x768 "stage" coordinate space (the desktop
 *      canvas) rather than the real browser window, so windows open, clamp and
 *      maximize correctly inside the CRT.
 *   2. Window dragging is scale-corrected via the stage's bounding rect, so the
 *      cursor tracks the title bar 1:1 regardless of the CRT's down-scale.
 * ==========================================================================*/
(function () {
  "use strict";

  var preact = window.preact;
  var htm = window.htm;
  var h = preact.h;
  var Component = preact.Component;
  var createRef = preact.createRef;
  var html = htm.bind(h);

  var D = window.HHX_DATA;

  // Desktop canvas dimensions (the OS thinks the screen is exactly this big).
  var STAGE_W = 960;
  var STAGE_H = 768;

  /* ==========================================================================
   * HHX-OS — the desktop operating system that runs inside the CRT
   * ========================================================================*/
  class HhxOs extends Component {
    constructor(props) {
      super(props);

      this.iconFor = D.iconFor;
      this.titles = D.titles;
      this.sizes = D.sizes;
      this.desktopOrder = D.desktopOrder;
      this.deskLabels = D.deskLabels;
      this.iconLabels = D.iconLabels;
      this.serviceList = D.serviceList;
      this.messages = D.messages;
      this.workCases = D.workCases;
      this.tracks = D.tracks;
      this.allBoot = D.bootLines;

      this.mailFromRef = createRef();
      this.mailSubjRef = createRef();
      this.mailBodyRef = createRef();
      this.termRef = createRef();
      this.stageRef = createRef();
      this.dragData = null;

      this.state = {
        bootPhase: props.showBoot === false ? "done" : "bios",
        bootShown: 0,
        windows: [],
        z: 20,
        activeId: null,
        selected: null,
        startOpen: false,
        shutdown: false,
        now: new Date(),
        vw: STAGE_W,
        vh: STAGE_H,
        msgSel: 0,
        workSel: 0,
        playing: false,
        track: 0,
        prog: 0,
        radioCh: 0,
        eq: new Array(20).fill(8),
        termHist: [
          { text: "HHX-OS TERMLINK [BUILD 2.2.2287]", color: "#5dffa0" },
          { text: "Type 'help' for available commands.", color: "#2c7a48" },
          { text: "", color: "#41ff83" },
        ],
        termInput: "",
        topMenu: null,
        topMenuX: 0,
        // System Settings (undefined => fall back to props/defaults)
        uiPhosphor: undefined,
        uiScan: undefined,
        ui24: undefined,
        uiBright: 100,
        uiVol: 72,
      };

      this.timers = [];
      this.bootTime = Date.now();

      // Bind handlers used as event callbacks / passed down
      [
        "onMove", "deselectAll", "toggleStart", "closeStart", "skipBoot",
        "restart", "sendMail", "onTermChange", "onTermKey", "focusTerm",
        "setPhGreen", "setPhAmber", "toggleScan", "toggle24", "onBright", "onVol",
        "closeTop",
      ].forEach((m) => (this[m] = this[m].bind(this)));
    }

    componentDidMount() {
      this._mm = (e) => this.onMove(e);
      this._mu = () => { this.dragData = null; };
      window.addEventListener("mousemove", this._mm);
      window.addEventListener("mouseup", this._mu);

      this._clock = setInterval(() => {
        this.setState((s) => {
          let prog = s.prog, track = s.track;
          if (s.playing) {
            prog += 1;
            if (prog >= this.tracks[track].len) {
              track = (track + 1) % this.tracks.length;
              prog = 0;
            }
          }
          return { now: new Date(), prog: prog, track: track };
        });
      }, 1000);

      this._eq = setInterval(() => {
        if (this.state.playing) {
          this.setState({ eq: this.state.eq.map(() => 6 + Math.random() * 94) });
        }
      }, 110);

      if (this.props.showBoot !== false) this.startBoot();
    }

    componentWillUnmount() {
      window.removeEventListener("mousemove", this._mm);
      window.removeEventListener("mouseup", this._mu);
      clearInterval(this._clock);
      clearInterval(this._eq);
      this.timers.forEach((t) => clearTimeout(t));
    }

    /* ---- boot sequence -------------------------------------------------- */
    startBoot() {
      this.timers.forEach((t) => clearTimeout(t));
      this.timers = [];
      this.setState({ bootPhase: "bios", bootShown: 0 });
      this.allBoot.forEach((_, i) => {
        this.timers.push(setTimeout(() => this.setState({ bootShown: i + 1 }), 200 * (i + 1)));
      });
      const afterLines = 200 * (this.allBoot.length + 1);
      this.timers.push(setTimeout(() => this.setState({ bootPhase: "splash" }), afterLines + 300));
      this.timers.push(setTimeout(() => this.setState({ bootPhase: "done" }), afterLines + 1900));
    }
    skipBoot() {
      this.timers.forEach((t) => clearTimeout(t));
      this.setState({ bootPhase: "done", bootShown: this.allBoot.length });
    }

    /* ---- window management ---------------------------------------------- */
    openApp(id) {
      this.setState((s) => {
        const ex = s.windows.find((w) => w.app === id);
        if (ex) {
          return {
            windows: s.windows.map((w) => (w.app === id ? { ...w, minimized: false, z: s.z + 1 } : w)),
            z: s.z + 1, activeId: ex.id, startOpen: false, selected: null,
          };
        }
        const sz = this.sizes[id] || [460, 360];
        const w = sz[0], hh = sz[1];
        const n = s.windows.length;
        let x = 120 + n * 28, y = 56 + n * 26;
        if (x + w > s.vw - 20) x = 50;
        if (y + hh > s.vh - 60) y = 40;
        const id2 = id + "_" + Date.now();
        const win = { id: id2, app: id, title: this.titles[id], x, y, w, h: hh, z: s.z + 1, minimized: false, maximized: false, prev: null };
        return { windows: [...s.windows, win], z: s.z + 1, activeId: id2, startOpen: false, selected: null };
      });
      if (id === "terminal") {
        setTimeout(() => { try { this.termRef.current && this.termRef.current.focus(); } catch (e) {} }, 120);
      }
    }
    closeWindow(id) { this.setState((s) => ({ windows: s.windows.filter((w) => w.id !== id) })); }
    focusWindow(id) {
      this.setState((s) => (s.activeId === id ? {} : {
        activeId: id, z: s.z + 1,
        windows: s.windows.map((w) => (w.id === id ? { ...w, z: s.z + 1 } : w)),
      }));
    }
    minimize(id, e) {
      if (e && e.stopPropagation) e.stopPropagation();
      this.setState((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)), activeId: null }));
    }
    toggleMax(id) {
      this.setState((s) => ({
        windows: s.windows.map((w) => {
          if (w.id !== id) return w;
          if (w.maximized) return { ...w, maximized: false, ...(w.prev || {}) };
          return { ...w, maximized: true, prev: { x: w.x, y: w.y, w: w.w, h: w.h }, x: 0, y: 38, w: s.vw, h: s.vh - 80 };
        }),
      }));
    }

    /* ---- dragging (scale-corrected) ------------------------------------- */
    clientToStage(cx, cy) {
      const el = this.stageRef.current;
      if (!el) return { x: cx, y: cy };
      const r = el.getBoundingClientRect();
      const sx = r.width / STAGE_W || 1;
      const sy = r.height / STAGE_H || 1;
      return { x: (cx - r.left) / sx, y: (cy - r.top) / sy };
    }
    startDrag(e, id) {
      const w = this.state.windows.find((x) => x.id === id);
      if (!w || w.maximized) return;
      this.focusWindow(id);
      const p = this.clientToStage(e.clientX, e.clientY);
      this.dragData = { id, offX: p.x - w.x, offY: p.y - w.y };
      e.preventDefault();
    }
    onMove(e) {
      if (!this.dragData) return;
      const { id, offX, offY } = this.dragData;
      const w = this.state.windows.find((x) => x.id === id);
      if (!w) return;
      const p = this.clientToStage(e.clientX, e.clientY);
      let x = p.x - offX, y = p.y - offY;
      x = Math.min(Math.max(x, -(w.w - 90)), this.state.vw - 70);
      y = Math.min(Math.max(y, 38), this.state.vh - 58);
      this.setState((s) => ({ windows: s.windows.map((ww) => (ww.id === id ? { ...ww, x, y } : ww)) }));
    }

    /* ---- mail ----------------------------------------------------------- */
    sendMail() {
      const to = D.links.email;
      const subj = encodeURIComponent((this.mailSubjRef.current && this.mailSubjRef.current.value) || "New project inquiry");
      const from = (this.mailFromRef.current && this.mailFromRef.current.value) || "";
      const body = encodeURIComponent(((this.mailBodyRef.current && this.mailBodyRef.current.value) || "") + (from ? "\n\n— " + from : ""));
      window.location.href = "mailto:" + to + "?subject=" + subj + "&body=" + body;
    }

    /* ---- terminal ------------------------------------------------------- */
    runCmd(raw) {
      const c = (raw || "").trim();
      const lc = c.toLowerCase();
      const push = (lines) => this.setState((s) => ({
        termHist: [...s.termHist, { text: "HHX:\\> " + c, color: "#41ff83" },
          ...lines.map((l) => (typeof l === "string" ? { text: l, color: "#7dffae" } : l))],
      }));
      if (lc === "clear") { this.setState({ termHist: [] }); return; }
      let out = [];
      if (lc === "") { this.setState((s) => ({ termHist: [...s.termHist, { text: "HHX:\\>", color: "#41ff83" }] })); return; }
      else if (lc === "help") out = ["AVAILABLE COMMANDS:", "  about     services    work", "  contact   social      radio", "  neofetch  ls          date", "  clear     help"];
      else if (lc === "about" || lc === "whoami") { out = ["HAKIM HAIMAN — SENIOR UI/UX DESIGNER", "5+ years crafting intuitive, visually", "engaging designs for web & mobile.", { text: "  > OPENING PERSONNEL FILE...", color: "#ffb000" }]; this.openApp("about"); }
      else if (lc === "services") { out = ["[1] WEBSITE DESIGN", "[2] MOBILE APP DESIGN", "[3] SAAS DESIGN", { text: "  > OPENING SERVICE MODULES...", color: "#ffb000" }]; this.openApp("services"); }
      else if (lc === "work" || lc === "portfolio" || lc === "ls") { out = ["ABOUT.TXT   WORK/      SERVICES/", "CONTACT.EML RADIO.EXE  README.MD", { text: "  > OPENING PROJECT ARCHIVE...", color: "#ffb000" }]; this.openApp("work"); }
      else if (lc === "contact" || lc === "mail" || lc === "email") { out = [D.links.email, { text: "  > OPENING TRANSMISSION...", color: "#ffb000" }]; this.openApp("mail"); }
      else if (lc === "radio" || lc === "music" || lc === "jukebox") { out = [{ text: "  > TUNING AUDIO MODULE...", color: "#ffb000" }]; this.openApp("music"); }
      else if (lc === "social") out = ["INSTAGRAM : @hakimhn_", "DRIBBBLE  : dribbble.com/mochamadhakim", "LINKEDIN  : in/mochamadhakim"];
      else if (lc === "date") out = [new Date().toString()];
      else if (lc === "neofetch") out = [
        { text: "     .====.     OS:      HHX-OS 2.2.2287", color: "#5dffa0" },
        { text: "    / @@@@ \\    HOST:    Senior UI/UX Designer", color: "#5dffa0" },
        { text: "   | @ HH @ |   UPTIME:  5+ years", color: "#41ff83" },
        { text: "    \\ @@@@ /    SHELL:   termlink-sh", color: "#7dffae" },
        { text: "     '===='     THEME:   Phosphor Green CRT", color: "#7dffae" },
        { text: "               CPU:     Creativity Core X9", color: "#7dffae" },
        { text: "               CONTACT: " + D.links.email, color: "#ffb000" },
      ];
      else if (lc.indexOf("echo ") === 0) out = [c.slice(5)];
      else if (lc.indexOf("sudo") === 0) out = [{ text: "ACCESS DENIED: Insufficient karma to ship on Fridays.", color: "#ffb000" }];
      else out = [{ text: "'" + c + "' IS NOT RECOGNIZED. Type 'help'.", color: "#ff7777" }];
      push(out);
    }
    onTermChange(e) { this.setState({ termInput: e.target.value }); }
    onTermKey(e) {
      if (e.key === "Enter") { const v = this.state.termInput; this.setState({ termInput: "" }); this.runCmd(v); }
    }
    focusTerm() { try { this.termRef.current && this.termRef.current.focus(); } catch (e) {} }

    /* ---- system settings handlers --------------------------------------- */
    setPhGreen() { this.setState({ uiPhosphor: "Green" }); }
    setPhAmber() { this.setState({ uiPhosphor: "Amber" }); }
    toggleScan() { this.setState((st) => ({ uiScan: !((st.uiScan !== undefined) ? st.uiScan : (this.props.scanlines !== false)) })); }
    toggle24() { this.setState((st) => ({ ui24: !((st.ui24 !== undefined) ? st.ui24 : !!this.props.clock24h) })); }
    onBright(e) { this.setState({ uiBright: +e.target.value }); }
    onVol(e) { this.setState({ uiVol: +e.target.value }); }

    /* ---- misc handlers -------------------------------------------------- */
    deselectAll() { this.setState({ selected: null }); }
    toggleStart(e) { if (e && e.stopPropagation) e.stopPropagation(); this.setState((st) => ({ startOpen: !st.startOpen, topMenu: null })); }
    closeStart() { this.setState({ startOpen: false }); }
    closeTop() { this.setState({ topMenu: null }); }
    restart() { this.setState({ shutdown: false, windows: [], activeId: null }); this.startBoot(); }

    /* ---- formatting ----------------------------------------------------- */
    fmtClock() {
      const d = this.state.now;
      let hh = d.getHours();
      const m = String(d.getMinutes()).padStart(2, "0");
      const use24 = this.state.ui24 !== undefined ? this.state.ui24 : this.props.clock24h;
      if (use24) return String(hh).padStart(2, "0") + ":" + m;
      const ap = hh >= 12 ? "PM" : "AM"; hh = hh % 12; if (hh === 0) hh = 12;
      return hh + ":" + m + " " + ap;
    }
    fmtSec(s) { const m = Math.floor(s / 60); const ss = String(Math.floor(s % 60)).padStart(2, "0"); return m + ":" + ss; }

    /* ====================================================================
     * RENDER
     * ==================================================================*/
    render(props, s) {
      const self = this;
      const VT = "'VT323',monospace";

      // ---- menu-bar dropdowns ----
      const topMenu = s.topMenu || null;
      const mkTopOpen = (name) => (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        const x = e && e.currentTarget ? e.currentTarget.offsetLeft : 0;
        this.setState((st) => ({ topMenu: st.topMenu === name ? null : name, topMenuX: x, startOpen: false }));
      };
      let topMenuItems = [];
      if (topMenu === "work") topMenuItems = this.workCases.map((c, i) => ({ label: c.title.toUpperCase(), sub: c.category, onClick: () => { this.setState({ workSel: i, topMenu: null }); this.openApp("work"); } }));
      else if (topMenu === "services") topMenuItems = this.serviceList.map((sv) => ({ label: sv.name, sub: "INITIALIZE MODULE", onClick: () => { this.setState({ topMenu: null }); this.openApp("services"); } }));
      else if (topMenu === "reviews") topMenuItems = this.messages.map((m, i) => ({ label: m.name, sub: m.role, onClick: () => { this.setState({ msgSel: i, topMenu: null }); this.openApp("testimonials"); } }));
      else if (topMenu === "contact") topMenuItems = [
        { label: "SEND EMAIL", sub: D.links.email, onClick: () => { this.setState({ topMenu: null }); window.location.href = "mailto:" + D.links.email; } },
        { label: "DRIBBBLE", sub: "dribbble.com/mochamadhakim", onClick: () => { this.setState({ topMenu: null }); window.open(D.links.dribbble, "_blank"); } },
        { label: "INSTAGRAM", sub: "@hakimhn_", onClick: () => { this.setState({ topMenu: null }); window.open(D.links.instagram, "_blank"); } },
        { label: "LINKEDIN", sub: "linkedin.com/in/mochamadhakim", onClick: () => { this.setState({ topMenu: null }); window.open(D.links.linkedin, "_blank"); } },
      ];
      const topMenuX = Math.min(s.topMenuX || 0, 720);
      const topMenuStyle = "position:absolute;top:32px;left:" + topMenuX + "px;width:232px;max-height:330px;overflow:auto;background:rgba(8,24,15,0.98);border:1px solid #2bd968;box-shadow:0 9px 24px rgba(0,0,0,0.55);z-index:9360;";

      // ---- system settings ----
      const uiPhosphor = s.uiPhosphor || (this.props.phosphor || "Green");
      const uiScan = s.uiScan !== undefined ? s.uiScan : this.props.scanlines !== false;
      const ui24 = s.ui24 !== undefined ? s.ui24 : !!this.props.clock24h;
      const uiBright = s.uiBright || 100;
      const uiVol = s.uiVol !== undefined ? s.uiVol : 72;
      const seg = (active) => "font-family:" + VT + ";font-size:16px;letter-spacing:.5px;padding:4px 16px;cursor:pointer;border:1px solid #2bd968;transition:all .13s ease;" + (active ? "background:#1aff80;color:#04100a;" : "background:#0c2415;color:#7dffae;");
      const _up = Math.max(0, Math.floor((Date.now() - this.bootTime) / 1000));
      const uptime = String(Math.floor(_up / 3600)).padStart(2, "0") + ":" + String(Math.floor((_up % 3600) / 60)).padStart(2, "0") + ":" + String(_up % 60).padStart(2, "0");
      const memPct = 58;
      const sysInfo = [
        { k: "OS", v: "HHX-OS 2.2.2287" },
        { k: "KERNEL", v: "TERMLINK-SH" },
        { k: "HOST", v: "HHX TERMINAL" },
        { k: "DISPLAY", v: "960×768 CRT" },
        { k: "PHOSPHOR", v: uiPhosphor.toUpperCase() },
        { k: "UPTIME", v: uptime },
      ];

      // ---- desktop icon handlers ----
      const selH = {}, openH = {}, selBg = {};
      this.desktopOrder.forEach((id) => {
        selH[id] = (e) => { if (e && e.stopPropagation) e.stopPropagation(); this.setState({ selected: id }); };
        openH[id] = (e) => { if (e && e.stopPropagation) e.stopPropagation(); this.openApp(id); };
        selBg[id] = s.selected === id ? "#143a22" : "transparent";
      });

      // ---- windows ----
      const windows = s.windows.map((w) => {
        const active = s.activeId === w.id;
        const win = {
          ...w, active,
          frameStyle: "position:absolute;left:" + w.x + "px;top:" + w.y + "px;width:" + w.w + "px;height:" + w.h + "px;z-index:" + w.z + ";display:" + (w.minimized ? "none" : "flex") + ";flex-direction:column;background:#08160d;border:1px solid #2bd968;" + (active ? "" : "opacity:.85;"),
          titleBg: active ? "#103019" : "#0a1c11",
          titleColor: active ? "#5dffa0" : "#2c7a48",
          isAbout: w.app === "about", isWork: w.app === "work", isServices: w.app === "services",
          isTestimonials: w.app === "testimonials", isMail: w.app === "mail", isMusic: w.app === "music",
          isTerminal: w.app === "terminal", isRecycle: w.app === "recycle", isComputer: w.app === "mycomputer",
          onFocus: () => this.focusWindow(w.id),
          onClose: (e) => { if (e && e.stopPropagation) e.stopPropagation(); this.closeWindow(w.id); },
          onMin: (e) => this.minimize(w.id, e),
          onMax: (e) => { if (e && e.stopPropagation) e.stopPropagation(); this.toggleMax(w.id); },
          onTitleDown: (e) => this.startDrag(e, w.id),
        };
        if (w.app === "services") win.serviceList = this.serviceList.map((sv) => ({ ...sv, href: "mailto:" + D.links.email + "?subject=" + encodeURIComponent("Request: " + sv.name) }));
        if (w.app === "work") {
          win.workCases = this.workCases.map((c, i) => ({
            ...c, onSelect: () => this.setState({ workSel: i }),
            rowStyle: "display:flex;gap:9px;align-items:center;padding:9px 10px;cursor:pointer;transition:all .13s ease;border-bottom:1px solid #102b1a;" + (i === s.workSel ? "background:#0e2a18;box-shadow:inset 3px 0 0 #1aff80;" : ""),
          }));
          win.activeWork = this.workCases[s.workSel];
          win.workCount = this.workCases.length;
        }
        if (w.app === "testimonials") {
          win.messages = this.messages.map((m, i) => ({
            ...m, onSelect: () => this.setState({ msgSel: i }),
            rowStyle: "display:flex;gap:9px;align-items:center;padding:8px 10px;cursor:pointer;transition:all .13s ease;border-bottom:1px solid #102b1a;" + (i === s.msgSel ? "background:#0e2a18;box-shadow:inset 3px 0 0 #1aff80;" : ""),
          }));
          win.activeMsg = this.messages[s.msgSel];
        }
        if (w.app === "music") {
          const t = this.tracks[s.track];
          win.trackTitle = t.title; win.trackArtist = t.artist;
          win.curTime = this.fmtSec(s.prog); win.totTime = this.fmtSec(t.len);
          win.progressPct = Math.min(100, (s.prog / t.len) * 100);
          win.playLabel = s.playing ? "||" : ">";
          win.eqBars = s.eq.map((hh) => ({ h: s.playing ? Math.max(4, hh * (uiVol / 100)) : 8 }));
          win.onPlay = () => this.setState((st) => ({ playing: !st.playing }));
          win.onNext = () => this.setState((st) => ({ track: (st.track + 1) % this.tracks.length, prog: 0 }));
          win.onPrev = () => this.setState((st) => ({ track: (st.track - 1 + this.tracks.length) % this.tracks.length, prog: 0 }));
          win.playlist = this.tracks.map((tk, i) => ({
            num: i + 1, title: tk.title, len: this.fmtSec(tk.len),
            onPick: () => this.setState({ track: i, prog: 0, playing: true }),
            rowStyle: "display:flex;gap:9px;align-items:center;padding:4px 7px;cursor:pointer;transition:all .13s ease;font-size:18px;font-family:" + VT + ";color:" + (i === s.track ? "#1aff80" : "#5dac78") + ";" + (i === s.track ? "background:#0e2a18;" : ""),
          }));
        }
        if (w.app === "terminal") { win.termLines = s.termHist; win.termInput = s.termInput; }
        return win;
      });

      // ---- dock ----
      const dockBase = "width:44px;height:44px;";
      const dockItems = this.desktopOrder.filter((id) => id !== "about").map((id) => ({
        id, icon: this.iconFor[id], label: this.titles[id], imgStyle: dockBase,
        onOpen: () => this.openApp(id),
        runVis: s.windows.some((w) => w.app === id) ? "visible" : "hidden",
      }));

      // ---- start menu ----
      const mkRow = (id, label, icon, amber) => ({
        id, label, icon: icon || this.iconFor.terminal, iconVis: icon ? "visible" : "hidden",
        color: amber ? "#ffb000" : "#7dffae",
        onClick: () => {
          if (id === "__shut") { this.setState({ startOpen: false, shutdown: true }); }
          else if (id === "__restart") { this.setState({ startOpen: false, windows: [], activeId: null }); this.startBoot(); }
          else { this.openApp(id); }
        },
        rowStyle: "display:flex;align-items:center;gap:11px;padding:6px 9px;cursor:pointer;transition:all .13s ease;",
      });
      const sep = { id: "sep", label: "", icon: null, iconVis: "hidden", color: "#7dffae", onClick: () => {}, rowStyle: "height:1px;margin:4px 8px;padding:0;background:#1c5a34;pointer-events:none;" };
      const startItems = [
        mkRow("about", "About This System", this.iconFor.about),
        mkRow("terminal", "Open Terminal", this.iconFor.terminal),
        sep,
        mkRow("__restart", "Restart…", this.iconFor.mycomputer),
        mkRow("__shut", "Shut Down…", this.iconFor.recycle, true),
      ];

      const _br = uiBright / 100;
      const rootFilter = uiPhosphor === "Amber"
        ? "hue-rotate(-88deg) saturate(1.35) brightness(" + (1.06 * _br).toFixed(3) + ")"
        : "brightness(" + _br.toFixed(3) + ")";

      const clock = this.fmtClock();
      const showBios = s.bootPhase === "bios";
      const showSplash = s.bootPhase === "splash";
      const bootLines = this.allBoot.slice(0, s.bootShown);

      const rootStyle = "position:relative;width:" + STAGE_W + "px;height:" + STAGE_H + "px;background:radial-gradient(ellipse at 50% 40%,#0c2415 0%,#061a0e 55%,#030a06 100%);overflow:hidden;user-select:none;filter:" + rootFilter + ";";

      return html`
      <div class="os-root" ref=${this.stageRef} style=${rootStyle} onClick=${this.deselectAll}>

        ${/* ---------- MENU BAR ---------- */ null}
        <div style=${"position:absolute;top:0;left:0;right:0;height:34px;display:flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden;padding:0 30px;background:rgba(10,28,17,0.92);border-bottom:1px solid #2bd968;color:#5dffa0;font-size:20px;font-family:" + VT + ";letter-spacing:.5px;z-index:9300;"}>
          <img class="h-avatar" onMouseDown=${this.toggleStart} src="assets/vault/vavatar.png" alt="" style="width:24px;height:24px;margin-right:8px;cursor:pointer;object-fit:cover;object-position:top;border-radius:50%;border:1px solid rgba(43,217,104,0.5);background:#020a05;"/>
          <span class="h-mb" onClick=${mkTopOpen("work")} style="color:#7dffae;padding:2px 8px;cursor:pointer;">Work</span>
          <span class="h-mb" onClick=${mkTopOpen("services")} style="color:#7dffae;padding:2px 8px;cursor:pointer;">Services</span>
          <span class="h-mb" onClick=${mkTopOpen("reviews")} style="color:#7dffae;padding:2px 8px;cursor:pointer;">Reviews</span>
          <span class="h-mb" onClick=${mkTopOpen("contact")} style="color:#7dffae;padding:2px 8px;cursor:pointer;">Contact</span>
          <span style="flex:1;"></span>
          <span style="display:flex;align-items:center;gap:6px;color:#1aff80;letter-spacing:1px;"><span style="width:8px;height:8px;border-radius:50%;background:#1aff80;animation:blink 1.6s steps(1) infinite;"></span>AVAILABLE</span>
          <span style="color:#2c7a48;">|</span>
          <span style="display:flex;align-items:flex-end;gap:2px;height:13px;">
            <span style="width:3px;height:100%;background:#1aff80;animation:sig .9s ease-in-out infinite;"></span>
            <span style="width:3px;height:100%;background:#1aff80;animation:sig .9s ease-in-out .15s infinite;"></span>
            <span style="width:3px;height:100%;background:#1aff80;animation:sig .9s ease-in-out .3s infinite;"></span>
            <span style="width:3px;height:100%;background:#1aff80;animation:sig .9s ease-in-out .45s infinite;"></span>
          </span>
          <span style="color:#1aff80;letter-spacing:1px;padding:0 4px;">ONLINE</span>
          <span style="color:#2c7a48;">|</span>
          <span style="font-variant-numeric:tabular-nums;padding-left:2px;">${clock}</span>
        </div>

        ${/* ---------- TOP MENU DROPDOWN ---------- */ null}
        ${topMenu ? html`
          <div onMouseDown=${this.closeTop} style="position:absolute;inset:0;z-index:9150;"></div>
          <div style=${topMenuStyle}>
            ${topMenuItems.map((ti, i) => html`
              <div key=${i} class="h-soft" onClick=${ti.onClick} style="display:flex;flex-direction:column;gap:1px;padding:8px 12px;cursor:pointer;border-bottom:1px solid #102b1a;">
                <span style=${"font-family:" + VT + ";font-size:18px;letter-spacing:.5px;color:#caffdd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"}>${ti.label}</span>
                <span style="font-size:12px;color:#3fcf78;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ti.sub}</span>
              </div>`)}
          </div>` : null}

        ${/* ---------- DESKTOP ICONS ---------- */ null}
        <div style="position:absolute;top:46px;right:14px;display:grid;grid-template-columns:repeat(2,116px);gap:6px 4px;z-index:10;">
          ${this.desktopOrder.map((id) => {
            const isAvatar = id === "about";
            const imgStyle = isAvatar
              ? "width:60px;height:60px;object-fit:cover;object-position:top;border-radius:50%;border:1px solid #2bd968;background:#020a05;"
              : "width:60px;height:60px;";
            return html`
            <div key=${id} class="h-icon" onClick=${selH[id]} onDblClick=${openH[id]} style="display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 3px 5px;width:116px;cursor:pointer;border:1px solid transparent;">
              <img src=${this.iconFor[id]} alt="" style=${imgStyle} draggable="false"/>
              <span style=${"font-family:" + VT + ";font-size:18px;letter-spacing:.5px;text-align:center;color:#7dffae;padding:0 4px;background:" + selBg[id] + ";"}>${this.iconLabels[id]}</span>
            </div>`;
          })}
        </div>

        ${/* ---------- WINDOWS ---------- */ null}
        ${windows.map((win) => html`
          <div key=${win.id} style=${win.frameStyle} onMouseDown=${win.onFocus}>
            <div onMouseDown=${win.onTitleDown} onDblClick=${win.onMax} style=${"display:flex;align-items:center;gap:8px;height:32px;padding:0 7px 0 9px;background:" + win.titleBg + ";border-bottom:1px solid #2bd968;cursor:default;flex:0 0 auto;"}>
              <div style="display:flex;align-items:center;gap:8px;flex:0 0 auto;padding-right:4px;">
                <button class="h-fill" onClick=${win.onClose} title="close" style=${"display:grid;place-items:center;width:16px;height:16px;border-radius:50%;border:1px solid #2bd968;cursor:pointer;background:transparent;color:#2bd968;font-family:" + VT + ";font-size:15px;line-height:1;padding:0;"}>×</button>
                <button class="h-fill" onClick=${win.onMin} title="minimize" style=${"display:grid;place-items:center;width:16px;height:16px;border-radius:50%;border:1px solid #2bd968;cursor:pointer;background:transparent;color:#2bd968;font-family:" + VT + ";font-size:15px;line-height:1;padding:0;"}>–</button>
                <button class="h-fill" onClick=${win.onMax} title="zoom" style=${"display:grid;place-items:center;width:16px;height:16px;border-radius:50%;border:1px solid #2bd968;cursor:pointer;background:transparent;color:#2bd968;font-family:" + VT + ";font-size:13px;line-height:1;padding:0;"}>□</button>
              </div>
              <span style=${"flex:1;text-align:center;font-family:" + VT + ";font-size:22px;letter-spacing:1px;color:" + win.titleColor + ";white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"}>${win.title}</span>
              <div style="width:76px;flex:0 0 auto;"></div>
            </div>
            <div style="flex:1;min-height:0;display:flex;flex-direction:column;background:#08160d;overflow:hidden;color:#8effb5;font-size:18px;">
              ${this.renderApp(win, { sysInfo, uiBright, uiVol, ui24, uiPhosphor, uiScan, memPct, seg })}
            </div>
          </div>`)}

        ${/* ---------- START MENU ---------- */ null}
        ${s.startOpen ? html`<div onMouseDown=${this.closeStart} style="position:absolute;inset:0;z-index:9000;"></div>` : null}
        ${s.startOpen ? html`
          <div style="position:absolute;left:6px;top:38px;width:300px;z-index:9100;display:flex;flex-direction:column;background:rgba(10,28,17,0.96);border:1px solid #2bd968;">
            <div style="display:flex;align-items:center;gap:9px;padding:9px 11px;border-bottom:1px solid #1c5a34;">
              <img src="assets/vault/vemblem.png" alt="" style="width:26px;height:26px;"/>
              <span style=${"font-family:" + VT + ";font-size:18px;color:#5dffa0;letter-spacing:1px;"}>HHX-OS <span style="color:#ffb000;">SYSTEM</span></span>
            </div>
            <div style="padding:4px;">
              ${startItems.map((si, i) => html`
                <div key=${i} class=${si.id === "sep" ? "" : "h-soft"} onClick=${si.onClick} style=${si.rowStyle}>
                  <span style=${"width:22px;height:22px;flex:0 0 auto;background:url(" + si.icon + ") center / contain no-repeat;visibility:" + si.iconVis + ";"}></span>
                  <span style=${"flex:1;font-family:" + VT + ";font-size:19px;letter-spacing:.5px;color:" + si.color + ";"}>${si.label}</span>
                </div>`)}
            </div>
          </div>` : null}

        ${/* ---------- DOCK ---------- */ null}
        <div style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);display:flex;align-items:flex-end;gap:12px;padding:8px 12px;background:rgba(10,28,17,0.72);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid #2bd96819;border-radius:18px;z-index:9200;">
          ${dockItems.map((d) => html`
            <button key=${d.id} class="h-dock" onClick=${d.onOpen} title=${d.label} style="position:relative;width:54px;height:54px;display:flex;align-items:center;justify-content:center;background:transparent;border:none;cursor:pointer;">
              <img src=${d.icon} alt="" style=${d.imgStyle}/>
              <span style=${"position:absolute;bottom:-5px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:#1aff80;visibility:" + d.runVis + ";"}></span>
            </button>`)}
        </div>

        ${/* ---------- SCANLINE / CRT OVERLAY ---------- */ null}
        ${uiScan ? html`
          <div style="position:absolute;inset:0;z-index:9500;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,0) 0px,rgba(0,0,0,0) 2px,rgba(0,0,0,0.11) 2.5px,rgba(0,0,0,0.11) 3px);"></div>
          <div style="position:absolute;inset:0;z-index:9501;pointer-events:none;background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 68%,rgba(0,0,0,0.28) 100%);"></div>
          <div style="position:absolute;inset:0;z-index:9502;pointer-events:none;background:rgba(140,255,180,0.06);animation:flick 0.18s infinite;mix-blend-mode:screen;"></div>` : null}

        ${/* ---------- BOOT ---------- */ null}
        ${showBios ? html`
          <div onClick=${this.skipBoot} style=${"position:absolute;inset:0;z-index:99990;background:#020a05;color:#41ff83;font-family:" + VT + ";font-size:23px;line-height:1.4;padding:38px 34px;cursor:pointer;"}>
            ${bootLines.map((bl, i) => html`<div key=${i} style=${"color:" + bl.color + ";white-space:pre-wrap;"}>${bl.text}</div>`)}
            <span style="display:inline-block;width:11px;height:18px;background:#41ff83;animation:blink 1s steps(1) infinite;vertical-align:-3px;"></span>
            <div style="position:absolute;bottom:26px;left:34px;color:#2c7a48;font-size:18px;">[ CLICK TO SKIP ]</div>
          </div>` : null}

        ${/* ---------- SPLASH ---------- */ null}
        ${showSplash ? html`
          <div onClick=${this.skipBoot} style="position:absolute;inset:0;z-index:99990;background:#020a05;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;cursor:pointer;">
            <img src="assets/vault/vavatar.png" alt="" style="width:130px;height:130px;object-fit:cover;object-position:top;border-radius:50%;border:2px solid #2bd968;background:#020a05;"/>
            <div style=${"font-family:" + VT + ";font-size:38px;color:#5dffa0;letter-spacing:3px;"}>PLEASE STAND BY</div>
            <div style="width:260px;height:14px;border:1px solid #2bd968;padding:2px;"><div style="height:100%;background:#1aff80;animation:splashbar 1.5s ease-out forwards;"></div></div>
            <div style=${"font-family:" + VT + ";font-size:18px;color:#2c7a48;letter-spacing:1px;"}>INITIALIZING HHX-OS SHELL...</div>
          </div>` : null}

        ${/* ---------- SHUTDOWN ---------- */ null}
        ${s.shutdown ? html`
          <div style="position:absolute;inset:0;z-index:99995;background:#020a05;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;">
            <div style=${"font-family:" + VT + ";font-size:26px;color:#ffb000;text-align:center;line-height:1.5;"}>${"> CONNECTION TERMINATED."}<br/>TERMINAL POWERED DOWN.</div>
            <button class="h-fill" onClick=${this.restart} style=${"font-family:" + VT + ";font-size:19px;letter-spacing:1px;color:#7dffae;padding:9px 26px;cursor:pointer;border:1px solid #2bd968;background:#0c2415;"}>[ REBOOT HHX-OS ]</button>
          </div>` : null}

      </div>`;
    }

    /* ====================================================================
     * Per-app window body
     * ==================================================================*/
    renderApp(win, ctx) {
      const VT = "'VT323',monospace";
      const L = D.links;

      if (win.isAbout) return html`
        <div style="flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:14px;">
          <div style="display:flex;gap:14px;align-items:center;border:1px solid #1c5a34;padding:13px;background:#04100a;">
            <img src="assets/vault/vavatar.png" alt="" style="width:76px;height:76px;flex:0 0 auto;background:#020a05;object-fit:cover;object-position:top;"/>
            <div>
              <div style=${"font-family:" + VT + ";font-size:36px;line-height:.95;color:#5dffa0;"}>HAKIM HAIMAN</div>
              <div style="font-size:18px;color:#ffb000;margin-top:5px;">"Crafting Digital Experiences That Users Love"</div>
            </div>
          </div>
          <div style="border:1px solid #1c5a34;background:#04100a;padding:12px;font-size:15.5px;line-height:1.6;color:#9fffc0;display:flex;flex-direction:column;gap:10px;">
            <div>${"> I'm a UI/UX Designer with 6+ years of experience helping SaaS companies, startups, and product teams build clear, scalable, and user-centered digital products."}</div>
            <div>${"> I specialize in UI/UX design for SaaS platforms, web applications, and mobile apps, including products powered by AI and emerging technologies. My focus is not just on visuals — but on clarity, usability, and real product impact."}</div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <a class="h-fill" href=${L.dribbble} target="_blank" style=${"text-decoration:none;font-family:" + VT + ";font-size:19px;letter-spacing:1px;color:#7dffae;padding:7px 18px;border:1px solid #2bd968;background:#0c2415;"}>[ VIEW PORTFOLIO ]</a>
            <a class="h-fill" href=${"mailto:" + L.email} style=${"text-decoration:none;font-family:" + VT + ";font-size:19px;letter-spacing:1px;color:#7dffae;padding:7px 18px;border:1px solid #2bd968;background:#0c2415;"}>[ GET IN TOUCH ]</a>
          </div>
          <div style=${"display:flex;gap:16px;font-family:" + VT + ";font-size:18px;"}>
            <a href=${L.instagram} target="_blank" style="color:#3fcf78;text-decoration:none;">${"> INSTAGRAM"}</a>
            <a href=${L.dribbble} target="_blank" style="color:#3fcf78;text-decoration:none;">${"> DRIBBBLE"}</a>
            <a href=${L.linkedin} target="_blank" style="color:#3fcf78;text-decoration:none;">${"> LINKEDIN"}</a>
          </div>
        </div>`;

      if (win.isComputer) {
        const { sysInfo, uiBright, uiVol, memPct, seg } = ctx;
        return html`
        <div style="flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:12px;background:#04100a;">
          <div style="border:1px solid #1c5a34;background:#061a0e;">
            <div style=${"padding:6px 11px;border-bottom:1px solid #1c5a34;font-family:" + VT + ";font-size:17px;color:#3fcf78;letter-spacing:1.5px;"}>▸ DISPLAY</div>
            <div style="padding:12px;display:flex;flex-direction:column;gap:13px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <span style=${"flex:0 0 118px;font-family:" + VT + ";font-size:18px;color:#7dcc8f;letter-spacing:.5px;"}>PHOSPHOR</span>
                <div style="display:flex;gap:6px;">
                  <button onClick=${this.setPhGreen} style=${seg(ctx.uiPhosphor === "Green")}>GREEN</button>
                  <button onClick=${this.setPhAmber} style=${seg(ctx.uiPhosphor === "Amber")}>AMBER</button>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:10px;">
                <span style=${"flex:0 0 118px;font-family:" + VT + ";font-size:18px;color:#7dcc8f;letter-spacing:.5px;"}>SCANLINES</span>
                <button onClick=${this.toggleScan} style=${seg(ctx.uiScan)}>${ctx.uiScan ? "ON" : "OFF"}</button>
              </div>
              <div style="display:flex;align-items:center;gap:10px;">
                <span style=${"flex:0 0 118px;font-family:" + VT + ";font-size:18px;color:#7dcc8f;letter-spacing:.5px;"}>BRIGHTNESS</span>
                <input type="range" min="60" max="130" value=${uiBright} onInput=${this.onBright} style="flex:1;height:4px;accent-color:#1aff80;cursor:pointer;"/>
                <span style=${"font-family:" + VT + ";font-size:16px;color:#5dffa0;width:46px;text-align:right;"}>${uiBright + "%"}</span>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:12px;">
            <div style="flex:1;border:1px solid #1c5a34;background:#061a0e;">
              <div style=${"padding:6px 11px;border-bottom:1px solid #1c5a34;font-family:" + VT + ";font-size:17px;color:#3fcf78;letter-spacing:1.5px;"}>▸ AUDIO</div>
              <div style="padding:12px;display:flex;align-items:center;gap:10px;">
                <span style=${"font-family:" + VT + ";font-size:18px;color:#7dcc8f;"}>VOL</span>
                <input type="range" min="0" max="100" value=${uiVol} onInput=${this.onVol} style="flex:1;height:4px;accent-color:#1aff80;cursor:pointer;"/>
                <span style=${"font-family:" + VT + ";font-size:16px;color:#5dffa0;width:46px;text-align:right;"}>${uiVol + "%"}</span>
              </div>
            </div>
            <div style="flex:0 0 196px;border:1px solid #1c5a34;background:#061a0e;">
              <div style=${"padding:6px 11px;border-bottom:1px solid #1c5a34;font-family:" + VT + ";font-size:17px;color:#3fcf78;letter-spacing:1.5px;"}>▸ TIME</div>
              <div style="padding:12px;display:flex;align-items:center;gap:8px;">
                <span style=${"font-family:" + VT + ";font-size:18px;color:#7dcc8f;"}>CLOCK</span>
                <button onClick=${this.toggle24} style=${seg(!ctx.ui24)}>12H</button>
                <button onClick=${this.toggle24} style=${seg(ctx.ui24)}>24H</button>
              </div>
            </div>
          </div>
          <div style="border:1px solid #1c5a34;background:#061a0e;">
            <div style=${"padding:6px 11px;border-bottom:1px solid #1c5a34;font-family:" + VT + ";font-size:17px;color:#3fcf78;letter-spacing:1.5px;"}>▸ SYSTEM INFORMATION</div>
            <div style="padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:7px 18px;">
              ${sysInfo.map((si, i) => html`
                <div key=${i} style="display:flex;justify-content:space-between;gap:8px;border-bottom:1px dotted #14361f;padding-bottom:4px;">
                  <span style=${"font-family:" + VT + ";font-size:16px;color:#3fcf78;letter-spacing:.5px;"}>${si.k}</span>
                  <span style=${"font-family:" + VT + ";font-size:16px;color:#9fffc0;text-align:right;white-space:nowrap;"}>${si.v}</span>
                </div>`)}
            </div>
            <div style="padding:0 12px 13px;display:flex;flex-direction:column;gap:5px;">
              <div style=${"display:flex;justify-content:space-between;font-family:" + VT + ";font-size:15px;color:#3fcf78;letter-spacing:.5px;"}><span>MEMORY</span><span>${memPct + "% USED"}</span></div>
              <div style="height:11px;border:1px solid #1c5a34;background:#020a05;"><div style=${"height:100%;width:" + memPct + "%;background:#1aff80;"}></div></div>
            </div>
          </div>
        </div>`;
      }

      if (win.isWork) {
        const aw = win.activeWork;
        return html`
        <div style=${"display:flex;align-items:center;gap:8px;padding:7px 9px;border-bottom:1px solid #1c5a34;font-family:" + VT + ";font-size:18px;"}>
          <span style="color:#3fcf78;">PATH:</span>
          <div style="flex:1;color:#7dffae;letter-spacing:.5px;">//HHX/PORTFOLIO/CASE-FILES</div>
          <a class="h-fill" href=${L.dribbble} target="_blank" style="text-decoration:none;color:#7dffae;padding:3px 12px;border:1px solid #2bd968;background:#0c2415;">${"[ DRIBBBLE >> ]"}</a>
        </div>
        <div style="flex:1;min-height:0;display:flex;">
          <div style="width:210px;flex:0 0 auto;border-right:1px solid #1c5a34;overflow:auto;background:#04100a;">
            <div style=${"padding:6px 10px;font-family:" + VT + ";font-size:16px;color:#3fcf78;border-bottom:1px solid #1c5a34;letter-spacing:.5px;"}>${"> " + win.workCount + " CASE FILES"}</div>
            ${win.workCases.map((c) => html`
              <div key=${c.id} onClick=${c.onSelect} style=${c.rowStyle}>
                <div style="min-width:0;">
                  <div style=${"font-family:" + VT + ";font-size:18px;color:#7dffae;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.5px;"}>${c.title}</div>
                  <div style="font-size:11px;color:#3fcf78;">${c.category}</div>
                </div>
              </div>`)}
          </div>
          <div style="flex:1;min-width:0;overflow:auto;padding:14px;">
            <div style="width:100%;border:1px solid #1c5a34;background:#020a05;overflow:hidden;margin-bottom:13px;">
              <img src=${aw.img} alt="" style="width:100%;height:auto;display:block;"/>
            </div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:7px;flex-wrap:wrap;">
              <span style=${"font-family:" + VT + ";font-size:26px;color:#5dffa0;letter-spacing:.5px;"}>${aw.title}</span>
              <span style=${"font-family:" + VT + ";font-size:15px;color:#04100a;background:#1aff80;padding:1px 9px;"}>${aw.category}</span>
            </div>
            <div style="font-size:14px;line-height:1.65;color:#9fffc0;margin-bottom:11px;">${aw.summary}</div>
            <div style=${"font-family:" + VT + ";font-size:15px;color:#3fcf78;letter-spacing:.5px;margin-bottom:15px;"}>${aw.tags}</div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <a class="h-fill" href=${aw.url} target="_blank" style=${"text-decoration:none;font-family:" + VT + ";font-size:17px;letter-spacing:1px;color:#7dffae;padding:7px 16px;border:1px solid #2bd968;background:#0c2415;"}>${"[ VIEW ON DRIBBBLE >> ]"}</a>
              <a class="h-bright" href=${"mailto:" + L.email + "?subject=" + encodeURIComponent("Project inquiry: " + aw.title)} style=${"text-decoration:none;font-family:" + VT + ";font-size:17px;letter-spacing:1px;color:#04100a;padding:7px 16px;border:1px solid #1aff80;background:#1aff80;"}>[ START A PROJECT LIKE THIS ]</a>
            </div>
          </div>
        </div>
        <div style=${"padding:5px 9px;border-top:1px solid #1c5a34;font-family:" + VT + ";font-size:16px;color:#3fcf78;"}>SELECT A CASE FILE · UPLINK: DRIBBBLE</div>`;
      }

      if (win.isServices) return html`
        <div style="flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:11px;">
          <div style="font-size:18px;color:#9fffc0;border:1px solid #1c5a34;background:#04100a;padding:10px 12px;line-height:1.5;">${"> I help businesses transform ideas into digital experiences that delight users. Select a module to initialize."}</div>
          ${win.serviceList.map((sv) => html`
            <div key=${sv.id} class="h-card" style="display:flex;gap:13px;align-items:center;border:1px solid #1c5a34;background:#04100a;padding:13px;">
              <img src=${sv.icon} alt="" style="width:46px;height:46px;flex:0 0 auto;"/>
              <div style="flex:1;min-width:0;">
                <div style=${"font-family:" + VT + ";font-size:23px;color:#5dffa0;letter-spacing:.5px;"}>${sv.name}</div>
                <div style="font-size:14.5px;color:#7dcc8f;line-height:1.45;margin-top:3px;">${sv.desc}</div>
              </div>
              <a class="h-fill" href=${sv.href} style=${"text-decoration:none;font-family:" + VT + ";font-size:18px;color:#7dffae;padding:6px 13px;flex:0 0 auto;border:1px solid #2bd968;background:#0c2415;"}>[ REQUEST ]</a>
            </div>`)}
        </div>`;

      if (win.isTestimonials) {
        const am = win.activeMsg;
        return html`
        <div style="flex:1;min-height:0;display:flex;">
          <div style="width:188px;flex:0 0 auto;border-right:1px solid #1c5a34;overflow:auto;background:#04100a;">
            <div style=${"padding:6px 10px;font-family:" + VT + ";font-size:18px;color:#3fcf78;border-bottom:1px solid #1c5a34;letter-spacing:.5px;"}>${"> INBOX // 3 SIGNALS"}</div>
            ${win.messages.map((m) => html`
              <div key=${m.id} onClick=${m.onSelect} style=${m.rowStyle}>
                <div style=${"width:30px;height:30px;flex:0 0 auto;border:1px solid #2bd968;display:flex;align-items:center;justify-content:center;font-family:" + VT + ";font-size:14px;color:#5dffa0;"}>${m.initials}</div>
                <div style="min-width:0;">
                  <div style=${"font-family:" + VT + ";font-size:18px;color:#7dffae;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.5px;"}>${m.name}</div>
                  <div style="font-size:13px;color:#3fcf78;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.subject}</div>
                </div>
              </div>`)}
          </div>
          <div style="flex:1;min-width:0;overflow:auto;padding:16px;">
            <div style=${"font-family:" + VT + ";font-size:22px;color:#5dffa0;letter-spacing:.5px;"}>${"> " + am.subject}</div>
            <div style=${"font-size:14px;color:#3fcf78;margin:6px 0 14px;border-bottom:1px solid #1c5a34;padding-bottom:10px;font-family:" + VT + ";"}><span style="color:#ffb000;">${am.name}</span>${" · " + am.role}</div>
            <div style="font-size:18px;line-height:1.7;color:#9fffc0;">${'"' + am.body + '"'}</div>
          </div>
        </div>`;
      }

      if (win.isMail) return html`
        <div style="flex:1;overflow:auto;display:flex;flex-direction:column;">
          <div style="padding:13px 15px;border-bottom:1px solid #1c5a34;background:#04100a;">
            <div style=${"font-family:" + VT + ";font-size:21px;color:#5dffa0;letter-spacing:.5px;"}>${"> LET'S CREATE AMAZING DIGITAL EXPERIENCES TOGETHER"}</div>
            <div style="font-size:14px;color:#3fcf78;margin-top:3px;">// I'd love to hear about your project and discuss how I can help.</div>
            <div style=${"font-family:" + VT + ";font-size:15px;color:#1aff80;letter-spacing:.5px;margin-top:6px;"}>● AVAILABLE FOR PROJECTS · REPLIES WITHIN ~24H</div>
          </div>
          <div style=${"padding:14px;display:flex;flex-direction:column;gap:10px;font-family:" + VT + ";font-size:18px;"}>
            <label style="display:flex;align-items:center;gap:8px;color:#7dffae;"><span style="width:74px;flex:0 0 auto;color:#3fcf78;">TO:</span><span style="flex:1;background:#04100a;border:1px solid #1c5a34;padding:5px 9px;color:#5dffa0;">${L.email}</span></label>
            <label style="display:flex;align-items:center;gap:8px;color:#7dffae;"><span style="width:74px;flex:0 0 auto;color:#3fcf78;">FROM:</span><input ref=${this.mailFromRef} type="email" placeholder="your@email.com" style="flex:1;background:#04100a;border:1px solid #2bd968;padding:5px 9px;color:#5dffa0;font-size:18px;outline:none;"/></label>
            <label style="display:flex;align-items:center;gap:8px;color:#7dffae;"><span style="width:74px;flex:0 0 auto;color:#3fcf78;">SUBJECT:</span><input ref=${this.mailSubjRef} type="text" placeholder="new project inquiry" style="flex:1;background:#04100a;border:1px solid #2bd968;padding:5px 9px;color:#5dffa0;font-size:18px;outline:none;"/></label>
            <textarea ref=${this.mailBodyRef} placeholder=${"> begin transmission..."} style="height:130px;resize:none;background:#04100a;border:1px solid #2bd968;padding:9px;color:#5dffa0;font-size:18px;line-height:1.5;outline:none;"></textarea>
            <div style="display:flex;justify-content:flex-end;">
              <button class="h-fill" onClick=${this.sendMail} style=${"font-family:" + VT + ";font-size:18px;letter-spacing:1px;color:#7dffae;padding:7px 24px;cursor:pointer;border:1px solid #2bd968;background:#0c2415;"}>${"[ TRANSMIT >> ]"}</button>
            </div>
          </div>
        </div>`;

      if (win.isMusic) {
        const r = D.radio;
        const chIdx = this.state.radioCh || 0;
        const ch = r.channels[chIdx] || r.channels[0];
        const src = "https://open.spotify.com/embed/playlist/" + ch.playlist + "?utm_source=generator";
        return html`
        <div style="flex:1;overflow:auto;display:flex;flex-direction:column;padding:12px;gap:10px;background:#04100a;">
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="assets/vault/vicon-radio.png" alt="" style="width:40px;height:40px;flex:0 0 auto;"/>
            <div style="min-width:0;flex:1;">
              <div style=${"font-family:" + VT + ";font-size:22px;color:#5dffa0;letter-spacing:.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"}>${r.station}</div>
              <div style=${"font-size:16px;color:#3fcf78;font-family:" + VT + ";white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"}>${"CH-0" + (chIdx + 1) + " // " + ch.freq + " · " + ch.label}</div>
            </div>
            <span style=${"display:flex;align-items:center;gap:5px;font-family:" + VT + ";font-size:14px;color:#1aff80;flex:0 0 auto;"}><span style="width:7px;height:7px;border-radius:50%;background:#1aff80;animation:blink 1.6s steps(1) infinite;"></span>ON AIR</span>
          </div>
          <div style="display:flex;align-items:flex-end;gap:2px;height:30px;border:1px solid #1c5a34;padding:5px;background:#020a05;">
            ${Array.from({ length: 26 }, (_, i) => html`<span key=${i} style=${"flex:1;background:#1aff80;height:100%;transform-origin:bottom;animation:mb-eq .9s ease-in-out " + (i * 0.06).toFixed(2) + "s infinite;"}></span>`)}
          </div>
          <div style="border:1px solid #2bd968;background:#020a05;padding:4px;">
            <iframe title="Spotify" src=${src} width="100%" height="152" style="border:0;border-radius:6px;display:block;" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
          </div>
          <div style="display:flex;gap:6px;">
            ${r.channels.map((c, i) => html`<button key=${i} onClick=${() => this.setState({ radioCh: i })} style=${"flex:1;min-width:0;font-family:" + VT + ";font-size:14px;letter-spacing:.5px;padding:6px 6px;cursor:pointer;border:1px solid #2bd968;transition:all .13s ease;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" + (i === chIdx ? "background:#1aff80;color:#04100a;" : "background:#0c2415;color:#7dffae;")}>${c.label}</button>`)}
          </div>
          <div style=${"font-family:" + VT + ";font-size:13px;color:#2c7a48;letter-spacing:.5px;text-align:center;line-height:1.4;"}>CITY POP · STREAMING VIA SPOTIFY<br/>30s PREVIEW · FULL TRACKS WHEN SIGNED IN</div>
        </div>`;
      }

      if (win.isTerminal) return html`
        <div onClick=${this.focusTerm} style=${"flex:1;min-height:0;display:flex;flex-direction:column;background:#020a05;padding:9px 11px;font-family:" + VT + ";font-size:21px;line-height:1.25;color:#41ff83;overflow:auto;cursor:text;"}>
          ${win.termLines.map((ln, i) => html`<div key=${i} style=${"white-space:pre-wrap;word-break:break-word;color:" + ln.color + ";"}>${ln.text}</div>`)}
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="color:#ffb000;white-space:nowrap;">${"HHX:\\>"}</span>
            <input ref=${this.termRef} value=${win.termInput} onInput=${this.onTermChange} onKeyDown=${this.onTermKey} spellcheck="false" autocomplete="off" style=${"flex:1;background:transparent;border:none;outline:none;color:#41ff83;font-family:" + VT + ";font-size:21px;caret-color:#41ff83;"}/>
          </div>
        </div>`;

      if (win.isRecycle) return html`
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:20px;text-align:center;background:#04100a;">
          <img src="assets/vault/vicon-trash.png" alt="" style="width:56px;height:56px;"/>
          <div style=${"font-family:" + VT + ";font-size:18px;color:#7dffae;line-height:1.5;"}>DISPOSAL UNIT EMPTY.<br/><span style="color:#3fcf78;">No irradiated files detected.</span></div>
        </div>`;

      return null;
    }
  }

  /* ==========================================================================
   * The Retro DVD TV — the CRT cabinet the OS lives inside
   * ========================================================================*/
  class TvFrame extends Component {
    constructor(props) {
      super(props);
      this.state = { power: true, toggled: false };
      this.togglePower = () => this.setState((s) => ({ power: !s.power, toggled: true }));
    }
    render(props, s) {
      const power = s.power, toggled = s.toggled;
      const shadow = "drop-shadow(0px 2px 0px #ffffff0f) drop-shadow(0px -2px 0px #0000000f)";

      const tubeStyle = "position:absolute;inset:0;transform-origin:center center;will-change:transform,opacity;transform:" +
        (power ? "scale(1,1)" : "scale(0,0.012)") + ";opacity:" + (power ? 1 : 0) + ";animation:" +
        (toggled ? (power ? "crtOn 0.34s cubic-bezier(0.16,1,0.3,1)" : "crtOff 0.26s cubic-bezier(0.7,0,0.84,0) forwards") : "none") + ";";

      const powerBtnStyle = "display:grid;place-items:center;background:none;color:" + (power ? "#7dffae" : "#6b6f6c") +
        ";border:1px solid black;border-radius:50%;font-weight:100;aspect-ratio:1;width:1.5rem;height:1.5rem;cursor:pointer;text-shadow:" +
        (power ? "0 0 5px rgba(125,255,174,0.85)" : "none") + ";transition:color .2s ease, text-shadow .2s ease;filter:" + shadow + ";";

      const social = (href, label, icon) => html`
        <a class="h-bright" href=${href} target="_blank" aria-label=${label} style=${"display:grid;place-items:center;background:none;border:1px solid black;border-radius:50%;aspect-ratio:1;width:1.5rem;height:1.5rem;cursor:pointer;filter:" + shadow + ";"}>
          <img src=${"assets/social/" + icon} alt=${label} style="width:0.62rem;height:0.62rem;display:block;opacity:0.82;"/>
        </a>`;

      return html`
        <div style="width:35rem;padding:1.5rem;border-radius:1rem;border:0.4rem solid #1d211c;display:grid;gap:1.5rem;background-color:#393c38;">
          <div style=${"position:relative;border-radius:1rem;background-color:#1d211c;padding:1.7rem;filter:" + shadow + ";"}>
            <div style="position:relative;width:456px;height:365px;margin:0 auto;border-radius:6% / 8%;overflow:hidden;background:#04120a;box-shadow:0 0 0 2px #15120d, inset 0 0 0 1px rgba(120,255,180,0.07);">
              <div style=${tubeStyle}>
                <div style="position:absolute;left:50%;top:50%;width:960px;height:768px;transform:translate(-50%,-50%) scale(0.475);transform-origin:center center;">
                  <${HhxOs} />
                </div>
                <div style="position:absolute;inset:0;pointer-events:none;z-index:4;animation:scanlines 0.5s linear infinite;background-image:repeating-linear-gradient(transparent, transparent 5px, rgba(0,0,0,0.05) 5px, rgba(0,0,0,0.05) 10px);"></div>
                <div style="position:absolute;inset:0;pointer-events:none;border-radius:inherit;box-shadow:inset 0 0 30px 13px rgba(2,12,6,0.7);z-index:5;"></div>
              </div>
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:stretch;gap:0.75rem;">
            <div style=${"background-image:radial-gradient(black 0.1rem, transparent 0);background-size:0.5rem 0.5rem;width:8rem;padding:2rem;filter:" + shadow + ";"}></div>
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <button aria-label="Power" onClick=${this.togglePower} style=${powerBtnStyle}>⏻</button>
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;">
              ${social(D.links.dribbble, "Dribbble", "dribbble.svg")}
              ${social(D.links.instagram, "Instagram", "instagram.svg")}
              ${social(D.links.linkedin, "LinkedIn", "linkedin.svg")}
              ${social(D.links.x, "X", "x.svg")}
            </div>
            <div style=${"background-image:radial-gradient(black 0.1rem, transparent 0);background-size:0.5rem 0.5rem;width:8rem;padding:2rem;filter:" + shadow + ";"}></div>
          </div>
        </div>`;
    }
  }

  /* ==========================================================================
   * Mount + responsive fit
   * ========================================================================*/
  // Pick the device: phones get the HHX-OS Mobile handheld, wider screens get
  // the Retro DVD TV. `?view=tv` / `?view=mobile` forces one on any screen.
  const MOBILE_BREAKPOINT = 760;
  function pickDevice() {
    const forced = new URLSearchParams(location.search).get("view");
    if (forced === "tv" || forced === "mobile") return forced;
    return window.innerWidth < MOBILE_BREAKPOINT ? "mobile" : "tv";
  }

  // Fit the (unscaled) device to the viewport, capping at the design's ~1.5x,
  // and size the wrapper to the scaled box so the page can centre it.
  function fitDevice() {
    const fit = document.getElementById("tv-fit");
    const scaler = document.getElementById("tv-scaler");
    if (!fit || !scaler) return;
    const inner = scaler.firstElementChild;
    if (!inner) return;
    const w = inner.offsetWidth, hh = inner.offsetHeight;
    if (!w || !hh) return;
    const margin = 40;
    const scale = Math.max(0.3, Math.min(1.5, (window.innerWidth - margin) / w, (window.innerHeight - margin) / hh));
    scaler.style.transform = "scale(" + scale.toFixed(4) + ")";
    fit.style.width = Math.ceil(w * scale) + "px";
    fit.style.height = Math.ceil(hh * scale) + "px";
  }

  class App extends Component {
    constructor(props) {
      super(props);
      this.state = { device: pickDevice() };
      this._onResize = () => {
        const d = pickDevice();
        if (d !== this.state.device) this.setState({ device: d });
        else fitDevice();
      };
    }
    componentDidMount() {
      window.addEventListener("resize", this._onResize);
      requestAnimationFrame(fitDevice);
      setTimeout(fitDevice, 300);
    }
    componentWillUnmount() { window.removeEventListener("resize", this._onResize); }
    componentDidUpdate() { fitDevice(); }
    render(_, s) {
      const Device = s.device === "mobile" && window.HHX_Mobile ? window.HHX_Mobile : TvFrame;
      return html`<div class="tv-fit" id="tv-fit"><div class="tv-scaler" id="tv-scaler"><${Device} /></div></div>`;
    }
  }

  preact.render(html`<${App} />`, document.getElementById("root"));
})();
