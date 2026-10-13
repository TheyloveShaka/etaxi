# eTaxi pitch site

One-page scroll story for a concept: electric 14-seater public taxis for Kampala plus a rider app. Kaga build, Track D. Read `docs/PROGRESS.md` first.

## Commands

- Dev: launch config `etaxi` (port 4310). Production preview: `etaxi-prod` (port 4312) after `npm run build`. Never start servers from a shell.
- QA, from the project root: `node scripts/qa/journey.cjs <url> <tag> <w> <h> "<fractions>"` then `python scripts/qa/sheet.py <tag>-<w>`; `node scripts/qa/checks.cjs <url>`; `node scripts/qa/perf.cjs <url>`; `node scripts/qa/signs.cjs`.

## Shape

- Vite + TypeScript, no framework, no Tailwind. GSAP with ScrollTrigger, MotionPathPlugin, CustomEase.
- `src/hero.ts` is the load roll-in. `src/journey.ts` is the whole scroll rig: one sticky view, one scrubbed timeline, a camera-driven world layer. No ScrollTrigger pins.
- Styles: `tokens.css` is the only place colours and sizes live. Kaga edits colours there.
- `html[data-motion]` is `on` or `off`. Off (reduced motion, Save-Data, no JS) gets the static stack in `static.css`.

## Rules that cost a round to learn

- The hero composition, copy and roll-in are approved. Do not change them without Kaga.
- Road and ground band are ink black. The vertical road is centred at 50vw on desktop so it runs into the aisle of the arrival photo.
- Uganda drives on the left: heading down the screen the eTaxi is in the screen-right lane, and stage signs sit on its kerb side.
- The van images are generated. Roof sign, T roundel and extra dash squares are drawn by `scripts/dress_van.py`; wheel overlays and their percentages come from the same script. Re-run it if the van changes.
- Demo screens are `inert` with a `role="img"` label. Do not make them focusable.
- The main buttons open `concept.html`, the concept page that carries the two proposal PDFs. Fares on screens are examples. No invented statistics.
- No em dashes anywhere. No narrating comments. Only Panchang and Switzer.
- Never name anything "Kayoola".

## Proposal

- Sources: `proposal/detailed.html`, `proposal/summary.html`, styled by `proposal/print.css` (A4, same tokens and fonts). Research with citations is in `docs/proposal/`.
- Render: `node scripts/render_pdf.cjs` writes `public/docs/eTaxi-Proposal.pdf` and `public/docs/eTaxi-Executive-Summary.pdf`, with contents-page numbers filled by `scripts/toc_pages.py`. Check pages with `python scripts/pdf_sheet.py <pdf> <out.jpg>`.
- Hosting: GitHub Pages at https://theyloveshaka.github.io/etaxi/ via `.github/workflows/pages.yml`, which builds with `ETAXI_BASE=/etaxi/`. This folder is its own git repo; never push from the home-directory repo above it.
