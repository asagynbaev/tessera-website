/* Tessera — blueprint interactions.
   The hero is a Merkle attestation tree drawn as an engineering schematic: it
   builds itself, computes its REAL root in the browser (same domain-separated
   SHA-256 scheme as Tessera.Attestations.MerkleTree — leaf 0x00, node 0x01,
   odd node duplicated), and lights a leaf's inclusion path on disclosure.
   Facts are sample data; the tree is real. */
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var REDUCED = reducedMq.matches;
  if (reducedMq.addEventListener) reducedMq.addEventListener('change', function (e) { REDUCED = e.matches; });
  var CAN_HOVER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var enc = new TextEncoder();
  var subtle = (window.crypto && window.crypto.subtle) ? window.crypto.subtle : null;

  /* ---------- Merkle (mirrors MerkleTree.cs) ---------- */

  function sha256(bytes) { return subtle.digest('SHA-256', bytes).then(function (b) { return new Uint8Array(b); }); }
  function tagged(tag, parts) {
    var len = 1; parts.forEach(function (p) { len += p.length; });
    var buf = new Uint8Array(len); buf[0] = tag; var off = 1;
    parts.forEach(function (p) { buf.set(p, off); off += p.length; });
    return buf;
  }
  function hashLeaf(s) { return sha256(tagged(0x00, [enc.encode(s)])); }
  function hashNode(l, r) { return sha256(tagged(0x01, [l, r])); }
  function computeRoot(hashes) {
    var cur = hashes.slice();
    function reduce() {
      if (cur.length === 1) return Promise.resolve(cur[0]);
      var pairs = [];
      for (var i = 0; i < cur.length; i += 2) pairs.push(hashNode(cur[i], i + 1 < cur.length ? cur[i + 1] : cur[i]));
      return Promise.all(pairs).then(function (n) { cur = n; return reduce(); });
    }
    return reduce();
  }
  function hex(b) { var s = ''; for (var i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, '0'); return s; }
  function shortHex(h) { return h.slice(0, 4) + '…' + h.slice(-4); }
  function fmt(n) { return Number(n).toLocaleString('en-US'); }

  /* ---------- hero schematic: the Merkle attestation tree ---------- */

  var FACTS = [
    { type: 'human_verified', value: 'true' },
    { type: 'phone_verified', value: 'true' },
    { type: 'wallet_verified', value: 'true' },
    { type: 'kyc_verified', value: 'true' },
    { type: 'jurisdiction', value: 'KZ' },
    { type: 'reputation_score', value: '91' },
    { type: 'agent_identity', value: 'true' },
    { type: 'accredited', value: '02a47c19e3b86f5d20c4a1f9387e6b2d915c0a84d7f3261e498b05ca6d13f7e29d', sealed: true }
  ];
  var AUTO_OPEN = 4; /* jurisdiction: KZ */

  var svg = document.getElementById('schematic');
  var rootEl = document.getElementById('root-hex');
  var caption = document.getElementById('sch-caption');
  var srOut = document.getElementById('sch-sr');
  var leaves = FACTS.map(function (f) { return f.type + ':' + f.value; });
  var leafHexes = [], rootHex = null, userTouched = false;
  var tiles = [], w01 = [], w12 = [], w2r = [], n1 = [], n2 = [], rootNode = null;

  function el(name, attrs) {
    var e = document.createElementNS(SVGNS, name);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    return e;
  }

  var leafCx = [], L1cx = [], L2cx = [];

  function buildSchematic() {
    var LEAF_TOP = 300, LEAF_W = 46, LEAF_H = 40;
    var i;
    for (i = 0; i < 8; i++) leafCx[i] = 36 + i * ((424 - 36) / 7);
    for (i = 0; i < 4; i++) L1cx[i] = (leafCx[2 * i] + leafCx[2 * i + 1]) / 2;
    for (i = 0; i < 2; i++) L2cx[i] = (L1cx[2 * i] + L1cx[2 * i + 1]) / 2;
    var ROOTX = 230, ROOTY = 58, L2Y = 132, L1Y = 212;

    function wire(x1, y1, x2, y2, d) {
      var p = el('path', { 'class': 'wire', pathLength: '1', d: 'M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 });
      p.style.setProperty('--d', d + 'ms');
      svg.appendChild(p);
      return p;
    }

    /* wires first (under nodes) */
    for (i = 0; i < 8; i++) w01[i] = wire(leafCx[i], LEAF_TOP, L1cx[i >> 1], L1Y + 8, 430 + i * 28);
    for (i = 0; i < 4; i++) w12[i] = wire(L1cx[i], L1Y - 8, L2cx[i >> 1], L2Y + 8, 650 + i * 34);
    for (i = 0; i < 2; i++) w2r[i] = wire(L2cx[i], L2Y - 8, ROOTX, ROOTY + 10, 800 + i * 40);

    /* annotation: bracket + label on the right */
    var lab = el('text', { 'class': 'sch-label blue', x: ROOTX + 22, y: ROOTY + 4 }); lab.textContent = 'root → on-chain (32 B)';
    svg.appendChild(lab);
    var lab2 = el('text', { 'class': 'sch-label', x: 36, y: 290 }); lab2.textContent = 'leaves = SHA-256(0x00 ‖ fact)';
    svg.appendChild(lab2);

    /* internal nodes */
    rootNode = el('circle', { 'class': 'node root', cx: ROOTX, cy: ROOTY, r: 10 });
    rootNode.style.setProperty('--d', '880ms'); svg.appendChild(rootNode);
    for (i = 0; i < 2; i++) { n2[i] = el('circle', { 'class': 'node', cx: L2cx[i], cy: L2Y, r: 8 }); n2[i].style.setProperty('--d', (690 + i * 45) + 'ms'); svg.appendChild(n2[i]); }
    for (i = 0; i < 4; i++) { n1[i] = el('circle', { 'class': 'node', cx: L1cx[i], cy: L1Y, r: 8 }); n1[i].style.setProperty('--d', (470 + i * 40) + 'ms'); svg.appendChild(n1[i]); }

    /* leaf tiles (tesserae) */
    for (i = 0; i < 8; i++) {
      var f = FACTS[i], cx = leafCx[i];
      var g = el('g', { 'class': 'leaf-tile' + (f.sealed ? ' sealed' : ''), tabindex: '0', role: 'button', 'aria-pressed': 'false' });
      g.setAttribute('aria-label', f.sealed
        ? 'leaf ' + (i + 1) + ', accredited — Pedersen commitment, sealed; activate to verify the predicate proof'
        : 'leaf ' + (i + 1) + ' — sealed hash; activate to disclose one attestation');
      g.appendChild(el('rect', { 'class': 'leaf-box', x: cx - LEAF_W / 2, y: LEAF_TOP, width: LEAF_W, height: LEAF_H }));
      var idx = el('text', { 'class': 'leaf-hash', x: cx, y: LEAF_TOP + 16, 'text-anchor': 'middle' });
      idx.textContent = 'L' + (i + 1); idx.style.opacity = '0.65';
      g.appendChild(idx);
      var h = el('text', { 'class': 'leaf-hash', x: cx, y: LEAF_TOP + 31, 'text-anchor': 'middle' });
      h.textContent = f.sealed ? 'C◇' : '····';
      h.setAttribute('data-hash', '1');
      g.appendChild(h);
      g.style.setProperty('--d', (80 + i * 40) + 'ms');
      svg.appendChild(g);
      tiles.push(g);
      (function (idx) {
        g.addEventListener('click', function () { userTouched = true; toggle(idx); });
        g.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); userTouched = true; toggle(idx); }
        });
        if (CAN_HOVER) g.addEventListener('mouseenter', function () {
          if (g.getAttribute('aria-pressed') !== 'true') { userTouched = true; open(idx, false); }
        });
      })(i);
    }
  }

  function setCaption(dim, learned, announce) {
    caption.innerHTML = '';
    var d = el2('span', 'cap-dim', dim); caption.appendChild(d);
    if (learned) { var g = el2('span', 'cap-learned', learned); caption.appendChild(g); }
    if (announce && srOut) srOut.textContent = learned ? dim + '. ' + learned : dim;
  }
  function el2(tag, cls, txt) { var e = document.createElement(tag); e.className = cls; e.textContent = txt; return e; }

  function clearLit() {
    [].concat(w01, w12, w2r).forEach(function (w) { w.classList.remove('lit'); });
    tiles.forEach(function (t, i) {
      t.setAttribute('aria-pressed', 'false');
      t.setAttribute('aria-label', FACTS[i].sealed
        ? 'leaf ' + (i + 1) + ', accredited — Pedersen commitment, sealed; activate to verify the predicate proof'
        : 'leaf ' + (i + 1) + ' — sealed hash; activate to disclose one attestation');
    });
  }

  function litPath(i) {
    var p1 = i >> 1, p2 = i >> 2;
    if (w01[i]) w01[i].classList.add('lit');
    if (w12[p1]) w12[p1].classList.add('lit');
    if (w2r[p2]) w2r[p2].classList.add('lit');
  }

  function open(i, announce) {
    clearLit();
    var t = tiles[i], f = FACTS[i];
    t.setAttribute('aria-pressed', 'true');
    litPath(i);
    if (f.sealed) {
      t.setAttribute('aria-label', 'leaf ' + (i + 1) + ', accredited — commitment stays sealed; predicate proved: income at least 50,000; activate to reset');
      setCaption('commitment stays sealed — the Bulletproof checks C − 50,000·G ≥ 0',
        'proved: income ≥ 50,000 — the value is never disclosed', announce);
      return;
    }
    t.setAttribute('aria-label', 'leaf ' + (i + 1) + ' — disclosed: ' + f.type + ' = ' + f.value + '; activate to reseal');
    setCaption('disclosed: leaf ' + String(i + 1).padStart(2, '0') + ' + inclusion path (3 siblings) — ' + (FACTS.length - 1) + ' leaves stay sealed',
      'verifier learned: ' + f.type + ' = ' + f.value + ' — and nothing else', announce);
  }

  function toggle(i) {
    if (tiles[i].getAttribute('aria-pressed') === 'true') { clearLit(); setCaption('activate a leaf — the other attestations stay sealed', null, true); }
    else open(i, true);
  }

  function setRoot(short) {
    rootEl.textContent = short;
  }

  function initSchematic() {
    if (!svg) return;
    buildSchematic();

    if (REDUCED) svg.classList.add('drawn');
    else requestAnimationFrame(function () { requestAnimationFrame(function () { svg.classList.add('drawn'); }); });

    if (!subtle) { setRoot('(needs https/localhost)'); return; }

    Promise.all(leaves.map(hashLeaf)).then(function (hs) {
      leafHexes = hs.map(hex);
      tiles.forEach(function (t, i) {
        if (!FACTS[i].sealed) { var h = t.querySelector('[data-hash]'); if (h) h.textContent = leafHexes[i].slice(0, 4); }
      });
      return computeRoot(hs);
    }).then(function (root) {
      rootHex = hex(root);
      var delay = REDUCED ? 0 : 1150;
      setTimeout(function () {
        setRoot('0x' + shortHex(rootHex));
        if (REDUCED) open(AUTO_OPEN, false);
        else setTimeout(function () { if (!userTouched) open(AUTO_OPEN, false); }, 500);
      }, delay);

      window.tessera = {
        leaves: leaves.slice(), leafHashes: leafHexes.slice(), root: rootHex,
        verifyRoot: function () {
          return Promise.all(leaves.map(hashLeaf)).then(computeRoot).then(function (r) {
            var ok = hex(r) === rootHex;
            console.log('leaves:', leaves);
            console.log('recomputed root: 0x' + hex(r));
            console.log('displayed root:  0x' + rootHex);
            console.log(ok ? 'match — the hero schematic is a real Merkle tree.' : 'MISMATCH');
            return ok;
          });
        }
      };
      console.info('%ctessera%c run tessera.verifyRoot() — recomputes the hero Merkle root from its 8 leaves (SHA-256, leaf 0x00 / node 0x01, same scheme as Tessera.Attestations.MerkleTree)', 'color:#28489E;font-weight:bold', 'color:inherit');
    });
  }

  /* ---------- proof demo (illustrative simulation) ---------- */

  function initDemo() {
    var income = document.getElementById('income');
    var incomeOut = document.getElementById('income-out');
    var commitmentEl = document.getElementById('commitment');
    var threshold = document.getElementById('threshold');
    var checkBtn = document.getElementById('check-btn');
    var verdict = document.getElementById('verdict');
    var verdictLine = document.getElementById('verdict-line');
    if (!income) return;

    function idle() {
      if (verdict.getAttribute('data-state') === 'idle') return;
      verdict.setAttribute('data-state', 'idle');
      verdictLine.innerHTML = 'press <em>verify proof</em> — the lender checks the bound proof against the commitment';
    }
    function updateCommitment() {
      incomeOut.textContent = fmt(income.value);
      if (!subtle) { commitmentEl.textContent = '02… (needs https/localhost)'; return; }
      var v = income.value;
      sha256(enc.encode('tessera-demo|income|' + v)).then(function (h) { if (income.value === v) commitmentEl.textContent = '02' + hex(h); });
    }
    function check() {
      var v = Number(income.value), t = Number(threshold.value);
      if (!Number.isFinite(t) || t <= 0) { verdict.setAttribute('data-state', 'idle'); verdictLine.textContent = 'enter a positive threshold, then verify'; return; }
      var predicate = 'income ≥ ' + fmt(t);
      if (v >= t) {
        verdict.setAttribute('data-state', 'valid');
        verdictLine.innerHTML = 'credit line approved — the lender learned only <span class="learned">“' + predicate + '”</span>';
      } else {
        verdict.setAttribute('data-state', 'invalid');
        verdictLine.textContent = 'declined — no valid proof exists for “' + predicate + '”; the lender learned nothing else';
      }
    }
    income.addEventListener('input', function () { updateCommitment(); idle(); });
    threshold.addEventListener('input', idle);
    checkBtn.addEventListener('click', check);
    updateCommitment();
  }

  /* ---------- copy buttons ---------- */

  function initCopy() {
    var sr = document.createElement('output'); sr.className = 'visually-hidden'; document.body.appendChild(sr);
    function flash(btn, label, cls, say) {
      btn.classList.remove('copied', 'failed'); if (cls) btn.classList.add(cls);
      btn.textContent = label; sr.textContent = say;
      clearTimeout(btn._t);
      btn._t = setTimeout(function () { btn.classList.remove('copied', 'failed'); btn.textContent = 'copy'; sr.textContent = ''; }, 1500);
    }
    function legacy(text) {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.left = '-9999px'; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta); return ok;
    }
    document.querySelectorAll('.copy-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-copy');
        if (!text) { var pre = btn.parentElement.querySelector('pre code'); if (pre) text = pre.textContent; }
        if (!text) return;
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(
          function () { flash(btn, 'copied', 'copied', 'Copied'); },
          function () { flash(btn, 'failed', 'failed', 'Copy failed'); });
        else if (legacy(text)) flash(btn, 'copied', 'copied', 'Copied');
        else flash(btn, 'failed', 'failed', 'Copy failed');
      });
    });
  }

  /* ---------- flow schematic: draw on scroll (once) ---------- */

  function initFlow() {
    var f = document.getElementById('flow-schematic');
    if (!f) return;
    if (REDUCED || !('IntersectionObserver' in window)) { f.classList.add('seen'); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { f.classList.add('seen'); io.disconnect(); } });
    }, { threshold: 0.25 });
    io.observe(f);
  }

  initSchematic();
  initDemo();
  initCopy();
  initFlow();
})();
