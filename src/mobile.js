/* ============================================================================
 * HHX-OS Mobile — a Pip-Boy–style handheld running the portfolio
 *
 * Faithful port of the "HHX-OS Mobile" Claude Design prototype. Shares the big
 * content arrays (work cases, tracks, testimonials, links) with the desktop via
 * window.HHX_DATA; its screen-tuned bits (capability stats, short service blurbs,
 * boot lines) live here. Exposes `window.HHX_Mobile` for app.js to mount.
 * ==========================================================================*/
(function () {
  "use strict";

  var preact = window.preact;
  var htm = window.htm;
  var html = htm.bind(preact.h);
  var Component = preact.Component;
  var createRef = preact.createRef;

  var D = window.HHX_DATA;
  var V = D.vaultDir;
  var EMAIL = D.links.email;

  class HhxMobile extends Component {
    constructor(props) {
      super(props);

      this.titlesFor = {
        about: "PERSONNEL FILE", work: "PROJECT ARCHIVE", services: "SERVICE MODULES",
        testimonials: "TRANSMISSIONS", mail: "TRANSMIT", music: "AUDIO MODULE", terminal: "TERMINAL",
        system: "SYSTEM SETTINGS",
      };
      this.stats = D.stats;
      // Mobile uses its own, tighter service blurbs
      this.services = [
        { id: "web",  name: "WEBSITE DESIGN",    icon: V + "vicon-web.png",
          desc: "Stunning websites that captivate your audience and reflect your brand." },
        { id: "app",  name: "MOBILE APP DESIGN", icon: V + "vicon-mobile.png",
          desc: "Intuitive mobile apps with seamless interactions and engaging visuals." },
        { id: "saas", name: "SAAS DESIGN",       icon: V + "vicon-saas.png",
          desc: "User-friendly SaaS dashboards that simplify workflows and look great." },
      ];
      this.messages = D.messages;
      this.workCases = D.workCases;
      this.tracks = D.tracks;
      // Mobile boot readout (tighter dot-leaders for the narrow screen)
      this.allBoot = [
        { text: "HAKIM-HAIMAN INDUSTRIES (HHX)",       color: "#ffb000" },
        { text: "UNIFIED OPERATING SYSTEM // TERMLINK", color: "#ffb000" },
        { text: "BUILD 2.2.2287  (C) HHX TERMLINK",     color: "#2c7a48" },
        { text: "",                                     color: "#41ff83" },
        { text: "INITIATE BOOT SEQUENCE ..... [OK]",     color: "#41ff83" },
        { text: "SCANNING PERIPHERALS ....... [OK]",     color: "#41ff83" },
        { text: "LOADING DESIGN SUBROUTINES . [OK]",     color: "#41ff83" },
        { text: "MOUNTING /PORTFOLIO ........ [OK]",      color: "#41ff83" },
        { text: "ESTABLISHING UPLINK ........ [OK]",      color: "#41ff83" },
        { text: "",                                     color: "#41ff83" },
        { text: "> RUN HHXOS.EXE",                      color: "#5dffa0" },
      ];

      this.timers = [];
      this.bootTime = Date.now();
      this.nameRef = createRef();
      this.emailRef = createRef();
      this.msgRef = createRef();
      this.termRef = createRef();

      this.state = {
        view: "home", powered: true, bootPhase: "bios", bootShown: 0,
        // System Settings
        uiPhosphor: "Green", uiScan: true, ui24: true, uiBright: 100, uiVol: 72,
        workSel: null, track: 0, playing: false, prog: 0, radioCh: 0, clock: "--:--", termInput: "",
        termHist: [
          { t: "HHX-OS MOBILE TERMLINK  v2.2.2287", c: "#ffb000" },
          { t: "(C) HAKIM-HAIMAN INDUSTRIES", c: "#2c7a48" },
          { t: "Type 'help' for available commands.", c: "#3fcf78" },
        ],
      };

      ["onPower", "skipBoot", "goHome", "sendMail", "onTermInput", "onTermKey"].forEach(
        (m) => (this[m] = this[m].bind(this))
      );
    }

    componentDidMount() {
      this.tick();
      this.timer = setInterval(() => this.tick(), 1000);
      this.startBoot();
    }
    componentWillUnmount() {
      clearInterval(this.timer);
      this.timers.forEach((t) => clearTimeout(t));
    }
    componentDidUpdate() {
      if (this.state.view === "terminal" && this.termRef.current) {
        this.termRef.current.scrollTop = this.termRef.current.scrollHeight;
      }
    }

    startBoot() {
      this.timers.forEach((t) => clearTimeout(t));
      this.timers = [];
      this.setState({ bootPhase: "bios", bootShown: 0 });
      this.allBoot.forEach((_, i) => {
        this.timers.push(setTimeout(() => this.setState({ bootShown: i + 1 }), 190 * (i + 1)));
      });
      const after = 190 * (this.allBoot.length + 1);
      this.timers.push(setTimeout(() => this.setState({ bootPhase: "splash" }), after + 250));
      this.timers.push(setTimeout(() => this.setState({ bootPhase: "done" }), after + 1800));
    }
    skipBoot() {
      this.timers.forEach((t) => clearTimeout(t));
      this.setState({ bootPhase: "done", bootShown: this.allBoot.length });
    }
    power() {
      if (this.state.powered) this.setState({ powered: false });
      else { this.setState({ powered: true }); this.startBoot(); }
    }
    tick() {
      const d = new Date();
      let clock;
      if (this.state.ui24) {
        clock = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
      } else {
        let h = d.getHours(); const ap = h < 12 ? "AM" : "PM"; h = h % 12 || 12;
        clock = h + ":" + String(d.getMinutes()).padStart(2, "0") + " " + ap;
      }
      const ns = { clock: clock };
      if (this.state.playing) {
        let p = this.state.prog + 1;
        const len = this.tracks[this.state.track].len;
        if (p >= len) { p = 0; ns.track = (this.state.track + 1) % this.tracks.length; }
        ns.prog = p;
      }
      this.setState(ns);
    }
    open(id) { this.setState({ view: id, workSel: null }); }
    goHome() { this.setState({ view: "home" }); }
    fmtSec(s) { return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0"); }

    onPower() { this.power(); }
    onTermInput(e) { this.setState({ termInput: e.target.value }); }
    onTermKey(e) { if (e.key === "Enter") this.runTerm(); }

    sendMail() {
      const n = (this.nameRef.current && this.nameRef.current.value) || "";
      const e = (this.emailRef.current && this.emailRef.current.value) || "";
      const m = (this.msgRef.current && this.msgRef.current.value) || "";
      const subj = encodeURIComponent("Project inquiry" + (n ? " from " + n : ""));
      const body = encodeURIComponent(m + (e ? "\n\nReply to: " + e : ""));
      window.location.href = "mailto:" + EMAIL + "?subject=" + subj + "&body=" + body;
    }

    runTerm() {
      const raw = (this.state.termInput || "").trim();
      if (!raw) return;
      const cmd = raw.toLowerCase();
      let out = [];
      if (cmd === "help") out = [{ t: "COMMANDS:  about · work · services · contact · whoami · reboot · clear", c: "#9fffc0" }];
      else if (cmd === "reboot" || cmd === "restart") { this.setState({ termInput: "" }); this.startBoot(); return; }
      else if (cmd === "about") out = [{ t: "Hakim Haiman — UI/UX Designer, 6+ yrs. SaaS, web & mobile, AI products.", c: "#9fffc0" }];
      else if (cmd === "work" || cmd === "ls") out = this.workCases.map((c) => ({ t: "  • " + c.title + "  [" + c.category + "]", c: "#7dffae" }));
      else if (cmd === "services") out = this.services.map((s) => ({ t: "  • " + s.name, c: "#7dffae" }));
      else if (cmd === "contact") out = [
        { t: "  " + EMAIL, c: "#9fffc0" },
        { t: "  dribbble.com/mochamadhakim", c: "#3fcf78" },
        { t: "  linkedin.com/in/mochamadhakim", c: "#3fcf78" },
      ];
      else if (cmd === "whoami") out = [{ t: "guest@hhx-os", c: "#9fffc0" }];
      else if (cmd === "clear") { this.setState({ termHist: [], termInput: "" }); return; }
      else out = [{ t: "command not found: " + raw + "   (try 'help')", c: "#ffb000" }];
      this.setState((s) => ({ termHist: [...s.termHist, { t: "guest@hhx:~$ " + raw, c: "#5dffa0" }, ...out], termInput: "" }));
    }

    /* ---- system settings ------------------------------------------------ */
    systemVals() {
      const s = this.state;
      const VT = "'VT323',monospace";
      const seg = (active) => "font-family:" + VT + ";font-size:15px;letter-spacing:.5px;padding:4px 14px;cursor:pointer;border:1px solid #2bd968;transition:all .13s ease;" + (active ? "background:#1aff80;color:#04100a;" : "background:#0c2415;color:#7dffae;");
      const _up = Math.max(0, Math.floor((Date.now() - this.bootTime) / 1000));
      const uptime = String(Math.floor(_up / 3600)).padStart(2, "0") + ":" + String(Math.floor((_up % 3600) / 60)).padStart(2, "0") + ":" + String(_up % 60).padStart(2, "0");
      const memPct = 58;
      const br = s.uiBright / 100;
      const screenFilter = s.uiPhosphor === "Amber"
        ? "hue-rotate(-88deg) saturate(1.35) brightness(" + (1.06 * br).toFixed(3) + ")"
        : "brightness(" + br.toFixed(3) + ")";
      return {
        uiBright: s.uiBright, uiBrightLbl: s.uiBright + "%", uiVol: s.uiVol, uiVolLbl: s.uiVol + "%",
        phGreenBtn: seg(s.uiPhosphor === "Green"), phAmberBtn: seg(s.uiPhosphor === "Amber"),
        scanBtn: seg(s.uiScan), scanLabel: s.uiScan ? "ON" : "OFF",
        clk12Btn: seg(!s.ui24), clk24Btn: seg(s.ui24),
        setPhGreen: () => this.setState({ uiPhosphor: "Green" }), setPhAmber: () => this.setState({ uiPhosphor: "Amber" }),
        toggleScan: () => this.setState((st) => ({ uiScan: !st.uiScan })),
        toggle24: () => this.setState((st) => ({ ui24: !st.ui24 })),
        onBright: (e) => this.setState({ uiBright: +e.target.value }),
        onVol: (e) => this.setState({ uiVol: +e.target.value }),
        onReboot: () => this.startBoot(),
        screenFilter: screenFilter, showScan: s.uiScan,
        sysInfo: [
          { k: "OS", v: "HHX-OS 2.2.2287" },
          { k: "KERNEL", v: "TERMLINK-SH" },
          { k: "HOST", v: "HHX HANDHELD" },
          { k: "DISPLAY", v: "404×830 CRT" },
          { k: "PHOSPHOR", v: s.uiPhosphor.toUpperCase() },
          { k: "UPTIME", v: uptime },
        ],
        memLbl: memPct + "% USED", memBarStyle: "height:100%;width:" + memPct + "%;background:#1aff80;",
      };
    }

    /* ====================================================================== */
    render(props, s) {
      const VT = "'VT323',monospace";
      const STM = "'Share Tech Mono',monospace";
      const view = s.view;

      const isHome = view === "home";
      const isAbout = view === "about", isWork = view === "work", isServices = view === "services";
      const isComms = view === "testimonials", isMail = view === "mail", isRadio = view === "music", isTerminal = view === "terminal";
      const isSystem = view === "system";
      const appTitle = this.titlesFor[view] || "";

      const sys = this.systemVals();
      const powerBtnStyle = "display:grid;place-items:center;background:none;color:" + (s.powered ? "#7dffae" : "#6b6f6c") +
        ";border:1px solid black;border-radius:50%;aspect-ratio:1;width:2.5rem;height:2.5rem;font-size:1.35rem;cursor:pointer;text-shadow:" +
        (s.powered ? "0 0 5px rgba(125,255,174,0.85)" : "none") +
        ";transition:color .2s ease, text-shadow .2s ease;filter:drop-shadow(0px 2px 0px #ffffff0f) drop-shadow(0px -2px 0px #0000000f);";

      const stats = this.stats.map((st) => ({ k: st.k, v: st.v, w: st.v * 10 + "%" }));
      const workList = this.workCases.map((w, i) => ({ ...w, onSelect: () => this.setState({ workSel: i }) }));
      const isWorkDetail = view === "work" && s.workSel !== null;
      const c = this.workCases[s.workSel] || {};
      const aw = { ...c, inquire: c.title ? "mailto:" + EMAIL + "?subject=" + encodeURIComponent("Project inquiry: " + c.title) : "#" };
      const services = this.services.map((sv) => ({ ...sv, href: "mailto:" + EMAIL + "?subject=" + encodeURIComponent("Request: " + sv.name) }));

      const cur = this.tracks[s.track] || { title: "", artist: "", len: 1 };
      const eqBars = Array.from({ length: 13 }, (_, i) => ({
        style: "flex:1;min-width:0;background:#1aff80;height:100%;transform-origin:bottom;animation:mb-eq .9s ease-in-out " + (i * 0.09).toFixed(2) + "s infinite;animation-play-state:" + (s.playing ? "running" : "paused") + ";",
      }));
      const playlist = this.tracks.map((t, i) => ({
        num: String(i + 1).padStart(2, "0"), title: t.title, len: this.fmtSec(t.len),
        onPick: () => this.setState({ track: i, prog: 0, playing: true }),
        rowStyle: "display:flex;align-items:center;gap:9px;width:100%;padding:8px 11px;cursor:pointer;border:none;border-bottom:1px solid #102b1a;font-family:" + VT + ";font-size:18px;transition:all .13s ease;color:" + (i === s.track ? "#04100a" : "#7dffae") + ";background:" + (i === s.track ? "#1aff80" : "transparent") + ";",
      }));

      const tileStyle = "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:17px 7px;background:#04100a;border:1px solid #1c5a34;cursor:pointer;";
      const tileLabel = "font-family:" + VT + ";font-size:16px;letter-spacing:1px;color:#7dffae;";
      const tileIcon = "width:38px;height:38px;";

      const showBios = s.powered && s.bootPhase === "bios";
      const showSplash = s.powered && s.bootPhase === "splash";
      const bootLines = this.allBoot.slice(0, s.bootShown);

      return html`
      <div class="hhx-mobile" style=${"position:relative;width:404px;height:830px;border-radius:48px;background-color:#393c38;padding:13px;box-shadow:0 34px 80px rgba(0,0,0,.65),inset 0 0 0 2px #0b0d07,inset 0 2px 1px rgba(255,255,255,.05);display:flex;flex-direction:column;font-family:" + STM + ";color:#8effb5;"}>

        ${/* ===== SCREEN =====
             The rounded clip (border-radius + overflow:hidden) stays on THIS
             element with no filter — iOS Safari drops corner-clipping when a
             filter or blend-mode lives on the clipping element itself. The
             colour filter goes on the inner wrapper; isolation:isolate keeps
             the flicker's mix-blend-mode from escaping the rounded corners. */ null}
        <div style="position:relative;width:100%;flex:1;min-height:0;border-radius:34px;overflow:hidden;background:#06140c;border:1px solid #0b1f12;isolation:isolate;">
          <div style=${"position:absolute;inset:0;display:flex;flex-direction:column;color:#8effb5;filter:" + sys.screenFilter + ";"}>

          ${/* status bar */ null}
          <div style=${"flex:0 0 auto;height:36px;display:flex;align-items:center;gap:8px;padding:0 16px;font-family:" + VT + ";font-size:16px;color:#7dffae;letter-spacing:.5px;border-bottom:1px solid #0e3320;background:rgba(6,26,14,.92);position:relative;z-index:60;"}>
            <span style="color:#5dffa0;">${s.clock}</span>
            <span style="color:#2c7a48;">HHX-OS</span>
            <span style="flex:1;"></span>
            <span style="display:flex;align-items:flex-end;gap:2px;height:12px;">
              <span style="width:3px;height:4px;background:#1aff80;"></span>
              <span style="width:3px;height:7px;background:#1aff80;"></span>
              <span style="width:3px;height:10px;background:#1aff80;"></span>
              <span style="width:3px;height:12px;background:#2c7a48;"></span>
            </span>
            <span style="color:#1aff80;letter-spacing:1px;">LIVE</span>
            <span style="display:flex;align-items:center;gap:2px;">
              <span style="width:22px;height:11px;border:1px solid #7dffae;padding:1px;display:block;">
                <span style="display:block;height:100%;width:84%;background:#1aff80;"></span>
              </span>
              <span style="width:2px;height:5px;background:#7dffae;display:block;"></span>
            </span>
          </div>

          ${/* viewport */ null}
          <div style="flex:1;min-height:0;display:flex;flex-direction:column;position:relative;background:#08160d;">

            ${isHome ? html`
            <div style="flex:1;min-height:0;overflow:auto;padding:15px;display:flex;flex-direction:column;gap:14px;">
              <div style="display:flex;gap:16px;align-items:center;border:1px solid #1c5a34;background:#04100a;padding:16px;">
                <img src="assets/vault/vavatar.png" alt="" style="width:60px;height:60px;flex:0 0 auto;object-fit:cover;object-position:top;background:#020a05;"/>
                <div style="min-width:0;">
                  <div style=${"font-family:" + VT + ";font-size:30px;line-height:.95;color:#5dffa0;letter-spacing:.5px;"}>HAKIM HAIMAN</div>
                  <div style="font-size:12.5px;color:#ffb000;margin-top:4px;letter-spacing:.5px;">UI/UX DESIGNER</div>
                  <div style=${"font-family:" + VT + ";font-size:15px;color:#1aff80;margin-top:3px;letter-spacing:.5px;"}><span style="animation:mb-blink 1.6s steps(1) infinite;">●</span> AVAILABLE FOR PROJECTS</div>
                </div>
              </div>
              <div style=${"font-family:" + VT + ";font-size:15px;color:#3fcf78;letter-spacing:1.5px;padding-left:2px;"}>${"> APPLICATIONS"}</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:11px;">
                <button class="h-tile" onClick=${() => this.open("about")} style=${tileStyle}><img src=${V + "vavatar.png"} alt="" style=${tileIcon + "object-fit:cover;object-position:top;"}/><span style=${tileLabel}>PERSONNEL</span></button>
                <button class="h-tile" onClick=${() => this.open("work")} style=${tileStyle}><img src=${V + "vicon-work.png"} alt="" style=${tileIcon}/><span style=${tileLabel}>ARCHIVE</span></button>
                <button class="h-tile" onClick=${() => this.open("services")} style=${tileStyle}><img src=${V + "vicon-blocks.png"} alt="" style=${tileIcon}/><span style=${tileLabel}>MODULES</span></button>
                <button class="h-tile" onClick=${() => this.open("testimonials")} style=${tileStyle}><img src=${V + "vicon-testimonials.png"} alt="" style=${tileIcon}/><span style=${tileLabel}>COMMS</span></button>
                <button class="h-tile" onClick=${() => this.open("mail")} style=${tileStyle}><img src=${V + "vicon-envelope.png"} alt="" style=${tileIcon}/><span style=${tileLabel}>TRANSMIT</span></button>
                <button class="h-tile" onClick=${() => this.open("music")} style=${tileStyle}><img src=${V + "vicon-radio.png"} alt="" style=${tileIcon}/><span style=${tileLabel}>RADIO</span></button>
                <button class="h-tile" onClick=${() => this.open("system")} style=${tileStyle}><img src=${V + "vicon-mycomputer.png"} alt="" style=${tileIcon}/><span style=${tileLabel}>SYSTEM</span></button>
                <button class="h-tile" onClick=${() => this.open("terminal")} style=${tileStyle}><img src=${V + "vicon-terminal.png"} alt="" style=${tileIcon}/><span style=${tileLabel}>TERMINAL</span></button>
              </div>
              <div style=${"border:1px solid #1c5a34;background:#04100a;padding:11px 13px;font-family:" + VT + ";font-size:15px;color:#7dcc8f;letter-spacing:.5px;display:flex;justify-content:space-between;"}>
                <span>BUILD 2.2.2287</span><span style="color:#2c7a48;">HHX TERMLINK</span>
              </div>
            </div>` : html`
            ${/* ===== APP SHELL ===== */ null}
            <div style=${"flex:0 0 auto;height:42px;display:flex;align-items:center;gap:10px;padding:0 12px;border-bottom:1px solid #1c5a34;background:#061a0e;position:relative;z-index:55;"}>
              <button class="h-fill" onClick=${this.goHome} style=${"display:flex;align-items:center;gap:4px;background:transparent;border:1px solid #2bd968;color:#7dffae;font-family:" + VT + ";font-size:16px;padding:4px 11px;cursor:pointer;"}>‹ HOME</button>
              <span style=${"flex:1;text-align:center;font-family:" + VT + ";font-size:21px;letter-spacing:1.5px;color:#5dffa0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"}>${appTitle}</span>
              <span style="width:62px;flex:0 0 auto;"></span>
            </div>
            <div style="flex:1;min-height:0;overflow:auto;position:relative;">
              ${isAbout ? this.renderAbout(stats, VT) : null}
              ${isWork ? (isWorkDetail ? this.renderWorkDetail(aw, VT) : this.renderWorkList(workList, VT)) : null}
              ${isServices ? this.renderServices(services, VT) : null}
              ${isComms ? this.renderComms(VT) : null}
              ${isMail ? this.renderMail(VT) : null}
              ${isRadio ? this.renderRadio({ cur, eqBars, playlist, s }, VT) : null}
              ${isTerminal ? this.renderTerminal(s, STM) : null}
              ${isSystem ? this.renderSystem(sys, VT) : null}
            </div>`}

          </div>

          ${/* ===== OVERLAYS ===== */ null}
          ${!s.powered ? html`
            <div style="position:absolute;inset:0;z-index:78;background:#020503;display:flex;align-items:center;justify-content:center;">
              <span style=${"font-family:" + VT + ";font-size:18px;color:#2c7a48;letter-spacing:2px;"}>STANDBY <span style="color:#ffb000;animation:mb-blink 1.6s steps(1) infinite;">●</span></span>
            </div>` : null}

          ${showBios ? html`
            <div onClick=${this.skipBoot} style=${"position:absolute;inset:0;z-index:90;background:#020a05;color:#41ff83;font-family:" + VT + ";font-size:16px;line-height:1.45;padding:30px 20px;cursor:pointer;overflow:hidden;"}>
              ${bootLines.map((bl, i) => html`<div key=${i} style=${"color:" + bl.color + ";white-space:pre-wrap;"}>${bl.text}</div>`)}
              <div style="margin-top:14px;font-size:14px;color:#2c7a48;letter-spacing:1px;">[ tap to skip ]</div>
            </div>` : null}

          ${showSplash ? html`
            <div onClick=${this.skipBoot} style="position:absolute;inset:0;z-index:90;background:#020a05;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;cursor:pointer;padding:20px;">
              <img src="assets/vault/vavatar.png" alt="" style="width:96px;height:96px;object-fit:cover;object-position:top;border-radius:50%;border:2px solid #2bd968;background:#020a05;"/>
              <div style=${"font-family:" + VT + ";font-size:30px;color:#5dffa0;letter-spacing:3px;"}>PLEASE STAND BY</div>
              <div style="width:200px;height:13px;border:1px solid #2bd968;padding:2px;"><div style="height:100%;background:#1aff80;animation:splashbar 1.5s ease-out forwards;"></div></div>
              <div style=${"font-family:" + VT + ";font-size:16px;color:#2c7a48;letter-spacing:1px;"}>INITIALIZING HHX-OS SHELL...</div>
            </div>` : null}

          ${/* CRT overlay — scanlines toggle via System Settings */ null}
          ${sys.showScan ? html`<div style="position:absolute;inset:0;pointer-events:none;z-index:70;background-image:repeating-linear-gradient(rgba(0,0,0,0) 0px,rgba(0,0,0,0) 2px,rgba(0,12,5,.22) 3px,rgba(0,12,5,.22) 3px);box-shadow:inset 0 0 90px 26px rgba(0,8,3,.72);border-radius:34px;"></div>` : null}
          <div style="position:absolute;inset:0;pointer-events:none;z-index:71;background:#1aff80;mix-blend-mode:overlay;opacity:.05;animation:mb-flick .12s steps(2) infinite;border-radius:34px;"></div>
          </div>
        </div>

        ${/* ===== DEVICE CONTROLS ===== */ null}
        <div style="flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 22px 6px;">
          <div style="flex:1;min-width:0;height:22px;background-image:radial-gradient(#0a0c06 1.9px, transparent 2.1px);background-size:10px 10px;opacity:.85;border-radius:2px;"></div>
          <button class="h-power" onClick=${this.onPower} aria-label="Power" title="Power" style=${powerBtnStyle}>⏻</button>
          <div style="flex:1;min-width:0;height:22px;background-image:radial-gradient(#0a0c06 1.9px, transparent 2.1px);background-size:10px 10px;opacity:.85;border-radius:2px;"></div>
        </div>
      </div>`;
    }

    /* ---- per-view bodies ------------------------------------------------ */
    renderAbout(stats, VT) {
      const L = D.links;
      return html`
      <div style="padding:15px;display:flex;flex-direction:column;gap:13px;">
        <div style="display:flex;gap:13px;align-items:center;border:1px solid #1c5a34;background:#04100a;padding:13px;">
          <img src="assets/vault/vavatar.png" alt="" style="width:78px;height:78px;flex:0 0 auto;object-fit:cover;object-position:top;background:#020a05;"/>
          <div>
            <div style=${"font-family:" + VT + ";font-size:30px;line-height:.95;color:#5dffa0;"}>HAKIM HAIMAN</div>
            <div style="font-size:12.5px;color:#ffb000;margin-top:5px;line-height:1.4;">"Crafting Digital Experiences That Users Love"</div>
          </div>
        </div>
        <div style="border:1px solid #1c5a34;background:#04100a;padding:12px;font-size:13.5px;line-height:1.6;color:#9fffc0;display:flex;flex-direction:column;gap:9px;">
          <div>${"> I'm a UI/UX Designer with 6+ years of experience helping SaaS companies, startups, and product teams build clear, scalable, and user-centered digital products."}</div>
          <div>${"> I specialize in UI/UX design for SaaS platforms, web applications, and mobile apps — including products powered by AI. My focus is not just on visuals, but on clarity, usability, and real product impact."}</div>
        </div>
        <div style="border:1px solid #1c5a34;background:#04100a;">
          <div style=${"padding:6px 11px;border-bottom:1px solid #1c5a34;font-family:" + VT + ";font-size:16px;color:#3fcf78;letter-spacing:1.5px;"}>▸ CAPABILITIES</div>
          <div style="padding:12px;display:flex;flex-direction:column;gap:9px;">
            ${stats.map((st, i) => html`
              <div key=${i} style="display:flex;align-items:center;gap:10px;">
                <span style=${"flex:0 0 96px;font-family:" + VT + ";font-size:16px;color:#7dcc8f;letter-spacing:.5px;"}>${st.k}</span>
                <span style="flex:1;height:9px;border:1px solid #1c5a34;background:#020a05;display:block;"><span style=${"display:block;height:100%;width:" + st.w + ";background:#1aff80;"}></span></span>
                <span style=${"font-family:" + VT + ";font-size:16px;color:#5dffa0;width:24px;text-align:right;"}>${st.v}</span>
              </div>`)}
          </div>
        </div>
        <div style="display:flex;gap:9px;">
          <a class="h-fill" href=${L.dribbble} target="_blank" style=${"flex:1;text-align:center;text-decoration:none;font-family:" + VT + ";font-size:17px;letter-spacing:1px;color:#7dffae;padding:9px 8px;border:1px solid #2bd968;background:#0c2415;"}>[ PORTFOLIO ]</a>
          <a class="h-fill" href=${"mailto:" + EMAIL} style=${"flex:1;text-align:center;text-decoration:none;font-family:" + VT + ";font-size:17px;letter-spacing:1px;color:#7dffae;padding:9px 8px;border:1px solid #2bd968;background:#0c2415;"}>[ GET IN TOUCH ]</a>
        </div>
        <div style=${"display:flex;gap:14px;justify-content:center;font-family:" + VT + ";font-size:16px;"}>
          <a href=${L.instagram} target="_blank" style="color:#3fcf78;">${"> INSTAGRAM"}</a>
          <a href=${L.dribbble} target="_blank" style="color:#3fcf78;">${"> DRIBBBLE"}</a>
          <a href=${L.linkedin} target="_blank" style="color:#3fcf78;">${"> LINKEDIN"}</a>
        </div>
      </div>`;
    }

    renderWorkList(workList, VT) {
      return html`
      <div style="padding:13px;display:flex;flex-direction:column;gap:9px;">
        <div style=${"font-family:" + VT + ";font-size:16px;color:#3fcf78;letter-spacing:1px;padding:2px 2px 4px;"}>${"> " + workList.length + " CASE FILES · TAP TO OPEN"}</div>
        ${workList.map((c) => html`
          <button key=${c.id} class="h-tile" onClick=${c.onSelect} style="display:flex;gap:11px;align-items:center;padding:8px;background:#04100a;border:1px solid #1c5a34;cursor:pointer;text-align:left;">
            <img src=${c.img} alt="" style="width:66px;height:46px;flex:0 0 auto;object-fit:cover;object-position:top;border:1px solid #14361f;background:#020a05;"/>
            <div style="flex:1;min-width:0;">
              <div style=${"font-family:" + VT + ";font-size:21px;color:#5dffa0;line-height:1;"}>${c.title}</div>
              <div style="font-size:11.5px;color:#7dcc8f;margin-top:3px;letter-spacing:.5px;">${c.category}</div>
            </div>
            <span style=${"font-family:" + VT + ";font-size:22px;color:#2bd968;flex:0 0 auto;"}>›</span>
          </button>`)}
      </div>`;
    }

    renderWorkDetail(aw, VT) {
      return html`
      <div style="padding:13px;display:flex;flex-direction:column;gap:11px;">
        <button class="h-fill" onClick=${() => this.setState({ workSel: null })} style=${"align-self:flex-start;background:transparent;border:1px solid #2bd968;color:#7dffae;font-family:" + VT + ";font-size:15px;padding:4px 11px;cursor:pointer;"}>‹ ALL FILES</button>
        <img src=${aw.img} alt="" style="width:100%;height:auto;display:block;border:1px solid #1c5a34;background:#020a05;"/>
        <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;">
          <span style=${"font-family:" + VT + ";font-size:27px;color:#5dffa0;letter-spacing:.5px;"}>${aw.title}</span>
          <span style=${"font-family:" + VT + ";font-size:14px;color:#04100a;background:#1aff80;padding:1px 9px;"}>${aw.category}</span>
        </div>
        <div style="font-size:13.5px;line-height:1.65;color:#9fffc0;">${aw.summary}</div>
        <div style=${"font-family:" + VT + ";font-size:14px;color:#3fcf78;letter-spacing:.5px;"}>${aw.tags}</div>
        <div style="display:flex;gap:9px;">
          <a class="h-fill" href=${aw.url} target="_blank" style=${"flex:1;text-align:center;text-decoration:none;font-family:" + VT + ";font-size:16px;letter-spacing:1px;color:#7dffae;padding:9px 8px;border:1px solid #2bd968;background:#0c2415;"}>[ VIEW ON DRIBBBLE ]</a>
          <a class="h-fill" href=${aw.inquire} style=${"flex:0 0 auto;text-align:center;text-decoration:none;font-family:" + VT + ";font-size:16px;letter-spacing:1px;color:#7dffae;padding:9px 14px;border:1px solid #2bd968;background:#0c2415;"}>[ INQUIRE ]</a>
        </div>
      </div>`;
    }

    renderServices(services, VT) {
      return html`
      <div style="padding:14px;display:flex;flex-direction:column;gap:11px;">
        <div style="font-size:13.5px;color:#9fffc0;border:1px solid #1c5a34;background:#04100a;padding:10px 12px;line-height:1.5;">${"> I help businesses transform ideas into digital experiences that delight users. Select a module to initialize."}</div>
        ${services.map((sv) => html`
          <div key=${sv.id} class="h-card" style="display:flex;gap:13px;align-items:center;border:1px solid #1c5a34;background:#04100a;padding:13px;">
            <img src=${sv.icon} alt="" style="width:46px;height:46px;flex:0 0 auto;"/>
            <div style="flex:1;min-width:0;">
              <div style=${"font-family:" + VT + ";font-size:22px;color:#5dffa0;letter-spacing:.5px;"}>${sv.name}</div>
              <div style="font-size:13px;color:#7dcc8f;line-height:1.45;margin-top:3px;">${sv.desc}</div>
            </div>
            <a class="h-fill" href=${sv.href} style=${"text-decoration:none;font-family:" + VT + ";font-size:16px;color:#7dffae;padding:6px 11px;flex:0 0 auto;border:1px solid #2bd968;background:#0c2415;"}>[ REQ ]</a>
          </div>`)}
      </div>`;
    }

    renderComms(VT) {
      return html`
      <div style="padding:14px;display:flex;flex-direction:column;gap:11px;">
        <div style=${"font-family:" + VT + ";font-size:16px;color:#3fcf78;letter-spacing:1px;"}>${"> DECRYPTED CLIENT TRANSMISSIONS"}</div>
        ${this.messages.map((m) => html`
          <div key=${m.id} style="border:1px solid #1c5a34;background:#04100a;padding:13px;display:flex;flex-direction:column;gap:9px;">
            <div style="display:flex;align-items:center;gap:11px;">
              <span style=${"flex:0 0 auto;width:40px;height:40px;display:grid;place-items:center;border:1px solid #2bd968;background:#0c2415;font-family:" + VT + ";font-size:19px;color:#1aff80;"}>${m.initials}</span>
              <div style="min-width:0;">
                <div style=${"font-family:" + VT + ";font-size:20px;color:#5dffa0;line-height:1;"}>${m.name}</div>
                <div style="font-size:11.5px;color:#7dcc8f;margin-top:3px;">${m.role}</div>
              </div>
            </div>
            <div style=${"font-family:" + VT + ";font-size:14px;color:#ffb000;letter-spacing:.5px;border-top:1px dotted #1c5a34;padding-top:8px;"}>${"RE: " + m.subject}</div>
            <div style="font-size:13.5px;line-height:1.6;color:#9fffc0;">${'"' + m.body + '"'}</div>
          </div>`)}
      </div>`;
    }

    renderMail(VT) {
      return html`
      <div style="padding:14px;display:flex;flex-direction:column;gap:12px;">
        <div style="border:1px solid #1c5a34;background:#04100a;padding:12px;">
          <div style=${"font-family:" + VT + ";font-size:19px;color:#5dffa0;letter-spacing:.5px;"}>${"> LET'S CREATE SOMETHING TOGETHER"}</div>
          <div style="font-size:12.5px;color:#3fcf78;margin-top:4px;line-height:1.5;">// I'd love to hear about your project. Replies within ~24h.</div>
          <div style=${"font-family:" + VT + ";font-size:14px;color:#1aff80;margin-top:7px;letter-spacing:.5px;"}>● ${EMAIL}</div>
        </div>
        <div style=${"display:flex;flex-direction:column;gap:10px;font-family:" + VT + ";"}>
          <input ref=${this.nameRef} placeholder=${"> YOUR NAME"} style="background:#04100a;border:1px solid #2bd968;padding:11px;color:#5dffa0;font-size:17px;letter-spacing:.5px;outline:none;"/>
          <input ref=${this.emailRef} placeholder=${"> YOUR EMAIL"} style="background:#04100a;border:1px solid #2bd968;padding:11px;color:#5dffa0;font-size:17px;letter-spacing:.5px;outline:none;"/>
          <textarea ref=${this.msgRef} placeholder=${"> begin transmission..."} style="height:130px;resize:none;background:#04100a;border:1px solid #2bd968;padding:11px;color:#5dffa0;font-size:16px;letter-spacing:.5px;outline:none;"></textarea>
          <button class="h-fill" onClick=${this.sendMail} style=${"font-family:" + VT + ";font-size:19px;letter-spacing:2px;color:#7dffae;padding:11px;cursor:pointer;border:1px solid #2bd968;background:#0c2415;"}>[ TRANSMIT ▸ ]</button>
        </div>
      </div>`;
    }

    renderRadio(ctx, VT) {
      const r = D.radio;
      const chIdx = this.state.radioCh || 0;
      const ch = r.channels[chIdx] || r.channels[0];
      const src = "https://open.spotify.com/embed/playlist/" + ch.playlist + "?utm_source=generator";
      return html`
      <div style="padding:14px;display:flex;flex-direction:column;gap:13px;">
        <div style="border:1px solid #1c5a34;background:#04100a;padding:14px;display:flex;flex-direction:column;gap:12px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <img src=${V + "vicon-radio.png"} alt="" style="width:38px;height:38px;flex:0 0 auto;"/>
            <div style="min-width:0;flex:1;">
              <div style=${"font-family:" + VT + ";font-size:24px;color:#5dffa0;letter-spacing:.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"}>${r.station}</div>
              <div style="font-size:12.5px;color:#7dcc8f;letter-spacing:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${"CH-0" + (chIdx + 1) + " // " + ch.freq + " · " + ch.label}</div>
            </div>
            <span style=${"display:flex;align-items:center;gap:5px;font-family:" + VT + ";font-size:13px;color:#1aff80;flex:0 0 auto;"}><span style="width:7px;height:7px;border-radius:50%;background:#1aff80;animation:mb-blink 1.6s steps(1) infinite;"></span>ON AIR</span>
          </div>
          <div style="display:flex;align-items:flex-end;gap:3px;height:40px;border:1px solid #1c5a34;padding:6px;background:#020a05;">
            ${Array.from({ length: 22 }, (_, i) => html`<span key=${i} style=${"flex:1;min-width:0;background:#1aff80;height:100%;transform-origin:bottom;animation:mb-eq .9s ease-in-out " + (i * 0.07).toFixed(2) + "s infinite;"}></span>`)}
          </div>
          <div style="border:1px solid #2bd968;background:#020a05;padding:4px;">
            <iframe title="Spotify" src=${src} width="100%" height="152" style="border:0;border-radius:6px;display:block;" frameborder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
          </div>
        </div>
        <div style="border:1px solid #1c5a34;background:#04100a;">
          <div style=${"padding:6px 11px;border-bottom:1px solid #1c5a34;font-family:" + VT + ";font-size:16px;color:#3fcf78;letter-spacing:1.5px;"}>▸ CHANNELS</div>
          ${r.channels.map((c, i) => html`
            <button key=${i} onClick=${() => this.setState({ radioCh: i })} style=${"display:flex;align-items:center;gap:9px;width:100%;padding:10px 11px;cursor:pointer;border:none;border-bottom:1px solid #102b1a;font-family:" + VT + ";font-size:18px;transition:all .13s ease;" + (i === chIdx ? "background:#1aff80;color:#04100a;" : "background:transparent;color:#7dffae;")}>
              <span style=${"width:58px;flex:0 0 auto;text-align:left;color:" + (i === chIdx ? "#04100a" : "#2c7a48") + ";"}>${c.freq}</span>
              <span style="flex:1;min-width:0;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:.5px;">${c.label}</span>
            </button>`)}
        </div>
        <div style=${"font-family:" + VT + ";font-size:13px;color:#2c7a48;letter-spacing:.5px;text-align:center;line-height:1.4;"}>CITY POP · STREAMING VIA SPOTIFY<br/>30s PREVIEW · FULL TRACKS WHEN SIGNED IN</div>
      </div>`;
    }

    renderTerminal(s, STM) {
      return html`
      <div style="height:100%;display:flex;flex-direction:column;background:#020a05;">
        <div ref=${this.termRef} style=${"flex:1;min-height:0;overflow:auto;padding:12px;font-family:" + STM + ";font-size:13px;line-height:1.55;"}>
          ${s.termHist.map((l, i) => html`<div key=${i} style=${"color:" + l.c + ";white-space:pre-wrap;word-break:break-word;"}>${l.t}</div>`)}
        </div>
        <div style="flex:0 0 auto;display:flex;align-items:center;gap:7px;border-top:1px solid #1c5a34;padding:9px 12px;background:#04100a;">
          <span style=${"color:#1aff80;font-family:" + STM + ";font-size:14px;"}>guest@hhx:~$</span>
          <input value=${s.termInput} onInput=${this.onTermInput} onKeyDown=${this.onTermKey} placeholder="type a command…" style=${"flex:1;background:transparent;border:none;outline:none;color:#5dffa0;font-family:" + STM + ";font-size:14px;"}/>
        </div>
      </div>`;
    }

    renderSystem(sys, VT) {
      const hdr = "padding:6px 11px;border-bottom:1px solid #1c5a34;font-family:" + VT + ";font-size:16px;color:#3fcf78;letter-spacing:1.5px;";
      const sect = "border:1px solid #1c5a34;background:#061a0e;";
      const label = "flex:0 0 94px;font-family:" + VT + ";font-size:17px;color:#7dcc8f;letter-spacing:.5px;";
      const valLbl = "font-family:" + VT + ";font-size:15px;color:#5dffa0;width:44px;text-align:right;";
      const rng = "flex:1;min-width:0;height:4px;accent-color:#1aff80;cursor:pointer;";
      return html`
      <div style="padding:14px;display:flex;flex-direction:column;gap:12px;">

        <div style=${sect}>
          <div style=${hdr}>▸ DISPLAY</div>
          <div style="padding:12px;display:flex;flex-direction:column;gap:13px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style=${label}>PHOSPHOR</span>
              <div style="display:flex;gap:6px;">
                <button onClick=${sys.setPhGreen} style=${sys.phGreenBtn}>GREEN</button>
                <button onClick=${sys.setPhAmber} style=${sys.phAmberBtn}>AMBER</button>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span style=${label}>SCANLINES</span>
              <button onClick=${sys.toggleScan} style=${sys.scanBtn}>${sys.scanLabel}</button>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span style=${label}>BRIGHTNESS</span>
              <input type="range" min="60" max="130" value=${sys.uiBright} onInput=${sys.onBright} style=${rng}/>
              <span style=${valLbl}>${sys.uiBrightLbl}</span>
            </div>
          </div>
        </div>

        <div style=${sect}>
          <div style=${hdr}>▸ AUDIO</div>
          <div style="padding:12px;display:flex;align-items:center;gap:10px;">
            <span style=${label}>VOLUME</span>
            <input type="range" min="0" max="100" value=${sys.uiVol} onInput=${sys.onVol} style=${rng}/>
            <span style=${valLbl}>${sys.uiVolLbl}</span>
          </div>
        </div>

        <div style=${sect}>
          <div style=${hdr}>▸ TIME</div>
          <div style="padding:12px;display:flex;align-items:center;gap:8px;">
            <span style=${label}>CLOCK</span>
            <button onClick=${sys.toggle24} style=${sys.clk12Btn}>12H</button>
            <button onClick=${sys.toggle24} style=${sys.clk24Btn}>24H</button>
          </div>
        </div>

        <div style=${sect}>
          <div style=${hdr}>▸ SYSTEM INFORMATION</div>
          <div style="padding:12px;display:flex;flex-direction:column;gap:7px;">
            ${sys.sysInfo.map((si, i) => html`
              <div key=${i} style="display:flex;justify-content:space-between;gap:8px;border-bottom:1px dotted #14361f;padding-bottom:5px;">
                <span style=${"font-family:" + VT + ";font-size:16px;color:#3fcf78;letter-spacing:.5px;"}>${si.k}</span>
                <span style=${"font-family:" + VT + ";font-size:16px;color:#9fffc0;text-align:right;"}>${si.v}</span>
              </div>`)}
          </div>
          <div style="padding:0 12px 13px;display:flex;flex-direction:column;gap:5px;">
            <div style=${"display:flex;justify-content:space-between;font-family:" + VT + ";font-size:15px;color:#3fcf78;letter-spacing:.5px;"}><span>MEMORY</span><span>${sys.memLbl}</span></div>
            <div style="height:11px;border:1px solid #1c5a34;background:#020a05;"><div style=${sys.memBarStyle}></div></div>
          </div>
        </div>

        <button class="h-fill" onClick=${sys.onReboot} style=${"font-family:" + VT + ";font-size:18px;letter-spacing:2px;color:#7dffae;padding:11px;cursor:pointer;border:1px solid #2bd968;background:#0c2415;"}>[ REBOOT SYSTEM ]</button>
      </div>`;
    }
  }

  window.HHX_Mobile = HhxMobile;
})();
