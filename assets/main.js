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
      return { files, show: mocks.length ? mocks : files, view: [...mocks, ...files] };
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

  const mediaHTML = (src, alt) => isVideo(src)
    ? `<video muted loop playsinline preload="none" data-src="${url(src)}" aria-hidden="true"></video>`
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
      sec.querySelectorAll('.tile').forEach((tile) => tile.setAttribute('aria-label', `${ui().open} ${t.name} ${pad(+tile.dataset.ui + 1)}`));
      sec.querySelectorAll('.play-lbl').forEach((s) => { s.textContent = ui().play; });
      updateMoreLabel(sec);
    });
    catLinks.forEach((a) => { a.querySelector('.cat-name').textContent = secText(data[+a.dataset.ci].name).name; });
    if (data.length) setFeature(featureCi < 0 ? 0 : featureCi, !fMedia.firstChild || featureCi < 0);
    renderShowcaseText();
    fitName();
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
  let cur = { ci: 0, i: 0 };

  function show(ci, i) {
    const flat = data[ci].flat;
    i = (i + flat.length) % flat.length;
    cur = { ci, i };
    const it = flat[i];
    const t = secText(data[ci].name);
    stage.innerHTML = isVideo(it.src)
      ? `<video src="${url(it.src)}" controls autoplay playsinline></video>`
      : `<img src="${url(it.src)}" alt="${t.name} ${pad(it.ui + 1)}">`;
    cap.innerHTML = `<span class="muted">${t.name}</span>${pad(it.ui + 1)} / ${pad(data[ci].units.length)}${it.size > 1 ? `<span class="lb-flow">${it.fi + 1} / ${it.size}</span>` : ''}`;
  }
  function open(ci, i) {
    show(ci, i);
    if (!lb.open) lb.showModal();
    document.body.style.overflow = 'hidden';
  }
  lb.addEventListener('close', () => { stage.innerHTML = ''; document.body.style.overflow = ''; });

  catsEl.addEventListener('click', (e) => {
    const t = e.target.closest('.tile');
    if (t) open(+t.dataset.ci, +t.dataset.start);
  });
  document.getElementById('lb-close').addEventListener('click', () => lb.close());
  document.getElementById('lb-prev').addEventListener('click', () => show(cur.ci, cur.i - 1));
  document.getElementById('lb-next').addEventListener('click', () => show(cur.ci, cur.i + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target === stage) lb.close(); });
  lb.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(cur.ci, cur.i - 1);
    if (e.key === 'ArrowRight') show(cur.ci, cur.i + 1);
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

  /* ---------- Reveal on scroll ---------- */
  const rio = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); rio.unobserve(e.target); } });
  }, { threshold: .12 });
  document.querySelectorAll('.reveal').forEach((el) => rio.observe(el));

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
      const tile = e.target.closest('.tile');
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
