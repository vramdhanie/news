# News

[![Deploy](https://img.shields.io/github/actions/workflow/status/vramdhanie/news/deploy.yml?branch=main&label=deploy&logo=github)](https://github.com/vramdhanie/news/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/github/license/vramdhanie/news?color=green)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

A personal, opinion-free news feed — one chronological list, each headline
tagged by category: world, science, technology, AI, the SF Bay Area, and
Trinidad & Tobago. Fully static, no server, no database, no API keys.

Live at [news.vincentramdhanie.com](https://news.vincentramdhanie.com).

## How it works

- A **Claude routine** (scheduled cloud agent, 9 am / 2 pm / 6 pm PT) runs
  `scripts/fetch-news.mjs` to pull the RSS/Atom feeds listed in
  [`src/config/feeds.json`](src/config/feeds.json), then edits the result:
  it consolidates items covering the same story (multiple sources per item),
  writes a concise factual summary of each story's main points, and drops
  items with no news value. The finished `public/data/news.json` is
  force-pushed to a `data` branch (always one commit ahead of `main`).
- **Deploy** (`deploy.yml`) fires on pushes to `main` or `data`: it checks
  out `main`, overlays `public/data` from the `data` branch, builds the
  static export, and publishes to GitHub Pages.

The browser only reads the static JSON. Headlines link out to their original
sources — nothing is republished.

## Keeping it factual

Three structural levers, no AI involved:

1. Wire-style sources whose news register is factual (BBC, NPR, KQED, …).
2. Section feeds only — never home-page feeds, where op-eds live.
3. A filter that drops items whose URL or title marks them as
   opinion/comment/editorial/analysis/column pieces.

## Editing the feed list

Everything is in `src/config/feeds.json`: categories (label + tag colour) and
feeds (category, display name, URL). Add or remove entries and push. Feeds
that fail are skipped and logged — partial news beats none.

## Local development

```bash
npm install
npm run fetch-news   # a few seconds, keyless -> public/data/news.json
npm run dev
```

## Deployment (one-time setup)

1. Create the GitHub repo and push to `main`.
2. Repo **Settings → Pages**: set *Source* to **GitHub Actions**; custom
   domain `news.vincentramdhanie.com` (enforce HTTPS once issued).
3. DNS: CNAME record `news` → `vramdhanie.github.io`.
4. No secrets required — the feeds are all keyless.

Consolidated items carry a `sources` array (`{name, url}` per outlet); the
UI also renders the raw single-source shape the fetch script emits, so a
plain `npm run fetch-news` output still displays.
