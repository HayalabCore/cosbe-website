# JP legacy site parity spike — design

**Date:** 2026-05-12  
**Status:** Approved for research spike (no product code changes required by this document)

## Context

The marketing site at `https://www.jp.cosbe.inc/` is the historical Japanese source. This repository (`cosbe-website`) serves **English and Japanese** under locale-prefixed routes (e.g. `/ja/ai-lab`). Product intent: **Japanese UX and copy should align with the legacy site**, with paths rewritten to the new structure (example: legacy `/ailabo/` → `/ja/ai-lab`). The team needs a **spike** to discover where the current app has **diverged** from the legacy site.

## Goals

1. Produce a **repeatable inventory** of legacy URLs on `www.jp.cosbe.inc`.
2. Maintain a **hand-authored path map** from legacy paths to Next.js routes (at minimum `/ja/...`).
3. Produce a **gap report** for: global chrome (navbar, footer), every path-map row, and CMS-linked surfaces where applicable — without boiling the ocean on every long-tail URL.

## Non-goals (this spike)

- Pixel-perfect layout, motion, or component-level visual regression.
- Fixing divergences in application code (follow-up work).
- Defining final English copy (EN may remain “best effort” until a later pass).

## Strategy (locked)

### Hybrid inventory + targeted diff (“C”)

- **Inventory:** Crawl / enumerate URLs from the legacy origin so orphans and forgotten pages surface in a spreadsheet.
- **Deep compare:** Only for (1) navbar and footer, (2) every entry in the path map, (3) legacy URLs still linked from chrome but not yet mapped (record as **map gaps**, diff after mapping).

### Execution style (“Option 2”)

- **Scripted crawl → CSV** (or equivalent) for URL discovery and HTTP status (and optional lightweight metadata such as `<title>`).
- **Manual or semi-automated diff** for in-scope pages: normalize extracted legacy text (headings, nav labels, main body as needed) and compare to the current app’s Japanese surface (`messages/ja.json`, `[locale]` pages, and CMS-backed content).

### Crawling policy

- **Do not use `robots.txt` as a gate** for this work: it is an **authorized internal parity** exercise against the team’s own property.
- **Still recommended:** configurable **rate limiting** and concurrency caps so the crawl does not accidentally overload hosting or trigger WAF throttling. This is operational hygiene, not robots compliance.

## Content surfaces in this repo (for diff planning)

| Surface                 | Where it lives                                                          | Parity notes                                                                                                      |
| ----------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Global nav              | `src/components/layout/Navbar.tsx` + `messages/ja.json` (`navbar` keys) | Label text and href targets vs legacy chrome.                                                                     |
| Footer                  | Footer component(s) + `messages/ja.json`                                | Same as nav.                                                                                                      |
| Static marketing pages  | `src/app/[locale]/...`                                                  | Section order, headings, body copy, CTAs.                                                                         |
| CMS articles / listings | Prisma-backed content (see `CLAUDE.md`)                                 | Slug presence, titles, listing membership; full block-by-block parity is optional unless explicitly scoped later. |

## Deliverables

1. **`legacy_inventory.csv`** (name flexible): columns at minimum `legacy_url`, `http_status`, optional `html_title`, `notes` (redirect chains, fetch errors).
2. **`path_map.csv`**: `legacy_path` or pattern → `next_path_ja` (and optional `next_path_en` / `TBD`). Example row: `/ailabo/` → `/ja/ai-lab`.
3. **`parity_gaps.md`**: one section per in-scope target (or per gap type) listing: missing section, copy mismatch, wrong internal link, missing asset, missing CMS record, **unmapped legacy URL** (candidate for redirect or new map row).

## Process

1. **Bootstrap path map** with known pairs (e.g. `/ailabo/` → `/ja/ai-lab`); extend as crawl finds linked legacy paths that correspond to app routes.
2. **Run inventory** from the legacy origin (start URL + sitemap if available + bounded link BFS). Emit CSV.
3. **Merge** inventory rows with path map; tag rows as `in_scope_diff` / `inventory_only` / `map_gap`.
4. **Deep compare** `in_scope_diff` rows; append findings to `parity_gaps.md`.
5. **Review pass:** ensure nav/footer links from legacy appear either in the map or explicitly deferred with rationale.

## Success criteria

- [ ] Inventory CSV covers all URLs reachable within configured crawl limits (document limits in the spike README or script comments).
- [ ] Path map covers every legacy URL targeted by navbar/footer on the legacy site, or explicitly lists a deferral.
- [ ] Gap report lists concrete next actions (file paths, message keys, slugs, or “add redirect”) without vague “check later” placeholders where a diff was performed.

## Open follow-ups (post-spike)

- Implement **redirects** from legacy paths to `/ja/...` where SEO and bookmarks matter (separate design if hosting stack differs).
- Optional: promote high-value scripts into repo `scripts/` with README for re-running the audit before releases.
