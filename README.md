# Tessera — marketing one-pager

Static one-page site for [Tessera](https://github.com/asagynbaev/Tessera), privacy-preserving
identity & reputation infrastructure for .NET. Vanilla HTML/CSS/JS — no framework, no build step.

## Local preview (one command)

```bash
npx serve .
```

or, with Python:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`. Serve over `localhost` (or any HTTPS origin): the hero schematic
computes real SHA-256 Merkle hashes with WebCrypto, which requires a secure context.

## Design

An engineering-blueprint aesthetic: paper ground with a faint construction grid, cobalt drafting ink,
titleblock sheet numbers, cyanotype (negative) code wells, and approval/redline stamps. Type is
**Archivo** (display/body) + **IBM Plex Mono** (drafting labels, hashes, code). Motion is structural —
the hero Merkle tree and the Issuer→Holder→Verifier flow draw themselves (SVG stroke-dashoffset), and
disclosing a leaf lights its inclusion path. Everything has a full `prefers-reduced-motion` fallback.

## What's in here

```
index.html        the page (all content inline, semantic HTML)
styles.css        design system — blueprint palette, type, layout, reduced-motion fallback
main.js           schematic Merkle engine (real root), proof demo, tabs, copy, scroll-draw
assets/
  fonts/          self-hosted woff2 subsets (Archivo variable, IBM Plex Mono 400/500)
  favicon.svg     blueprint tessera-node favicon (vector)
  favicon-32.png  raster fallback
  apple-touch-icon.png
  og.png          1200×630 Open Graph image (blueprint Merkle schematic)
  og-source.html  source the OG image is rendered from (headless Chromium screenshot)
  icon-source.html  source for the raster icons
```

## Deploy

The folder is deploy-ready as-is:

- **Vercel**: `vercel deploy` from this directory (it is detected as a static site), or import the
  repo and set the framework preset to "Other".
- **GitHub Pages**: push and enable Pages on the branch root.

After deploying, set the `og:image` meta in `index.html` to the **absolute** URL of
`assets/og.png` on your domain — crawlers do not resolve relative OG paths reliably.

`vercel.json` sets `Cache-Control: must-revalidate` on all paths so a redeploy never serves a
stale `styles.css`/`main.js` from the browser cache. The `styles.css?v=N` / `main.js?v=N` query
strings are a second cache-bust — bump `N` whenever you change the CSS or JS. If a returning
visitor still sees an old layout, it is browser cache: a hard refresh (Ctrl/Cmd+Shift+R) clears it.

## A note on the hero schematic

The hero Merkle tree is not decoration: the 8 leaf hashes and the root are computed in the browser
using the same domain-separated SHA-256 scheme as `Tessera.Attestations.MerkleTree` (leaf tag `0x00`,
node tag `0x01`, odd node duplicated). Open the devtools console and run `tessera.verifyRoot()` to
recompute it (the displayed root `0xc501…a0ba` is independently reproducible). The attested facts are
sample data; the proof demo is an illustrative simulation and is labeled as such on the page.

## Regenerating raster assets

```powershell
# OG image (1200×630)
msedge --headless --disable-gpu --window-size=1200,630 --screenshot=assets/og.png assets/og-source.html
# icon master (then resize to 32 / 180)
msedge --headless --disable-gpu --window-size=512,512 --screenshot=assets/icon-512.png assets/icon-source.html
```

## License

Site content mirrors the Tessera README (MIT).
