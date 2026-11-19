(() => {
  const FILES = window.FILES || {};
  const MOCKUPS = {};
  Object.entries(window.MOCKUPS || {}).forEach(([k, v]) => { MOCKUPS[k.normalize('NFC')] = v; });
  const VI = window.I18N_VI || {};
  const UI = window.I18N_UI || { en: {}, vi: {} };
  const SEC = window.I18N_SECTIONS || {};
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover)').matches;

  /* ---------- Language ---------- */
  let lang = 'en';
  try { lang = localStorage.getItem('lang') || ''; } catch (e) { lang = ''; }
  const qp = new URLSearchParams(location.search).get('lang');
  if (qp === 'vi' || qp === 'en') lang = qp;
  if (lang !== 'vi' && lang !== 'en') lang = (navigator.language || '').toLowerCase().startsWith('vi') ? 'vi' : 'en';
  const ui = () => UI[lang] || UI.en;
  const secText = (name) => (SEC[name] && SEC[name][lang]) || (SEC[name] && SEC[name].en) || { name, desc: '' };

  // Shared nav points at index.html#…; on the home page itself keep those jumps in-page
  if (document.getElementById('about-me')) {
    document.querySelectorAll('a[href^="index.html#"]').forEach((l) => l.setAttribute('href', l.getAttribute('href').slice(10)));
  }

  /* ---------- Per-section settings ---------- */
  const META = {
    'Graphic': { cover: 'Graphic/818206114_1712093213641779_1413620957470381591_n.jpg' }, // MMA Smarties 2026 shortlist
    'Motion': {
      cover: 'Motion/Samsung_Galaxy Fold 5.mp4',
      noGroup: true, // every video stands on its own
      // Display order: big brands and most complex pieces first. Anything not listed follows in folder order.
      order: [
        /^coke_bàn ăn/,             // Coca-Cola
        /^doc_2026-11-04_22-16-30/, // Coca-Cola Tết
        /^doc_2026-11-04_22-20-02/, // Grab — Du hí Phải thử
        /^vinhomes_đô thị biển/,    // Vinhomes
        /^vinhomes ocean park/,     // Vinhomes
        /^samsung/,                 // Samsung
        /^awing_mcd_educate/,       // McDonald's
        /^cgv_liên minh/,           // CGV
        /^cgv_bóng đè/,             // CGV
        /^doc_2026-11-04_22-18-56/, // Garnier
        /^sprite/,                  // Sprite
        /^philips/,                 // Philips
        /^doc_2026-11-04_22-16-21/, // Sacombank
        /^doc_2026-11-04_22-15-53/, // Sacombank
        /^sg bia/,                  // Bia Saigon
        /^doc_2026-11-04_22-17-31/, // motorbike
        /^awing_introduction_mma/,  // MMA Innovate film
        /^kỷ lục 6s/,
        /^napas/,
        /^mik/,
        /^doc_2026-11-04_22-17-51/, // real estate
        /^doc_2026-11-04_22-19-35/, // Espoke
        /^doc_2026-11-04_22-19-09/, // SmartBIZ
        /^nutriboost/,
        /^hảo hảo/,
        /^rockstar/,
        /^postnghesi/,
        /^ex2/,
        /^vietravel/,
        /^vmf_axn/,
        /^vn plane window/,
      ],
    },
    'Packaging & Event Assets': {
      cover: 'assets/mockups/lixi-2025-cards.jpg', // Happy New Year 2025 cards
      order: [/ny gift_box/, /file explorer|^quà tết-/, /2025_printed/, /^card 2024/, /mma booth/, /^backdrop$/, /banner lcd/, /2023_v1/, /^standee/, /^brochure/],
    },
  };

  /* ---------- Grouping ----------
     Files are grouped automatically when their names only differ by a sequence number,
     version, "view N" or a leading "1_ 2_ 3_" step, or are Facebook exports from the same post.
     Add a line to MANUAL_GROUPS to group files whose names don't match. */
  const MANUAL_GROUPS = [
    // Weather-based ads campaign (teaser → real-time weather ads → beverage → formats → cosmetics)
    [/^774042625_/, /^777327862_/, /^777988242_/, /^798182040_/, /^798182041_/, /^798664154_/],
    [/ny gift_box/, /ny gift_sticker/],
    [/file explorer/, /^quà tết-/],                 // Tết 2027 goat gift set: photos + dielines
    [/^backdrop$/, /^thư mời awing/],                // AWING × NTT e-Asia signing ceremony
    [/aca seminar_banner lcd/, /aca seminar_brochure/], // ACA seminar: LCD banner + brochure
    [/^card 2024$/, /^envelop$/],
  ];

  // Files kept in the folders but not shown on the site
  const EXCLUDE = [
    /^gieoque$/, // "mèo hướng nội" cat graphic
  ];

  const nfc = (s) => s.normalize('NFC');
  const CAPS = window.CAPTIONS || [];
  const capText = (cap) => cap ? { client: cap.client, title: cap[lang] || cap.en } : null;
  const baseName = (p) => nfc(p.split('/').pop().replace(/\.[^.]+$/, '')).toLowerCase().trim();
  const isVideo = (p) => /\.(mp4|webm|mov)$/i.test(p);
  const URLMAP = window.URLMAP || {}; // online build: original path → published path
  const url = (p) => URLMAP[p.normalize('NFC')] || encodeURI(p);
  const pad = (n) => String(n).padStart(2, '0');
  const escA = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const bi = (o) => `data-en="${escA(o.en)}" data-vi="${escA(o.vi || o.en)}"`; // text filled per language by fillBi()
  const fillBi = (root) => (root || document).querySelectorAll('[data-en]').forEach((n) => { n.textContent = (lang === 'vi' && n.dataset.vi) || n.dataset.en; });
  const slug = (s) => 'cat-' + nfc(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  function groupKey(path) {
    const b = baseName(path);
    for (let g = 0; g < MANUAL_GROUPS.length; g++) {
      if (MANUAL_GROUPS[g].some((re) => re.test(b))) return 'manual:' + g;
    }
    if (/^\d{1,2}_/.test(b)) return 'seq';
    if (/\s*\(\d+\)$/.test(b)) return groupKey(b.replace(/\s*\(\d+\)$/, '')); // "name (2)" copies belong with "name"
    const fb = b.match(/^(\d{6,})_\d+_\d+_n$/);
    if (fb) return 'fb:' + Math.floor(+fb[1] / 10);
    if (/\d{1,2}[-_.]\d{2}[-_.]\d{2}$/.test(b)) return b;
    return b
      .replace(/_v\d+(\.\d+)*/g, '')
      .replace(/printed version|mock-?up|mockuo/g, '')
      .replace(/view\s*[\d.]+/g, '')
      .replace(/[\s_\-()]+/g, ' ').trim()
      .replace(/\s\d{1,2}$/, '').trim();
  }

  const data = Object.keys(FILES).map((name) => {
    const meta = META[name] || {};
    const map = new Map();
    FILES[name].filter((f) => !EXCLUDE.some((re) => re.test(baseName(f)))).forEach((f, i) => {
      const k = meta.noGroup ? 'f' + i : groupKey(f);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(f);
    });
    // Inside a group, "name" comes before "name (2)", "name (3)"…
    const copyNo = (f) => { const m = baseName(f).match(/\((\d+)\)$/); return m ? +m[1] : 0; };
    let units = [...map.values()].map((u) => u.slice().sort((a, b) => copyNo(a) - copyNo(b)));
    if (meta.order) {
      const rank = (files) => {
        const b = baseName(files[0]);
        const i = meta.order.findIndex((re) => re.test(b));
        return i < 0 ? meta.order.length : i;
      };
      units = units.map((u, i) => ({ u, i, r: rank(u) })).sort((a, b) => a.r - b.r || a.i - b.i).map((x) => x.u);
    }
    // Generated mockups: the tile shows the mockup(s); the viewer shows mockups, then the original artwork
    units = units.map((files) => {
      const mocks = [...new Set(files.flatMap((f) => MOCKUPS[nfc(f)] || []))];
      const cap = CAPS.find((c) => files.some((f) => c.re.test(baseName(f))));
      return { files, show: mocks.length ? mocks : files, view: [...mocks, ...files], cap };
    });
    const flat = [];
    units.forEach((u, ui) => u.view.forEach((src, fi) => flat.push({ src, ui, fi, size: u.view.length })));
    return { name, id: slug(name), cover: meta.cover, units, flat };
  });

  /* ---------- Render ---------- */
  const listEl = document.getElementById('cat-list');
  const catsEl = document.getElementById('categories');
  const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg>';
  const CHEV = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

  // Poster frames (assets/posters/<video name>.jpg) so video tiles never show as black boxes
  const posterOf = (src) => encodeURI('assets/posters/' + nfc(src.split('/').pop().replace(/\.[^.]+$/, '')) + '.jpg');
  const mediaHTML = (src, alt) => isVideo(src)
    ? `<video muted loop playsinline preload="none" data-src="${url(src)}" data-poster="${posterOf(src)}" aria-hidden="true"></video>`
    : `<img src="${url(src)}" alt="${alt}" loading="lazy" decoding="async">`;

  // A horizontal reel of motion pieces that scrolls on its own; items are rendered twice for a seamless loop.
  // Videos load and play only while they are on screen.
  const capOf = (src) => CAPS.find((c) => c.re.test(baseName(src)));
  const reelHTML = (items, cls) => {
    const set = (dup) => items.map((it) => {
      const v = isVideo(it.src)
        ? `<video muted loop playsinline preload="none" data-reel-src="${url(it.src)}" poster="${posterOf(it.src)}"></video>`
        : `<img src="${url(it.src)}" alt="" loading="lazy" decoding="async">`;
      const media = cls === 'is-phones'
        ? `<span class="rp-phone"><span class="rp-screen"><span class="rp-bar"><span>Free Wi-Fi</span><span>AWING</span></span>${v}<span class="rp-cta">Kết nối Wi-Fi miễn phí</span><span class="rp-ads">Ads by AWING</span></span></span>`
        : `<span class="reel-media">${v}</span>`;
      return `<button type="button" class="reel-item ${it.cls || ''}" ${it.attrs}${dup ? ' aria-hidden="true" tabindex="-1"' : ''}>${media}<span class="tile-cap"><span class="tile-client">${it.client || ''}</span><span class="tile-title"></span></span></button>`;
    }).join('');
    return `<div class="reel ${cls}" style="--n:${items.length}"><div class="reel-track">${set(false)}${set(true)}</div></div>`;
  };

  if (listEl && catsEl) data.forEach((c, ci) => {
    const li = document.createElement('li');
    li.innerHTML = `<a href="#${c.id}" data-ci="${ci}"><span class="cat-name"></span><sup class="c">${pad(c.units.length)}</sup></a>`;
    listEl.appendChild(li);

    const sec = document.createElement('section');
    sec.className = 'cat';
    sec.id = c.id;
    sec.dataset.ci = ci;
    sec.setAttribute('aria-labelledby', c.id + '-t');
    sec.innerHTML = `
      <header class="cat-head">
        <span class="cat-no">${pad(ci + 1)} /</span>
        <div><h3 class="cat-title" id="${c.id}-t"></h3><p class="cat-desc"></p></div>
        <span class="cat-count"></span>
      </header>
      ${/motion/i.test(c.name) ? '<div class="reel-slot"></div>' : `<div class="grid-wrap is-collapsed" id="${c.id}-grid">
        <div class="grid"></div>
      </div>
      <div class="cat-more" hidden>
        <button type="button" class="btn btn-outline" aria-expanded="false" aria-controls="${c.id}-grid">
          <span class="lbl"></span>${CHEV}</button>
      </div>`}`;
    const grid = sec.querySelector('.grid');
    if (!grid) {
      // Motion: every spot plays inside a phone, as one continuous horizontal chain
      let st = 0;
      const items = c.units.map((unit, ui) => {
        const it = { src: unit.show[0], cls: 'tile', attrs: `data-ci="${ci}" data-ui="${ui}" data-start="${st}"`, client: unit.cap ? unit.cap.client : '' };
        st += unit.view.length;
        return it;
      });
      sec.querySelector('.reel-slot').outerHTML = reelHTML(items, 'is-phones') + '<p class="reel-hint" data-i18n="reel.hint">Hover to pause, click to watch</p>';
      catsEl.appendChild(sec);
      return;
    }

    let start = 0;
    c.units.forEach((unit, ui) => {
      const u = unit.show;
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.ci = ci;
      b.dataset.ui = ui;
      b.dataset.start = start;
      start += unit.view.length;
      if (u.length === 1) {
        const src = u[0];
        b.className = 'tile';
        b.innerHTML = `<div class="tile-media">${mediaHTML(src, '')}${isVideo(src) ? `<span class="tile-play">${PLAY}<span class="play-lbl"></span></span>` : ''}</div>`;
      } else {
        // Group: first piece full-size, the rest as small thumbnails stacked in the bottom-right corner
        const rest = u.slice(1, 4);
        const extra = u.length - 1 - rest.length;
        b.className = 'tile is-group';
        b.innerHTML = `<div class="tile-media">${mediaHTML(u[0], '')}
          <span class="tile-stack" aria-hidden="true">${rest.map((src, i) => `<span class="thumb">${mediaHTML(src, '')}${i === rest.length - 1 && extra > 0 ? `<span class="thumb-more">+${extra}</span>` : ''}</span>`).join('')}</span>
          <span class="tile-count" aria-hidden="true">${u.length}</span></div>`;
      }
      if (unit.cap) b.insertAdjacentHTML('beforeend', '<span class="tile-cap"><span class="tile-client"></span><span class="tile-title"></span></span>');
      grid.appendChild(b);
    });
    catsEl.appendChild(sec);
  });

  const workCount = document.getElementById('work-count');
  if (workCount) workCount.textContent = pad(data.reduce((n, c) => n + c.units.length, 0));
  const casesCount = document.getElementById('cases-count');
  if (casesCount) casesCount.textContent = pad((window.CASES || []).length);

  /* ---------- Collapsible sections ---------- */
  const COLLAPSED = () => Math.round(Math.min(860, Math.max(560, innerHeight * 0.9)));
  document.querySelectorAll('#categories > .cat').forEach((sec) => {
    const wrap = sec.querySelector('.grid-wrap');
    if (!wrap) return;
    const more = sec.querySelector('.cat-more');
    const btn = more.querySelector('button');
    const sync = () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      const needs = wrap.firstElementChild.offsetHeight > COLLAPSED() + 120;
      more.hidden = !needs;
      if (expanded) { wrap.style.maxHeight = 'none'; return; }
      wrap.classList.toggle('is-collapsed', needs);
      wrap.style.maxHeight = needs ? COLLAPSED() + 'px' : '';
    };
    sync(); // collapse right away so anything below (and #hash jumps) sees the final layout
    new ResizeObserver(sync).observe(wrap.firstElementChild);
    addEventListener('resize', sync);

    btn.addEventListener('click', () => {
      wrap.classList.add('is-ready'); // animate only when someone expands or collapses, not on first layout
      const open = btn.getAttribute('aria-expanded') === 'true';
      if (!open) {
        wrap.style.maxHeight = wrap.scrollHeight + 'px';
        wrap.classList.remove('is-collapsed');
        btn.setAttribute('aria-expanded', 'true');
        const release = () => { if (btn.getAttribute('aria-expanded') === 'true') wrap.style.maxHeight = 'none'; };
        wrap.addEventListener('transitionend', release, { once: true });
        setTimeout(release, 700); // in case no transition runs
      } else {
        wrap.style.maxHeight = wrap.scrollHeight + 'px';
        void wrap.offsetHeight; // commit the start height so the collapse animates
        wrap.classList.add('is-collapsed');
        wrap.style.maxHeight = COLLAPSED() + 'px';
        btn.setAttribute('aria-expanded', 'false');
        sec.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }
      updateMoreLabel(sec);
    });
  });
  function updateMoreLabel(sec) {
    const c = data[+sec.dataset.ci];
    const btn = sec.querySelector('.cat-more button');
    if (!btn) return;
    btn.querySelector('.lbl').textContent = btn.getAttribute('aria-expanded') === 'true' ? ui().collapse : ui().showAll(c.units.length);
  }

  /* ---------- Feature card ---------- */
  const feature = document.getElementById('feature');
  const fNo = document.getElementById('feature-no');
  const fTitle = document.getElementById('feature-title');
  const fDesc = document.getElementById('feature-desc');
  const fMedia = document.getElementById('feature-media');
  const catLinks = listEl ? [...listEl.querySelectorAll('a')] : [];
  let featureCi = 0;

  function setFeature(ci, force) {
    const c = data[ci];
    const t = secText(c.name);
    fNo.textContent = pad(ci + 1) + ' /';
    fTitle.textContent = t.name;
    fDesc.textContent = t.desc;
    feature.href = '#' + c.id;
    if (ci !== featureCi || force) {
      const cover = c.flat.find((i) => c.cover && nfc(i.src) === nfc(c.cover)) || c.flat[0];
      fMedia.innerHTML = isVideo(cover.src)
        ? `<video src="${url(cover.src)}" muted loop playsinline ${reduceMotion ? 'preload="metadata"' : 'autoplay'} aria-hidden="true"></video>`
        : `<img src="${url(cover.src)}" alt="" aria-hidden="true">`;
    }
    featureCi = ci;
    catLinks.forEach((a, i) => a.classList.toggle('is-active', i === ci));
  }
  catLinks.forEach((a) => {
    const ci = +a.dataset.ci;
    a.addEventListener('mouseenter', () => setFeature(ci));
    a.addEventListener('focus', () => setFeature(ci));
  });

  /* ---------- UI/UX showcases: prototype screens in a phone mockup ---------- */
  const SHOW = window.SHOWCASES || [];
  const showEl = document.getElementById('showcases');
  const players = [];
  const ARROW_L = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  const ARROW_R = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  const EXT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';
  SHOW.forEach((s, si) => {
    const shots = Array.from({ length: s.count }, (_, i) => `${s.folder}/${s.prefix}-${pad(i + 1)}.png`);
    const el = document.createElement('article');
    el.className = 'showcase' + (si % 2 ? ' is-flip' : '');
    el.innerHTML = `
      <div class="sc-copy">
        <p class="sc-no">${pad(si + 1)}</p>
        <h4 class="sc-title"></h4>
        <p class="sc-desc"></p>
        <ul class="sc-tags">${s.tags.map((t) => `<li>${t}</li>`).join('')}</ul>
        <ol class="sc-steps"></ol>
        <a class="btn btn-ink sc-figma" href="${s.figma}" target="_blank" rel="noopener"><span class="lbl"></span>${EXT}</a>
      </div>
      <div class="sc-stage">
        <div class="phone" role="group" aria-roledescription="carousel">
          <span class="phone-btn b1" aria-hidden="true"></span><span class="phone-btn b2" aria-hidden="true"></span><span class="phone-btn b3" aria-hidden="true"></span>
          <div class="phone-screen">
            ${shots.map((src, i) => `<img src="${url(src)}" alt="" loading="lazy" decoding="async" class="${i === 0 ? 'is-on' : ''}">`).join('')}
            <span class="phone-island" aria-hidden="true"></span>
          </div>
        </div>
        <div class="sc-controls">
          <button type="button" class="lb-btn sc-prev" aria-label="Previous screen">${ARROW_L}</button>
          <span class="sc-count"><b>01</b> / ${pad(s.count)}</span>
          <button type="button" class="lb-btn sc-next" aria-label="Next screen">${ARROW_R}</button>
        </div>
      </div>`;
    showEl.appendChild(el);

    const imgs = [...el.querySelectorAll('.phone-screen img')];
    const counter = el.querySelector('.sc-count b');
    let idx = 0, timer = 0, hover = false;
    const go = (i) => {
      idx = (i + s.count) % s.count;
      imgs.forEach((im, k) => im.classList.toggle('is-on', k === idx));
      el.querySelectorAll('.sc-steps li').forEach((li, k) => li.classList.toggle('is-on', k === idx));
      counter.textContent = pad(idx + 1);
    };
    const tick = () => { if (!hover) go(idx + 1); };
    const start = () => { if (!reduceMotion && !timer) timer = setInterval(tick, 2600); };
    const stop = () => { clearInterval(timer); timer = 0; };
    el.querySelector('.sc-prev').addEventListener('click', () => { go(idx - 1); stop(); start(); });
    el.querySelector('.sc-next').addEventListener('click', () => { go(idx + 1); stop(); start(); });
    el.addEventListener('mouseenter', () => { hover = true; });
    el.addEventListener('mouseleave', () => { hover = false; });
    // play only while on screen
    new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? start() : stop())), { threshold: 0.25 }).observe(el);
    players.push({ s, el, go, get idx() { return idx; } });
  });

  function renderShowcaseText() {
    players.forEach((p) => {
      const t = p.s[lang] || p.s.en;
      p.el.querySelector('.sc-title').textContent = t.title;
      p.el.querySelector('.sc-desc').textContent = t.desc;
      p.el.querySelector('.sc-figma .lbl').textContent = lang === 'vi' ? 'Xem trên Figma' : 'View in Figma';
      const ol = p.el.querySelector('.sc-steps');
      ol.innerHTML = t.steps.map((st, k) => `<li class="${k === p.idx ? 'is-on' : ''}"><button type="button" data-k="${k}"><span class="n">${pad(k + 1)}</span>${st}</button></li>`).join('');
      ol.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => p.go(+b.dataset.k)));
    });
  }

  // UI/UX row in the work index
  if (SHOW.length) {
    document.getElementById('uiux-no').textContent = pad(data.length + 1) + ' /';
    const li = document.createElement('li');
    li.innerHTML = `<a href="#uiux"><span class="n">${pad(data.length + 1)} /</span><span>UI/UX</span><span class="c">${SHOW.length}</span></a>`;
    listEl.appendChild(li);
    const a = li.querySelector('a');
    const showUx = () => {
      fNo.textContent = pad(data.length + 1) + ' /';
      fTitle.textContent = 'UI/UX';
      fDesc.textContent = lang === 'vi' ? 'Trải nghiệm captive portal cho AWING Channel.' : 'Captive portal experiences for AWING Channel.';
      feature.href = '#uiux';
      fMedia.innerHTML = `<img src="${url('UI UX/Voucher/voucher-07.png')}" alt="" aria-hidden="true" style="object-fit:contain;background:#1d1d1d">`;
      featureCi = -1;
      catLinks.forEach((x) => x.classList.remove('is-active'));
      a.classList.add('is-active');
    };
    a.addEventListener('mouseenter', showUx);
    a.addEventListener('focus', showUx);
    catLinks.forEach((x) => x.addEventListener('mouseenter', () => a.classList.remove('is-active')));
  }

  /* ---------- Featured projects: grouped, short case summaries ---------- */
  const caseEl = document.getElementById('case-list');
  const CASE_LBL = {
    en: { role: 'Role', year: 'Year', archive: 'See all in Library', more: 'See all pieces', live: 'Play the live ad', liveOpen: 'Open live preview', press: 'Read the press coverage', projects: 'projects', challenge: 'The challenge', approach: 'My approach', play: 'Play' },
    vi: { role: 'Vai trò', year: 'Năm', archive: 'Xem tất cả trong Thư viện', more: 'Xem đủ ấn phẩm', live: 'Chơi thử quảng cáo thật', liveOpen: 'Mở bản xem trước', press: 'Đọc bài báo', projects: 'dự án', challenge: 'Thử thách', approach: 'Cách tiếp cận', play: 'Chơi' },
  };
  const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';
  const PLAY_I = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg>';
  const MAX_THUMBS = 8;
  const thumbOf = (src) => (isVideo(src) ? posterOf(src) : url(src));

  // Ad previews are built for a ~375px phone: render at that width and scale to fit the frame
  const AD_W = 375;
  const fitFrame = (screen) => {
    const f = screen.querySelector('iframe');
    if (!f) return;
    const s = screen.clientWidth / AD_W;
    f.style.width = AD_W + 'px';
    f.style.height = ((screen.clientHeight - f.offsetTop) / s) + 'px'; // below the phone's status bar
    f.style.transform = `scale(${s})`;
  };
  const frameRO = new ResizeObserver((es) => es.forEach((e) => fitFrame(e.target)));
  const liveIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting && e.target._start) e.target._start(); }), { threshold: 0.45 });

  const groups = window.CASE_GROUPS || [{ id: 'all', en: '', vi: '' }];
  const cases = [];
  let caseNo = 0;
  if (caseEl) groups.forEach((g) => {
    const list = (window.CASES || []).filter((cs) => (cs.group || 'all') === g.id);
    if (!list.length) return;
    const gEl = document.createElement('section');
    gEl.className = 'cs-group';
    gEl.dataset.group = g.id;
    gEl.innerHTML = `<header class="cs-group-head"><h3 class="cs-group-title"></h3><p class="cs-group-desc"></p><span class="cs-group-count">${pad(list.length)}</span></header><div class="cs-group-list"></div>`;
    caseEl.appendChild(gEl);
    const listEl = gEl.querySelector('.cs-group-list');

    list.forEach((cs) => {
      caseNo += 1;
      let arc = null;
      if (cs.match) {
        const ci = data.findIndex((c) => c.name === cs.match.cat);
        const ui = ci < 0 ? -1 : cs.match.re ? data[ci].units.findIndex((u) => u.files.some((f) => cs.match.re.test(baseName(f)))) : 0;
        if (ui >= 0) arc = { ci, start: data[ci].flat.findIndex((it) => it.ui === ui) };
      }
      const all = (cs.img || []).slice();
      if (cs.cover && !all.includes(cs.cover)) all.unshift(cs.cover);
      [...(cs.shots || []), ...(cs.board ? [cs.board.kv.src, ...(cs.board.pieces || []).map((x) => x.src)] : []), ...(cs.series ? cs.series.items.map((x) => x.src) : []), ...(cs.bento || []), ...(cs.showcase ? [cs.showcase.kv, ...cs.showcase.pieces] : []), ...(cs.insets || []).map((x) => x.src), ...(cs.blocks || []).flatMap((b) => b.items)].forEach((src) => { if (!all.includes(src)) all.push(src); });
      const at = (src) => all.indexOf(src);

      const gamePhones = () => `<ol class="game-phones">${cs.games.list.map((g, j) => `<li class="gp">
            <div class="cs-phone"><div class="phone"><div class="phone-screen">
              <button type="button" class="live-start no-auto" data-src="${g.url}">${g.thumb ? `<img src="${url(g.thumb)}" alt="" loading="lazy" decoding="async">` : ''}<span class="live-cta">${PLAY_I}<span class="game-cta"></span></span></button>
            </div></div></div>
            <p class="gp-name"><span class="chip">${pad(j + 1)}</span><span class="game-name"></span></p>
            <a class="btn-link live-link gp-open" href="${g.url}" target="_blank" rel="noopener"><span class="lbl-liveopen"></span>${ARROW}</a>
          </li>`).join('')}</ol>`;
      const insets = (cs.insets || []).map((x, k) => `<button type="button" class="cs-inset" data-i="${at(x.src)}" data-k="${k}"><img src="${thumbOf(x.src)}" alt="" loading="lazy" decoding="async"><span class="sc-tag"></span></button>`).join('');
      let visual;
      if (cs.live) {
        // One artboard: brand-coloured ground, the line, flow screens around a phone that plays the real ad
        const shots = (cs.shots || []).slice(0, 4);
        const stepNo = []; let sn = 0;
        (cs.steps || []).forEach((x, k) => { stepNo[k] = x ? ++sn : 0; });
        const chip = (k) => (cs.steps && cs.steps[k] ? `<span class="ab-step" data-st="${k}"><b>${stepNo[k]}</b><span></span></span>` : '');
        const q = cs.quote || { bg: '#FFC9CE', fg: '#000' };
        visual = `<div class="cs-visual artboard ab-n${shots.length}${cs.steps ? ' has-steps' : ''}${cs.live.h ? ' is-tall' : ''}" style="--ab-bg:${q.bg};--ab-fg:${q.fg}">
          <p class="ab-quote q" aria-hidden="true"></p>
          ${shots.map((src, k) => `<button type="button" class="ab-shot ab-s${k + 1}" data-i="${at(src)}"><img src="${url(src)}" alt="" loading="lazy" decoding="async">${chip(k + 1)}</button>`).join('')}
          <div class="cs-phone">
            ${chip(0)}
            <div class="phone">
              <div class="phone-screen"${cs.live.h ? ` style="aspect-ratio:375/${cs.live.h}"` : ''}>
                <button type="button" class="live-start">${cs.cover ? `<img src="${url(cs.cover)}" alt="" loading="lazy">` : ''}<span class="live-cta">${PLAY_I}<span class="lbl-live"></span></span></button>
              </div>
            </div>
          </div>
          <p class="ab-sub q-sub"></p>
          <a class="ab-link live-link" href="${cs.live.url}" target="_blank" rel="noopener"><span class="lbl-liveopen"></span>${ARROW}</a>
        </div>`;
      } else if (cs.showcase) {
        const sc = cs.showcase;
        visual = `<div class="cs-visual showcase">
          <button type="button" class="sc-kv" data-i="${at(sc.kv)}"><img src="${url(sc.kv)}" alt="" loading="lazy" decoding="async"><span class="sc-tag">Key visual</span></button>
          ${sc.pieces.map((src, k) => `<button type="button" class="sc-piece sc-p${k + 1}" data-i="${at(src)}"><img src="${url(src)}" alt="" loading="lazy" decoding="async">${sc.tags && sc.tags[k] ? `<span class="sc-tag">${sc.tags[k]}</span>` : ''}</button>`).join('')}
          <div class="sc-desk">
            <div class="sc-monitor"><div class="sc-site"><img src="${url(sc.site)}" alt="" loading="lazy" decoding="async"></div></div>
            <span class="sc-stand" aria-hidden="true"></span>
            <span class="sc-tag">Microsite</span>
          </div>
          <div class="cs-phone sc-phone">
            <div class="phone"><div class="phone-screen">
              <button type="button" class="live-start" data-src="${sc.game}"><img src="${url(sc.poster)}" alt="" loading="lazy"><span class="live-cta">${PLAY_I}<span class="lbl-live"></span></span></button>
            </div></div>
            <span class="sc-tag">AXN mini-game · live</span>
          </div>
        </div>`;
      } else if (cs.board) {
        const bd = cs.board;
        const media = (x) => isVideo(x.src)
          ? `<video src="${url(x.src)}"${x.poster ? ` poster="${url(x.poster)}"` : ''} muted loop playsinline autoplay preload="metadata"></video>`
          : `<img src="${url(x.src)}" alt="" loading="lazy" decoding="async">`;
        const pieceHTML = (bd.pieces || []).map((x) => `<button type="button" class="bd-piece" data-i="${at(x.src)}"><span class="bd-media">${media(x)}</span><span class="bd-name" ${bi(x)}></span></button>`).join('');
        visual = `<div class="cs-visual board${bd.corner ? ' is-corner' : bd.games ? ' kvg' : ` bd-n${bd.pieces.length}`}${bd.dark ? ' is-dark' : ''}" style="--bd-bg:${bd.bg || '#fff'};--bd-bg2:${bd.bg2 || bd.bg || '#fff'}">
          <button type="button" class="bd-kv" data-i="${at(bd.kv.src)}"><span class="bd-media">${media(bd.kv)}</span><span class="sc-tag" ${bi(bd.kv)}></span></button>
          ${bd.games ? gamePhones() : ''}
          ${bd.corner ? `<div class="bd-corner">${pieceHTML}</div>` : pieceHTML}
        </div>`;
      } else if (cs.series) {
        const sr = cs.series;
        const card = (x, k, dup) => `<button type="button" class="sr-item" data-i="${at(x.src)}"${dup ? ' aria-hidden="true" tabindex="-1"' : ''}><span class="sr-media"><img src="${url(x.src)}" alt="" loading="lazy" decoding="async"></span><span class="sr-step"><b>${pad(k + 1)}</b><span ${bi(x)}></span></span></button>`;
        visual = `<div class="cs-visual series" style="--n:${sr.items.length}">
          <span class="sc-tag sr-tag" ${bi(sr)}></span>
          <div class="sr-track">${sr.items.map((x, k) => card(x, k, false)).join('')}${sr.items.map((x, k) => card(x, k, true)).join('')}</div>
        </div>`;
      } else if (cs.coverVideo) {
        visual = `<div class="cs-visual"><button type="button" class="cs-cover is-video" data-i="${at(cs.coverVideo)}"><video src="${url(cs.coverVideo)}" poster="${url(cs.cover)}" muted loop playsinline autoplay preload="metadata"></video></button>${insets ? `<div class="cs-insets">${insets}</div>` : ''}</div>`;
      } else if (cs.bento) {
        visual = `<div class="cs-visual bento">${cs.bento.map((src) => `<button type="button" data-i="${at(src)}"><img src="${url(src)}" alt="" loading="lazy" decoding="async"></button>`).join('')}</div>`;
      } else if (cs.reel) {
        visual = '<div class="cs-visual cs-reel">' + reelHTML(all.map((src) => {
          const cp = capOf(src);
          return { src, attrs: `data-i="${at(src)}"`, client: cp ? cp.client : '' };
        }), 'is-phones') + '</div>';
      } else {
        visual = `<div class="cs-visual"><button type="button" class="cs-cover" data-i="${at(cs.cover)}"><img src="${url(cs.cover)}" alt="" loading="lazy" decoding="async"></button>${insets ? `<div class="cs-insets">${insets}</div>` : ''}</div>`;
      }
      const shown = all.slice(0, MAX_THUMBS);
      const moreRow = all.length > 1 ? `<div class="cs-morerow">
          <div class="mr-thumbs">${shown.slice(0, 6).map((src) => `<button type="button" data-i="${at(src)}"><img src="${thumbOf(src)}" alt="" loading="lazy" decoding="async"></button>`).join('')}</div>
          <a class="mr-btn" href="library.html#project-${cs.id}"><span class="lbl-more"></span> (${cs.deliver ? cs.deliver.reduce((n, g) => n + g.items.length, 0) : all.length})${ARROW}</a>
        </div>` : '';

      const el = document.createElement('article');
      el.className = 'cs' + (cs.live ? ' has-live' : '') + (cs.reel || cs.showcase || cs.series || (cs.board && !cs.board.corner) ? ' has-reel' : '');
      el.id = 'case-' + cs.id;
      el.innerHTML = `
        <div class="cs-head reveal">
          <p class="case-no"><span class="chip">${cs.client}</span><span class="case-idx">${pad(caseNo)}</span></p>
          <h4 class="case-title"></h4>
          <dl class="cs-story">
            <div class="cs-step"><dt><span class="cs-step-no">01</span><span class="l-challenge"></span></dt><dd class="d-challenge"></dd></div>
            <div class="cs-step"><dt><span class="cs-step-no">02</span><span class="l-approach"></span></dt><dd class="d-approach"></dd></div>
          </dl>
          <dl class="cs-meta">
            <div><dt class="l-role"></dt><dd class="d-role"></dd></div>
            ${cs.year ? `<div><dt class="l-year"></dt><dd>${cs.year}</dd></div>` : ''}
          </dl>
          <ul class="case-tags">${cs.tags.map((t) => `<li>${t}</li>`).join('')}</ul>
          ${cs.post ? `<a class="cs-post" href="${cs.post.url}" target="_blank" rel="noopener"><img src="${url(cs.post.thumb)}" alt="" loading="lazy" decoding="async"><span class="cp-text"><span class="cp-kind"></span><span class="cp-title"></span></span>${ARROW}</a>` : ''}
          ${cs.facts ? `<ul class="cs-facts">${cs.facts.map((f) => `<li><b>${f.n}</b><span></span></li>`).join('')}</ul>` : ''}
          <div class="cs-actions">
            ${(cs.links || []).map((l, li) => `<a class="btn btn-ink cs-link" data-l="${li}" href="${l.url}" target="_blank" rel="noopener"><span></span>${ARROW}</a>`).join('')}
            ${cs.press ? `<a class="btn-link" href="${cs.press.url}" target="_blank" rel="noopener"><span class="lbl-press"></span> (${cs.press.label})${ARROW}</a>` : ''}
          </div>
        </div>
        <div class="cs-side">${visual}${moreRow}</div>
        ${(cs.blocks || []).map((b, bi) => `<div class="cs-block is-${b.type}" data-b="${bi}">
          <div class="block-copy"><p class="games-eyebrow"><span class="b-title"></span></p><p class="g-text b-text"></p></div>
          ${b.type === 'phones'
            ? `<div class="phone-row">${b.items.map((src) => `<button type="button" class="pr-item" data-i="${at(src)}"><span class="rp-phone"><span class="rp-screen is-still"><img src="${url(src)}" alt="" loading="lazy" decoding="async"></span></span></button>`).join('')}</div>`
            : `<div class="bento is-wide">${b.items.map((src) => `<button type="button" data-i="${at(src)}"><img src="${url(src)}" alt="" loading="lazy" decoding="async"></button>`).join('')}</div>`}
        </div>`).join('')}
        ${cs.games && !(cs.board && cs.board.games) ? `<div class="cs-games is-row">
          <div class="games-copy">
            <p class="games-eyebrow">${PLAY_I}<span class="g-title"></span></p>
            <p class="g-text"></p>
            <ol class="game-flow" aria-label="How it works">
              <li><span class="gf-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/></svg></span><span class="gf-t"></span></li>
              <li><span class="gf-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1"/></svg></span><span class="gf-t"></span></li>
              <li><span class="gf-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="11" rx="4"/><path d="M8 11v3M6.5 12.5h3M15 11.5h.01M17.5 13.5h.01"/></svg></span><span class="gf-t"></span></li>
            </ol>
          </div>
          ${gamePhones()}
        </div>` : ''}
`;
      listEl.appendChild(el);

      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-i]');
        if (b) { openList(all, +b.dataset.i, cs); return; }
        const gp = e.target.closest('.game-pick');
        if (gp) {
          const box = gp.closest('.cs-games');
          const g = cs.games.list[+gp.dataset.g];
          box.querySelectorAll('.game-pick').forEach((x) => x.setAttribute('aria-selected', String(x === gp)));
          box.querySelector('.game-link').href = g.url;
          const poster = box.querySelector('.game-start img');
          if (poster && g.thumb) poster.src = url(g.thumb); // not playing yet: show this game's screen
          const f = box.querySelector('iframe');
          if (f) f.src = g.url; // already playing: switch game in place
          renderCaseText();
          return;
        }
        const ls = e.target.closest('.live-start');
        if (ls) startLive(ls);
      });
      const startLive = (ls) => {
        if (!ls.isConnected) return;
        liveIO.unobserve(ls);
        const screen = ls.parentElement;
        const box = ls.closest('.cs-games');
        const f = document.createElement('iframe');
        f.src = ls.dataset.src || (box ? cs.games.list[+box.querySelector('.game-pick[aria-selected="true"]').dataset.g].url : cs.live.url);
        f.title = (cs[lang] || cs.en).title;
        f.setAttribute('allow', 'autoplay');
        ls.replaceWith(f);
        fitFrame(screen);
        frameRO.observe(screen);
      };
      // Creative ads start playing on their own once scrolled into view
      el.querySelectorAll('.live-start:not(.no-auto)').forEach((ls) => { ls._start = () => startLive(ls); liveIO.observe(ls); });
      cases.push({ cs, el });
    });
    cases.push({ group: g, el: gEl });
  });

  // Project index under "Selected work": every case at a glance, one tap to jump.
  const caseIndex = document.getElementById('case-index');
  if (caseIndex && caseEl) {
    let n = 0;
    groups.forEach((g) => {
      const list = (window.CASES || []).filter((cs) => (cs.group || 'all') === g.id);
      if (!list.length) return;
      const row = document.createElement('div');
      row.className = 'ci-row';
      row.innerHTML = `<p class="ci-group" data-group="${g.id}"></p><ul class="ci-list">${list.map((cs) => {
        n += 1;
        return `<li><a href="#case-${cs.id}"><span class="ci-no">${pad(n)}</span><span class="ci-name" data-case="${cs.id}">${cs.client}</span>${cs.year ? `<span class="ci-year">${cs.year}</span>` : ''}</a></li>`;
      }).join('')}</ul>`;
      caseIndex.appendChild(row);
    });
  }

  /* ---------- Library: every featured project as a full, named list of its pieces ---------- */
  const libList = document.getElementById('lp-list');
  const projView = document.getElementById('project-view');
  const sheetOf = (cs) => {
    if (cs.deliver) return cs.deliver;
    const srcs = [cs.cover, ...(cs.img || [])].filter((src, k, arr) => src && arr.indexOf(src) === k);
    return [{ en: 'All pieces', vi: 'Toàn bộ ấn phẩm', items: srcs.map((src) => { const cp = capOf(src); return { src, en: cp ? cp.en : '', vi: cp ? (cp.vi || cp.en) : '' }; }) }];
  };
  if (libList) (window.CASES || []).forEach((cs, k) => {
    const n = sheetOf(cs).reduce((sum, g) => sum + g.items.length, 0);
    const li = document.createElement('li');
    li.innerHTML = `<a href="#project-${cs.id}" data-p="${cs.id}"><span class="lp-media"><img src="${thumbOf(cs.cover || cs.img[0])}" alt="" loading="lazy" decoding="async"></span><span class="lp-text"><span class="lp-top"><span class="lp-no">${pad(k + 1)}</span><span class="lp-client">${cs.client}</span></span><span class="lp-title" ${bi({ en: cs.en.title, vi: (cs.vi || cs.en).title })}></span><span class="lp-count">${pad(n)} <span ${bi({ en: 'pieces', vi: 'ấn phẩm' })}></span></span></span></a>`;
    libList.appendChild(li);
  });
  function renderSheet(id, scroll) {
    if (!projView) return;
    const cs = (window.CASES || []).find((c) => c.id === id);
    if (libList) libList.querySelectorAll('a').forEach((a) => a.classList.toggle('is-active', a.dataset.p === id));
    if (!cs) { projView.innerHTML = ''; return; }
    const groups = sheetOf(cs);
    const items = groups.flatMap((g) => g.items);
    const tv = cs.vi || cs.en;
    let k = 0;
    projView.innerHTML = `<article class="psheet" id="project-${cs.id}">
      <header class="ps-head">
        <p class="case-no"><span class="chip">${cs.client}</span>${cs.year ? `<span class="case-idx">${cs.year}</span>` : ''}</p>
        <h2 class="ps-title" ${bi({ en: cs.en.title, vi: tv.title })}></h2>
        <p class="ps-role"><b ${bi({ en: 'Role', vi: 'Vai trò' })}></b><span ${bi({ en: cs.en.role, vi: tv.role })}></span></p>
        <ul class="case-tags">${cs.tags.map((t) => `<li>${t}</li>`).join('')}</ul>
        <a class="btn btn-outline ps-back" href="index.html#case-${cs.id}"><span ${bi({ en: 'Read the case study', vi: 'Xem phần giới thiệu dự án' })}></span>${ARROW}</a>
      </header>
      ${groups.map((g) => `<section class="ps-group">
        <h3 class="ps-gtitle"><span ${bi(g)}></span><sup>${pad(g.items.length)}</sup></h3>
        <div class="ps-grid">${g.items.map((x) => {
          const i = k++;
          const m = isVideo(x.src)
            ? `<video src="${url(x.src)}" poster="${x.poster ? url(x.poster) : posterOf(x.src)}" muted playsinline preload="none"></video><span class="tile-play">${PLAY}</span>`
            : `<img src="${url(x.src)}" alt="" loading="lazy" decoding="async">`;
          return `<figure class="ps-item"><button type="button" data-k="${i}">${m}</button>${x.en ? `<figcaption ${bi(x)}></figcaption>` : ''}</figure>`;
        }).join('')}</div>
      </section>`).join('')}
    </article>`;
    projView.querySelector('.psheet').addEventListener('click', (e) => {
      const b = e.target.closest('[data-k]');
      if (b) openList(items.map((x) => x.src), +b.dataset.k, cs, items);
    });
    fillBi(projView);
    if (scroll) projView.firstElementChild.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  const hashProject = () => { const m = location.hash.match(/^#project-(.+)$/); return m ? decodeURIComponent(m[1]) : null; };
  if (projView) {
    renderSheet(hashProject(), false);
    addEventListener('hashchange', () => { const id = hashProject(); if (id) renderSheet(id, true); });
  }

  function renderCaseText() {
    const L = CASE_LBL[lang] || CASE_LBL.en;
    cases.forEach(({ cs, group, el }) => {
      if (group) {
        el.querySelector('.cs-group-title').textContent = group[lang] || group.en;
        el.querySelector('.cs-group-desc').textContent = group.desc ? (group.desc[lang] || group.desc.en) : '';
        const ig = document.querySelector(`.ci-group[data-group="${group.id}"]`);
        if (ig) ig.textContent = group[lang] || group.en;
        document.querySelectorAll('.ci-name[data-case]').forEach((nm) => {
          const sh = (window.CASE_SHORT || {})[nm.dataset.case];
          if (sh) nm.textContent = sh[lang] || sh.en;
        });
        return;
      }
      const t = cs[lang] || cs.en;
      el.querySelector('.case-title').textContent = t.title;
      el.querySelector('.d-challenge').textContent = t.challenge;
      el.querySelector('.d-approach').textContent = t.approach;
      el.querySelector('.l-role').textContent = L.role;
      el.querySelector('.d-role').textContent = t.role;
      const ly = el.querySelector('.l-year'); if (ly) ly.textContent = L.year;
      el.querySelectorAll('.cs-facts li').forEach((li, j) => { li.querySelector('span').textContent = cs.facts[j][lang] || cs.facts[j].en; });
      const q = el.querySelector('.cs-quote, .artboard');
      if (q && cs.quote) { q.querySelector('.q').textContent = cs.quote[lang] || cs.quote.en; q.querySelector('.q-sub').textContent = cs.quote.sub[lang] || cs.quote.sub.en; }
      [['.lbl-archive', 'archive'], ['.lbl-more', 'more'], ['.lbl-live', 'live'], ['.lbl-liveopen', 'liveOpen'], ['.lbl-press', 'press'], ['.l-challenge', 'challenge'], ['.l-approach', 'approach']].forEach(([sel, key]) => {
        el.querySelectorAll(sel).forEach((n) => { n.textContent = L[key]; });
      });
      el.querySelectorAll('[data-i]').forEach((b) => b.setAttribute('aria-label', `${ui().open}: ${t.title}`));
      el.querySelectorAll('.cs-block').forEach((bl) => {
        const b = cs.blocks[+bl.dataset.b];
        const bt = b[lang] || b.en;
        bl.querySelector('.b-title').textContent = bt.title;
        bl.querySelector('.b-text').textContent = bt.text;
      });
      const cp = el.querySelector('.cs-post');
      if (cp) { const pt = cs.post[lang] || cs.post.en; cp.querySelector('.cp-kind').textContent = pt.kind; cp.querySelector('.cp-title').textContent = pt.title; }
      el.querySelectorAll('.cs-inset').forEach((b) => { const x = cs.insets[+b.dataset.k]; b.querySelector('.sc-tag').textContent = x[lang] || x.en; });
      el.querySelectorAll('.ab-step').forEach((st) => { const x = cs.steps[+st.dataset.st]; st.querySelector('span').textContent = x[lang] || x.en; });
      el.querySelectorAll('.cs-link').forEach((a) => { const l = cs.links[+a.dataset.l]; a.querySelector('span').textContent = l[lang] || l.en; });
      const gb = el.querySelector('.cs-games');
      if (gb) {
        const gt = cs.games[lang] || cs.games.en;
        gb.querySelector('.g-title').textContent = gt.title;
        gb.querySelector('.g-text').textContent = gt.text;
        gb.querySelectorAll('.gf-t').forEach((n, j) => { n.textContent = (gt.flow || [])[j] || ''; });
      }
      el.querySelectorAll('.gp').forEach((li, j) => {
        const g = cs.games.list[j];
        li.querySelector('.game-name').textContent = g[lang] || g.en;
        li.querySelector('.game-cta').textContent = L.play;
      });
    });
    fillBi();
  }

  /* ---------- Apply language ---------- */
  const enCopy = new Map();
  document.querySelectorAll('[data-i18n]').forEach((el) => enCopy.set(el, el.innerHTML));
  const langBtns = [...document.querySelectorAll('.lang button')];

  function applyLang() {
    document.documentElement.lang = lang;
    document.documentElement.dataset.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const k = el.dataset.i18n;
      el.innerHTML = lang === 'vi' && VI[k] != null ? VI[k] : enCopy.get(el);
    });
    langBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    document.querySelectorAll('#categories > .cat').forEach((sec) => {
      const c = data[+sec.dataset.ci];
      const t = secText(c.name);
      sec.querySelector('.cat-title').textContent = t.name;
      sec.querySelector('.cat-desc').textContent = t.desc;
      sec.querySelector('.cat-count').textContent = `${c.units.length} ${ui().works}`;
      sec.querySelectorAll('.tile').forEach((tile) => {
        const ct = capText(c.units[+tile.dataset.ui].cap);
        if (ct) {
          tile.querySelector('.tile-client').textContent = ct.client;
          tile.querySelector('.tile-title').textContent = ct.title;
        }
        tile.setAttribute('aria-label', ct ? `${ui().open}: ${ct.client}, ${ct.title}` : `${ui().open} ${t.name} ${pad(+tile.dataset.ui + 1)}`);
      });
      sec.querySelectorAll('.play-lbl').forEach((s) => { s.textContent = ui().play; });
      updateMoreLabel(sec);
    });
    catLinks.forEach((a) => { a.querySelector('.cat-name').textContent = secText(data[+a.dataset.ci].name).name; });
    if (feature && data.length) setFeature(featureCi < 0 ? 0 : featureCi, !fMedia.firstChild || featureCi < 0);
    renderShowcaseText();
    renderCaseText();
    fitName();
    if (document.querySelector('.is-split')) splitTitles();
  }
  langBtns.forEach((b) => b.addEventListener('click', () => {
    lang = b.dataset.lang;
    try { localStorage.setItem('lang', lang); } catch (e) { /* storage unavailable */ }
    applyLang();
  }));

  /* ---------- Lazy video + hover preview ---------- */
  const vio = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const v = e.target;
      if (v.dataset.poster) v.poster = v.dataset.poster;
      v.preload = 'metadata';
      v.src = v.dataset.src + '#t=0.1';
      v.addEventListener('loadedmetadata', () => v.setAttribute('data-ready', ''), { once: true });
      vio.unobserve(v);
    });
  }, { rootMargin: '400px 0px' });
  document.querySelectorAll('video[data-src]').forEach((v) => vio.observe(v));

  if (canHover && !reduceMotion) {
    document.querySelectorAll('.tile:not(.reel-item)').forEach((t) => {
      const vids = [...t.querySelectorAll('video')];
      if (!vids.length) return;
      t.addEventListener('mouseenter', () => vids.forEach((v) => v.src && v.play().catch(() => {})));
      t.addEventListener('mouseleave', () => vids.forEach((v) => v.pause()));
    });
  }

  /* ---------- Lightbox ---------- */
  const lb = document.getElementById('lightbox');
  const stage = document.getElementById('lb-stage');
  const cap = document.getElementById('lb-caption');
  let cur = { ci: 0, i: 0, list: null };

  function show(ci, i) {
    const flat = data[ci].flat;
    i = (i + flat.length) % flat.length;
    cur = { ci, i, list: null };
    const it = flat[i];
    const t = secText(data[ci].name);
    stage.innerHTML = isVideo(it.src)
      ? `<video src="${url(it.src)}" poster="${posterOf(it.src)}" controls autoplay playsinline></video>`
      : `<img src="${url(it.src)}" alt="">`;
    const ct = capText(data[ci].units[it.ui].cap);
    if (!isVideo(it.src)) stage.querySelector('img').alt = ct ? `${ct.client}: ${ct.title}` : `${t.name} ${pad(it.ui + 1)}`;
    cap.innerHTML = `<span class="muted">${t.name}</span>${ct ? `<span class="lb-title"><b></b> <span></span></span>` : ''}<span class="lb-no">${pad(it.ui + 1)} / ${pad(data[ci].units.length)}</span>${it.size > 1 ? `<span class="lb-flow">${it.fi + 1} / ${it.size}</span>` : ''}`;
    if (ct) { cap.querySelector('.lb-title b').textContent = ct.client; cap.querySelector('.lb-title span').textContent = ct.title; }
  }
  // Case-study viewer: a plain list of images
  function showList(list, i) {
    i = (i + list.items.length) % list.items.length;
    cur = { ci: -1, i, list };
    const t = list.cs[lang] || list.cs.en;
    const src = list.items[i];
    stage.innerHTML = isVideo(src)
      ? `<video src="${url(src)}" poster="${posterOf(src)}" controls autoplay playsinline></video>`
      : `<img src="${url(src)}" alt="">`;
    const im = stage.querySelector('img'); if (im) im.alt = `${list.cs.client}: ${t.title}`;
    cap.innerHTML = `<span class="lb-title"><b></b> <span></span></span><span class="lb-no">${pad(i + 1)} / ${pad(list.items.length)}</span>`;
    cap.querySelector('.lb-title b').textContent = list.cs.client;
    const nm = list.names && list.names[i];
    cap.querySelector('.lb-title span').textContent = nm && nm.en ? `${t.title} · ${(lang === 'vi' && nm.vi) || nm.en}` : t.title;
  }
  function step(d) { if (cur.list) showList(cur.list, cur.i + d); else show(cur.ci, cur.i + d); }
  function open(ci, i) {
    show(ci, i);
    if (!lb.open) lb.showModal();
    document.body.style.overflow = 'hidden';
  }
  function openList(all, i, cs, names) {
    const items = all.filter(Boolean);
    showList({ items, cs, names }, Math.max(0, items.indexOf(all[i])));
    if (!lb.open) lb.showModal();
    document.body.style.overflow = 'hidden';
  }
  lb.addEventListener('close', () => { stage.innerHTML = ''; document.body.style.overflow = ''; });

  if (catsEl) catsEl.addEventListener('click', (e) => {
    const t = e.target.closest('.tile');
    if (t) open(+t.dataset.ci, +t.dataset.start);
  });
  document.getElementById('lb-close').addEventListener('click', () => lb.close());
  document.getElementById('lb-prev').addEventListener('click', () => step(-1));
  document.getElementById('lb-next').addEventListener('click', () => step(1));
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target === stage) lb.close(); });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });

  /* ---------- Fit hero name to width ---------- */
  const h1 = document.querySelector('.hero-name');
  const inner = h1 && h1.querySelector('.name-inner');
  function fitName() {
    if (!h1) return;
    h1.style.fontSize = '100px';
    const avail = h1.clientWidth;
    const w = inner.getBoundingClientRect().width;
    if (w) h1.style.fontSize = Math.floor(100 * avail / w * 0.995) + 'px';
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(fitName);
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(fitName, 80); });

  applyLang();

  /* ---------- Experience tabs ---------- */
  const jobTabs = [...document.querySelectorAll('.job-tab')];
  function selectJob(tab, focus) {
    jobTabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      panel.hidden = !on;
      if (on) replay(panel);
    });
    if (focus) tab.focus();
  }
  jobTabs.forEach((t, i) => {
    t.addEventListener('click', () => selectJob(t));
    t.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      selectJob(jobTabs[(i + d + jobTabs.length) % jobTabs.length], true);
    });
  });

  /* ---------- Scroll motion ----------
     Elements animate in from the side they enter: from below when scrolling down,
     from above when scrolling back up, and replay each time they come back into view. */
  // Headings rise word by word (re-split after every language change)
  function splitTitles() {
    document.querySelectorAll('.display, .cs-group-title').forEach((h) => {
      const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) if (walker.currentNode.textContent.trim() && !walker.currentNode.parentElement.closest('.w, sup')) nodes.push(walker.currentNode);
      let i = h.querySelectorAll('.w').length;
      nodes.forEach((node) => {
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach((part) => {
          if (!part.trim()) { frag.append(part); return; }
          const mask = document.createElement('span');
          mask.className = 'w-mask';
          mask.innerHTML = '<span class="w"></span>';
          mask.firstChild.textContent = part;
          mask.firstChild.style.setProperty('--i', i++);
          frag.append(mask);
        });
        node.replaceWith(frag);
      });
      h.classList.add('m', 'is-split');
      h.dataset.k = 'words';
    });
  }

  function mark(sel, kind, stagger) {
    document.querySelectorAll(sel).forEach((el) => {
      if (el.classList.contains('m')) return;
      el.classList.remove('reveal');
      el.classList.add('m');
      el.dataset.k = kind;
      if (stagger) {
        const sibs = [...el.parentElement.children];
        el.style.setProperty('--d', (sibs.indexOf(el) % 8) * stagger + 'ms');
      }
    });
  }
  function replay(el) {
    if (reduceMotion) return;
    el.querySelectorAll('.m').forEach((m) => { m.classList.remove('in'); m.dataset.dir = 'down'; });
    requestAnimationFrame(() => requestAnimationFrame(() => el.querySelectorAll('.m').forEach((m) => m.classList.add('in'))));
  }

  if (!reduceMotion && 'IntersectionObserver' in window) {
    splitTitles();
    mark('.hero-intro, .hero-side', 'rise');
    mark('.exp-head .lead, .work-head .lead', 'fade');
    mark('.stats li', 'rise', 90);
    mark('.job-tabs', 'rise');
    mark('.job-main, .job-date', 'side', 120);
    mark('.exp-grid .card', 'settle', 110);
    mark('.cs-group-head .cs-group-desc, .cs-group-count', 'fade');
    mark('.cs-head', 'side');
    mark('.cs-visual', 'wipe');
    mark('.mr-thumbs button', 'rise', 45);
    mark('.games-copy', 'side');
    mark('.cs-games .cs-phone', 'rise');
    mark('.feature, .cat-list li', 'rise', 40);
    mark('.cat-head', 'side');
    mark('.contact-copy', 'rise');
    mark('.contact-blob', 'zoom');
    mark('.reveal', 'rise');

    const motionIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const el = e.target;
        if (e.isIntersecting) {
          if (!el.classList.contains('in')) {
            el.dataset.dir = e.boundingClientRect.top < 0 ? 'up' : 'down';
            el.classList.add('in');
          }
        } else if (el.classList.contains('in')) {
          // Reset off-screen, ready to come in from the side it left on
          el.classList.add('m-reset');
          el.classList.remove('in');
          el.dataset.dir = e.boundingClientRect.top < 0 ? 'up' : 'down';
          requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('m-reset')));
        }
      });
    }, { threshold: 0, rootMargin: '-6% 0px -6% 0px' });
    document.querySelectorAll('.m').forEach((el) => motionIO.observe(el));

    // Gentle parallax on project covers
    const para = [...document.querySelectorAll('.cs-cover img')];
    let ticking = false;
    const drift = () => {
      ticking = false;
      const vh = innerHeight;
      para.forEach((img) => {
        const r = img.parentElement.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        const p = (r.top + r.height / 2 - vh / 2) / vh; // -1 … 1 around the centre of the screen
        img.style.translate = `0 ${(-p * 5).toFixed(2)}%`;
      });
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(drift); } }, { passive: true });
    drift();

    // Thin progress line at the top of the page
    const bar = document.createElement('div');
    bar.className = 'scroll-bar';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    const progress = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    };
    addEventListener('scroll', progress, { passive: true });
    progress();
  } else {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-in'));
  }

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- Reels: play what is on screen, open the viewer on click ---------- */
  const reelIO = new IntersectionObserver((es) => es.forEach((e) => {
    const v = e.target;
    if (e.isIntersecting) {
      if (!v.getAttribute('src')) v.src = v.dataset.reelSrc;
      v.play().catch(() => {});
    } else if (v.getAttribute('src')) v.pause();
  }), { threshold: 0.2 });
  document.querySelectorAll('video[data-reel-src]').forEach((v) => reelIO.observe(v));
  document.querySelectorAll('.reel').forEach((r) => {
    // Pause the drift while someone tabs through it
    r.addEventListener('focusin', () => r.classList.add('is-paused'));
    r.addEventListener('focusout', () => r.classList.remove('is-paused'));
  });

  /* ---------- Email: copy to clipboard instead of opening a mail app ---------- */
  const EMAIL = 'ngochn271099@gmail.com';
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  let toastT;
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove('is-on'), 2600);
  };
  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove();
      return ok;
    }
  };
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy-email]');
    if (!b) return;
    e.preventDefault();
    const ok = await copyText(EMAIL);
    showToast(ok
      ? (lang === 'vi' ? `Đã copy email: ${EMAIL}` : `Email copied: ${EMAIL}`)
      : (lang === 'vi' ? `Chưa copy được. Email của tôi: ${EMAIL}` : `Couldn’t copy. My email: ${EMAIL}`));
  });

  // "Hire me": the browser scrolls to the contact card; give it a short highlight so the eye lands on it
  const contactEl = document.getElementById('contact');
  document.querySelectorAll('a[href$="#contact"]').forEach((l) => l.addEventListener('click', () => {
    if (!contactEl) return;
    contactEl.classList.remove('is-flash');
    setTimeout(() => contactEl.classList.add('is-flash'), reduceMotion ? 0 : 450);
  }));

  /* ---------- Content is built by script: honour the #hash once it exists ---------- */
  if (location.hash.length > 1) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) {
      const go = () => target.scrollIntoView({ block: 'start', behavior: 'instant' });
      setTimeout(go, 250); // after collapsible grids have settled their height
      addEventListener('load', () => setTimeout(go, 60), { once: true }); // again once images have settled the layout
    }
  }
  if (/(library|workspace)\.html$/.test(location.pathname)) document.querySelectorAll('[data-nav="workspace"]').forEach((a) => a.setAttribute('aria-current', 'page'));

})();
