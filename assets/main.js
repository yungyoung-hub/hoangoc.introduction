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

  data.forEach((c, ci) => {
    const li = document.createElement('li');
    li.innerHTML = `<a href="#${c.id}" data-ci="${ci}"><span class="n">${pad(ci + 1)} /</span><span class="cat-name"></span><span class="c">${c.units.length}</span></a>`;
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
      <div class="grid-wrap is-collapsed" id="${c.id}-grid">
        <div class="grid ${/motion/i.test(c.name) ? 'is-motion' : ''}"></div>
      </div>
      <div class="cat-more" hidden>
        <button type="button" class="btn btn-outline" aria-expanded="false" aria-controls="${c.id}-grid">
          <span class="lbl"></span>${CHEV}</button>
      </div>`;
    const grid = sec.querySelector('.grid');

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

  /* ---------- Collapsible sections ---------- */
  const COLLAPSED = () => Math.round(Math.min(860, Math.max(560, innerHeight * 0.9)));
  document.querySelectorAll('#categories > .cat').forEach((sec) => {
    const wrap = sec.querySelector('.grid-wrap');
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
    new ResizeObserver(sync).observe(wrap.firstElementChild);
    addEventListener('resize', sync);

    btn.addEventListener('click', () => {
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
    btn.querySelector('.lbl').textContent = btn.getAttribute('aria-expanded') === 'true' ? ui().collapse : ui().showAll(c.units.length);
  }

  /* ---------- Feature card ---------- */
  const feature = document.getElementById('feature');
  const fNo = document.getElementById('feature-no');
  const fTitle = document.getElementById('feature-title');
  const fDesc = document.getElementById('feature-desc');
  const fMedia = document.getElementById('feature-media');
  const catLinks = [...listEl.querySelectorAll('a')];
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
    en: { role: 'Role', year: 'Year', archive: 'See it in the archive', live: 'Play the live ad', liveOpen: 'Open live preview', press: 'Read the press coverage', projects: 'projects', challenge: 'The challenge', approach: 'My approach', play: 'Play' },
    vi: { role: 'Vai trò', year: 'Năm', archive: 'Xem trong kho tác phẩm', live: 'Chơi thử quảng cáo thật', liveOpen: 'Mở bản xem trước', press: 'Đọc bài báo', projects: 'dự án', challenge: 'Thử thách', approach: 'Cách tiếp cận', play: 'Chơi' },
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
    f.style.height = (screen.clientHeight / s) + 'px';
    f.style.transform = `scale(${s})`;
  };
  const frameRO = new ResizeObserver((es) => es.forEach((e) => fitFrame(e.target)));

  const groups = window.CASE_GROUPS || [{ id: 'all', en: '', vi: '' }];
  const cases = [];
  let caseNo = 0;
  groups.forEach((g) => {
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
      const at = (src) => all.indexOf(src);

      let visual;
      if (cs.live) {
        visual = `<div class="cs-visual is-live">
          <div class="cs-phone">
            <div class="phone">
              <span class="phone-btn b1" aria-hidden="true"></span><span class="phone-btn b2" aria-hidden="true"></span><span class="phone-btn b3" aria-hidden="true"></span>
              <div class="phone-screen">
                <button type="button" class="live-start">${cs.cover ? `<img src="${url(cs.cover)}" alt="" loading="lazy">` : ''}<span class="live-cta">${PLAY_I}<span class="lbl-live"></span></span></button>
              </div>
            </div>
            <a class="btn-link live-link" href="${cs.live.url}" target="_blank" rel="noopener"><span class="lbl-liveopen"></span>${ARROW}</a>
          </div>
          ${cs.quote ? `<div class="cs-quote" style="background:${cs.quote.bg};color:${cs.quote.fg}"><p class="q"></p><p class="q-sub"></p></div>` : ''}
        </div>`;
      } else if (cs.mosaic) {
        visual = `<div class="cs-visual cs-mosaic">${all.slice(0, 6).map((src) => `<button type="button" data-i="${at(src)}"><img src="${thumbOf(src)}" alt="" loading="lazy" decoding="async"><span class="tile-play">${PLAY_I}</span></button>`).join('')}</div>`;
      } else {
        visual = `<div class="cs-visual"><button type="button" class="cs-cover" data-i="${at(cs.cover)}"><img src="${url(cs.cover)}" alt="" loading="lazy" decoding="async"><span class="case-count">${all.length}</span></button></div>`;
      }
      const shown = all.slice(0, MAX_THUMBS);

      const el = document.createElement('article');
      el.className = 'cs' + (cs.live ? ' has-live' : '');
      el.id = 'case-' + cs.id;
      el.innerHTML = `
        <div class="cs-head reveal">
          <p class="case-no">${pad(caseNo)} / <span class="case-client">${cs.client}</span></p>
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
          ${cs.facts ? `<ul class="cs-facts">${cs.facts.map((f) => `<li><b>${f.n}</b><span></span></li>`).join('')}</ul>` : ''}
          <div class="cs-actions">
            ${arc ? `<button type="button" class="btn btn-outline cs-archive" data-ci="${arc.ci}" data-start="${arc.start}"><span class="lbl-archive"></span>${ARROW}</button>` : ''}
            ${cs.press ? `<a class="btn-link" href="${cs.press.url}" target="_blank" rel="noopener"><span class="lbl-press"></span> (${cs.press.label})${ARROW}</a>` : ''}
          </div>
        </div>
        ${visual}
        ${cs.games ? `<div class="cs-games">
          <div class="games-copy">
            <p class="games-eyebrow">${PLAY_I}<span class="g-title"></span></p>
            <p class="g-text"></p>
            <ol class="game-flow" aria-label="How it works">
              <li><span class="gf-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/></svg></span><span class="gf-t"></span></li>
              <li><span class="gf-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1"/></svg></span><span class="gf-t"></span></li>
              <li><span class="gf-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="11" rx="4"/><path d="M8 11v3M6.5 12.5h3M15 11.5h.01M17.5 13.5h.01"/></svg></span><span class="gf-t"></span></li>
            </ol>
            <ol class="game-list" role="tablist">${cs.games.list.map((g, j) => `<li><button type="button" class="game-pick" role="tab" data-g="${j}" aria-selected="${j === 0}"><span class="game-no">${pad(j + 1)}</span><span class="game-name"></span></button></li>`).join('')}</ol>
            <a class="btn-link live-link game-link" href="${cs.games.list[0].url}" target="_blank" rel="noopener"><span class="lbl-liveopen"></span>${ARROW}</a>
          </div>
          <div class="cs-phone">
            <div class="phone">
              <span class="phone-btn b1" aria-hidden="true"></span><span class="phone-btn b2" aria-hidden="true"></span><span class="phone-btn b3" aria-hidden="true"></span>
              <div class="phone-screen">
                <button type="button" class="live-start game-start">${cs.cover ? `<img src="${url(cs.cover)}" alt="" loading="lazy">` : ''}<span class="live-cta">${PLAY_I}<span class="game-cta"></span></span></button>
              </div>
            </div>
          </div>
        </div>` : ''}
        ${shown.length > 1 && !cs.mosaic ? `<div class="cs-strip">${shown.map((src, j) => `<button type="button" data-i="${at(src)}"><img src="${thumbOf(src)}" alt="" loading="lazy" decoding="async">${j === shown.length - 1 && all.length > shown.length ? `<span class="thumb-more">+${all.length - shown.length}</span>` : ''}</button>`).join('')}</div>` : ''}`;
      listEl.appendChild(el);

      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-i]');
        if (b) { openList(all, +b.dataset.i, cs); return; }
        const a = e.target.closest('.cs-archive');
        if (a) { open(+a.dataset.ci, +a.dataset.start); return; }
        const gp = e.target.closest('.game-pick');
        if (gp) {
          const box = gp.closest('.cs-games');
          const g = cs.games.list[+gp.dataset.g];
          box.querySelectorAll('.game-pick').forEach((x) => x.setAttribute('aria-selected', String(x === gp)));
          box.querySelector('.game-link').href = g.url;
          const f = box.querySelector('iframe');
          if (f) f.src = g.url; // already playing: switch game in place
          renderCaseText();
          return;
        }
        const ls = e.target.closest('.live-start');
        if (ls) {
          const screen = ls.parentElement;
          const box = ls.closest('.cs-games');
          const f = document.createElement('iframe');
          f.src = box ? cs.games.list[+box.querySelector('.game-pick[aria-selected="true"]').dataset.g].url : cs.live.url;
          f.title = (cs[lang] || cs.en).title;
          f.setAttribute('allow', 'autoplay');
          ls.replaceWith(f);
          fitFrame(screen);
          frameRO.observe(screen);
        }
      });
      cases.push({ cs, el });
    });
    cases.push({ group: g, el: gEl });
  });

  function renderCaseText() {
    const L = CASE_LBL[lang] || CASE_LBL.en;
    cases.forEach(({ cs, group, el }) => {
      if (group) {
        el.querySelector('.cs-group-title').textContent = group[lang] || group.en;
        el.querySelector('.cs-group-desc').textContent = group.desc ? (group.desc[lang] || group.desc.en) : '';
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
      const q = el.querySelector('.cs-quote');
      if (q) { q.querySelector('.q').textContent = cs.quote[lang] || cs.quote.en; q.querySelector('.q-sub').textContent = cs.quote.sub[lang] || cs.quote.sub.en; }
      [['.lbl-archive', 'archive'], ['.lbl-live', 'live'], ['.lbl-liveopen', 'liveOpen'], ['.lbl-press', 'press'], ['.l-challenge', 'challenge'], ['.l-approach', 'approach']].forEach(([sel, key]) => {
        const n = el.querySelector(sel); if (n) n.textContent = L[key];
      });
      el.querySelectorAll('[data-i]').forEach((b) => b.setAttribute('aria-label', `${ui().open}: ${t.title}`));
      const gb = el.querySelector('.cs-games');
      if (gb) {
        const gt = cs.games[lang] || cs.games.en;
        gb.querySelector('.g-title').textContent = gt.title;
        gb.querySelector('.g-text').textContent = gt.text;
        gb.querySelectorAll('.gf-t').forEach((n, j) => { n.textContent = (gt.flow || [])[j] || ''; });
        gb.querySelectorAll('.game-pick').forEach((b, j) => { b.querySelector('.game-name').textContent = cs.games.list[j][lang] || cs.games.list[j].en; });
        const on = +gb.querySelector('.game-pick[aria-selected="true"]').dataset.g;
        const cta = gb.querySelector('.game-cta');
        if (cta) cta.textContent = `${L.play}: ${cs.games.list[on][lang] || cs.games.list[on].en}`;
      }
    });
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
    if (data.length) setFeature(featureCi < 0 ? 0 : featureCi, !fMedia.firstChild || featureCi < 0);
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
    document.querySelectorAll('.tile').forEach((t) => {
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
    cap.querySelector('.lb-title span').textContent = t.title;
  }
  function step(d) { if (cur.list) showList(cur.list, cur.i + d); else show(cur.ci, cur.i + d); }
  function open(ci, i) {
    show(ci, i);
    if (!lb.open) lb.showModal();
    document.body.style.overflow = 'hidden';
  }
  function openList(all, i, cs) {
    const items = all.filter(Boolean);
    showList({ items, cs }, Math.max(0, items.indexOf(all[i])));
    if (!lb.open) lb.showModal();
    document.body.style.overflow = 'hidden';
  }
  lb.addEventListener('close', () => { stage.innerHTML = ''; document.body.style.overflow = ''; });

  catsEl.addEventListener('click', (e) => {
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
  const inner = h1.querySelector('.name-inner');
  function fitName() {
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
      while (walker.nextNode()) if (walker.currentNode.textContent.trim() && !walker.currentNode.parentElement.closest('.w')) nodes.push(walker.currentNode);
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
    mark('.cs-strip button', 'rise', 45);
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

  /* ---------- Custom cursor (fine pointers only) ---------- */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion) {
    const curEl = document.createElement('div');
    curEl.className = 'cursor';
    curEl.setAttribute('aria-hidden', 'true');
    curEl.innerHTML = '<div class="cursor-ring"><span class="cursor-label"></span></div><div class="cursor-dot"></div>';
    document.body.appendChild(curEl);
    document.documentElement.classList.add('has-cursor');
    const ring = curEl.querySelector('.cursor-ring');
    const dot = curEl.querySelector('.cursor-dot');
    const label = curEl.querySelector('.cursor-label');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, raf = 0;

    const loop = () => {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf = Math.abs(mx - rx) + Math.abs(my - ry) > 0.1 ? requestAnimationFrame(loop) : 0;
    };
    addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      curEl.classList.add('is-visible');
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    document.addEventListener('pointerleave', () => curEl.classList.remove('is-visible'));
    addEventListener('pointerdown', () => curEl.classList.add('is-down'));
    addEventListener('pointerup', () => curEl.classList.remove('is-down'));

    document.addEventListener('pointerover', (e) => {
      const tile = e.target.closest('.tile, .cs-cover, .cs-strip button, .cs-mosaic button');
      const link = e.target.closest('a, button, .pill');
      curEl.classList.toggle('is-view', !!tile);
      curEl.classList.toggle('is-link', !tile && !!link);
      label.textContent = tile ? (tile.querySelector('video') ? ui().play : ui().view) : '';
    });

    document.querySelectorAll('.btn, .nav-cta, .pill').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.translate = `${dx * 0.18}px ${dy * 0.25}px`;
      });
      el.addEventListener('pointerleave', () => { el.style.translate = ''; });
    });

    // The lightbox sits in the top layer above the custom cursor: use the native one there
    new MutationObserver(() => curEl.classList.toggle('is-hidden', lb.open)).observe(lb, { attributes: true, attributeFilter: ['open'] });
  }
})();
