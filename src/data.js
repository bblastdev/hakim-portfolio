/* ============================================================================
 * HHX-OS — content data
 * Ported verbatim from the "HHX-OS Terminal" design (Claude Design handoff).
 * Exposed as a global so the classic <script> in app.js can read it without
 * an ES-module/CORS step (works straight off the filesystem and any host).
 * ==========================================================================*/
(function () {
  "use strict";

  var V = "assets/vault/";

  window.HHX_DATA = {
    vaultDir: V,

    iconFor: {
      mycomputer: V + "vicon-mycomputer.png",
      about: V + "vavatar.png",
      work: V + "vicon-work.png",
      services: V + "vicon-blocks.png",
      testimonials: V + "vicon-testimonials.png",
      mail: V + "vicon-envelope.png",
      music: V + "vicon-radio.png",
      terminal: V + "vicon-terminal.png",
      recycle: V + "vicon-trash.png",
      avatar: V + "vavatar.png",
    },

    titles: {
      mycomputer: "SYSTEM SETTINGS",
      about: "PERSONNEL FILE",
      work: "PROJECT ARCHIVE",
      services: "SERVICE MODULES",
      testimonials: "INTERCEPTED TRANSMISSIONS",
      mail: "OUTGOING TRANSMISSION",
      music: "AUDIO MODULE",
      terminal: "TERMINAL",
      recycle: "DISPOSAL UNIT",
    },

    // [width, height] in stage (960x768) coordinates
    sizes: {
      mycomputer: [564, 500],
      about: [620, 610],
      work: [780, 580],
      services: [640, 540],
      testimonials: [690, 470],
      mail: [600, 580],
      music: [460, 450],
      terminal: [690, 470],
      recycle: [460, 300],
    },

    desktopOrder: [
      "mycomputer", "about", "work", "services",
      "testimonials", "mail", "music", "terminal", "recycle",
    ],

    deskLabels: {
      mycomputer: "SYSTEM", about: "PERSONNEL", work: "ARCHIVE",
      services: "MODULES", testimonials: "COMMS", mail: "TRANSMIT",
      music: "RADIO", terminal: "TERMINAL", recycle: "DISPOSAL",
    },

    // Label shown under each desktop icon (differs slightly from deskLabels)
    iconLabels: {
      mycomputer: "SYSTEM", about: "PERSONNEL", work: "WORK",
      services: "MODULES", testimonials: "COMMS", mail: "TRANSMIT",
      music: "RADIO", terminal: "TERMINAL", recycle: "DISPOSAL",
    },

    serviceList: [
      { id: "web",  name: "WEBSITE DESIGN",    icon: V + "vicon-web.png",
        desc: "Creating stunning websites that captivate your audience and reflect your brand." },
      { id: "app",  name: "MOBILE APP DESIGN", icon: V + "vicon-mobile.png",
        desc: "Designing intuitive mobile apps with seamless interactions and engaging visuals." },
      { id: "saas", name: "SAAS DESIGN",       icon: V + "vicon-saas.png",
        desc: "Building user-friendly SaaS dashboards that simplify workflows and look great." },
    ],

    messages: [
      { id: 0, name: "JOSH DYLAN",      role: "Product Owner",         subject: "CREATIVE UI DESIGNER", initials: "JD",
        body: "Hakim is a professional and very talented UI designer and you will be so happy to work with him!" },
      { id: 1, name: "NACIIMA MOHAMED", role: "CEO of Agate Health",   subject: "UI/UX MOBILE DESIGN",  initials: "NM",
        body: "Hakim stands out as a great designer with an amazing ability to blend aesthetics with functionality." },
      { id: 2, name: "DAYMEON DAY",     role: "Product Owner",         subject: "UI/UX MOBILE DESIGN",  initials: "DD",
        body: "Working with Hakim has been really amazing! He adhered to our time frame, ensuring that we stayed on track and met our deadlines." },
    ],

    workCases: [
      { id: "starflow", title: "Starflow", category: "SaaS Dashboard", img: "assets/work/starflow.png",
        summary: "A clean, data-dense project-management dashboard — grid & board views, progress tracking, and task management built for fast scanning and focus.",
        tags: "# saas   # dashboard   # task mgmt   # web app",
        url: "https://dribbble.com/shots/27102338-Starflow-Project-Page" },
      { id: "booman", title: "Booman", category: "AI Product", img: "assets/work/booman.png",
        summary: "An AI chat product spanning web and mobile — a modern dark interface with a focused conversation flow and a marketing homepage to match.",
        tags: "# ai   # chat   # dark ui   # web + mobile",
        url: "https://dribbble.com/shots/26890526-Booman-Web-AI-Homepage" },
      { id: "interna", title: "Interna", category: "AI Website", img: "assets/work/interna.png",
        summary: "A futuristic, minimalist hero exploration for an AI platform — bold type, depth, and a confident dark aesthetic that signals innovation.",
        tags: "# ai   # landing   # hero   # dark",
        url: "https://dribbble.com/shots/26955936-Interna-AI-Website-Hero-Exploration" },
      { id: "caletra", title: "Caletra", category: "SaaS Dashboard", img: "assets/work/caletra.png",
        summary: "A request-management dashboard with built-in messaging, inbox, and invoicing — turning a messy workflow into a calm, organized hub.",
        tags: "# saas   # inbox   # messaging   # invoicing",
        url: "https://dribbble.com/shots/26645901-Caletra-Request-Management-Dashboard" },
      { id: "galacta", title: "Galacta", category: "Fintech · Mobile", img: "assets/work/galacta.png",
        summary: "A finance & banking mobile app — transfers, transactions, and balances wrapped in a warm, characterful retro UI that still feels trustworthy.",
        tags: "# fintech   # mobile   # banking   # transactions",
        url: "https://dribbble.com/shots/26450314-Galacta-Finance-App" },
      { id: "eston", title: "Eston", category: "Landing Page", img: "assets/work/eston.png",
        summary: "An expedition landing page — immersive imagery, liquid-glass UI, and a reservation flow designed to turn wanderlust into bookings.",
        tags: "# landing   # travel   # liquid glass   # web",
        url: "https://dribbble.com/shots/26317073-Eston-Expedition-Landing-Page" },
      { id: "helio", title: "Helio", category: "AI Website", img: "https://cdn.dribbble.com/userupload/45134258/file/3ad70fe863ba21722def7ef5148b2ea8.png?resize=800x0",
        summary: "A futuristic AI landing hero — an animated ASCII orb, deep dark UI, and confident minimalist type that signals next-gen tech.",
        tags: "# ai   # landing   # dark   # hero",
        url: "https://dribbble.com/shots/26596730-Helio-AI-Website-Hero-Exploration" },
      { id: "unova", title: "Unova", category: "Landing Page", img: "https://cdn.dribbble.com/userupload/46017678/file/6c5e2ff29bd6f80affed0f79bb573b46.png?resize=800x0",
        summary: "A bold road-bike shop hero — strong product imagery, clean type, and a punchy storefront feel built to convert.",
        tags: "# landing   # ecommerce   # product   # web",
        url: "https://dribbble.com/shots/26870220-Unova-Road-Bike-Shop-Hero-Landing-Page" },
      { id: "elixr", title: "Elixr", category: "Wellness · Web", img: "https://cdn.dribbble.com/userupload/45934361/file/21bc1e7b635d25d147a480a77cce0f2d.png?resize=800x0",
        summary: "A wellness brand landing — calm layout, a subscription flow, and clean product storytelling for health & skincare.",
        tags: "# landing   # wellness   # subscription   # web",
        url: "https://dribbble.com/shots/26844323-Elixr-Wellness-Landing-Page" },
      { id: "cartex", title: "Cartex", category: "Dashboard", img: "https://cdn.dribbble.com/userupload/44855487/file/d595bb2201a3aad84e4f1f29455467d3.png?resize=800x0",
        summary: "A car-racing telemetry dashboard — speed, RPM, fuel and battery readouts laid out for fast, glanceable monitoring.",
        tags: "# dashboard   # automotive   # data viz   # web",
        url: "https://dribbble.com/shots/26508544-Car-Racing-Dashboard-Cartex" },
      { id: "cryptopay", title: "CryptoPay", category: "Fintech · Mobile", img: "https://cdn.dribbble.com/userupload/44949736/file/1b5b7ca9d9a124474f6e0a85117ad609.png?resize=800x0",
        summary: "A crypto payment flow — wallet connect, checkout and a clean paywall across light and dark modes.",
        tags: "# fintech   # crypto   # mobile   # payments",
        url: "https://dribbble.com/shots/26538084-Payment-Summary-Page-CryptoPay" },
      { id: "themon", title: "Themon", category: "Web3 Dashboard", img: "https://cdn.dribbble.com/userupload/44564564/file/7ea7e964e9983e6f203984bcfe6527eb.png?resize=800x0",
        summary: "A crypto portfolio dashboard — holdings, coins and finance metrics in a dark, futuristic web3 interface.",
        tags: "# web3   # crypto   # dashboard   # finance",
        url: "https://dribbble.com/shots/26419198-Themon-Crypto-Portfolio-Dashboard" },
      { id: "vera", title: "Vera", category: "AI Website", img: "https://cdn.dribbble.com/userupload/44759744/file/265c02d3598735e3030be3249cac1171.png?resize=800x0",
        summary: "An AI meditation landing page — a soft glowing orb hero and a calm, mindful layout above the fold.",
        tags: "# ai   # landing   # wellness   # web",
        url: "https://dribbble.com/shots/26478980-AI-Meditation-Website-Vera" },
      { id: "batdrip", title: "BATDRIP", category: "Landing Page", img: "https://cdn.dribbble.com/userupload/44467938/file/ab1aff8f328ea4302566ee98e48de184.png?resize=800x0",
        summary: "A techwear fashion landing — bold dark aesthetic, a cinematic hero, and product-forward storytelling.",
        tags: "# landing   # fashion   # dark   # web",
        url: "https://dribbble.com/shots/26390359-BATDRIP-Techwear-Landing-Page" },
    ],

    tracks: [
      { title: "TERMINAL STATIC",   artist: "CH-01 // 108.3", len: 184 },
      { title: "ATOMIC LOUNGE",     artist: "CH-02 // 95.7",  len: 213 },
      { title: "DEADLINE (LO-FI)",  artist: "CH-03 // 101.1", len: 167 },
      { title: "SHIP IT",           artist: "CH-04 // 88.9",  len: 201 },
    ],

    // Capability bars (HHX-OS Mobile "PERSONNEL" screen)
    stats: [
      { k: "DESIGN", v: 9 }, { k: "RESEARCH", v: 8 }, { k: "VISUAL", v: 9 },
      { k: "SYSTEMS", v: 7 }, { k: "VELOCITY", v: 8 }, { k: "TASTE", v: 10 },
    ],

    bootLines: [
      { text: "HAKIM-HAIMAN INDUSTRIES (HHX)",          color: "#ffb000" },
      { text: "UNIFIED OPERATING SYSTEM // TERMLINK",    color: "#ffb000" },
      { text: "BUILD 2.2.2287   (C) HHX TERMLINK",       color: "#2c7a48" },
      { text: "",                                        color: "#41ff83" },
      { text: "INITIATE BOOT SEQUENCE ........... [OK]",  color: "#41ff83" },
      { text: "SCANNING PERIPHERALS ............. [OK]",  color: "#41ff83" },
      { text: "LOADING DESIGN SUBROUTINES ....... [OK]",  color: "#41ff83" },
      { text: "MOUNTING /PORTFOLIO .............. [OK]",   color: "#41ff83" },
      { text: "ESTABLISHING UPLINK .............. [OK]",   color: "#41ff83" },
      { text: "",                                        color: "#41ff83" },
      { text: "> RUN HHXOS.EXE",                         color: "#5dffa0" },
    ],

    links: {
      email: "mohamadhakim56z@gmail.com",
      dribbble: "https://dribbble.com/mochamadhakim",
      instagram: "https://www.instagram.com/hakimhn_",
      linkedin: "https://www.linkedin.com/in/mochamadhakim/",
      x: "https://x.com/",
    },

    // HHX-OS Radio — real music streamed via official Spotify embeds (Spotify
    // handles licensing; we never host the audio). Each channel: `type` is one
    // of "playlist" | "album" | "track", and `id` is the Spotify ID from a
    // share/embed link. Swap any to retune a channel.
    radio: {
      station: "TOKYO NIGHT FM",
      channels: [
        { label: "CITY POP '80s", freq: "108.3", type: "playlist", id: "37i9dQZF1DWW28hvtiO3j9" },
        { label: "FRANK SINATRA", freq: "98.6",  type: "album",    id: "3i67sGIVw8EBlgfSRv3Lj2" },
        { label: "LAUFEY",        freq: "103.7", type: "album",    id: "0Ydm84ftyiWRGOIFkdl30L" },
      ],
    },
  };
})();
