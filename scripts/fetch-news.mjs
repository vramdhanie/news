#!/usr/bin/env node
/**
 * Fetches the RSS/Atom feeds listed in src/config/feeds.json and writes a
 * single normalized public/data/news.json. Runs in GitHub Actions on a
 * 3-hour schedule (or locally) — never in the browser, where CORS would
 * block the feeds anyway. Entirely keyless.
 *
 * Design goals:
 *  - factual-register feed: section feeds only, plus a URL/title filter
 *    that drops opinion/comment/editorial/analysis pieces
 *  - tolerant of individual feed failures (partial data beats no data)
 *  - no npm dependencies (a small forgiving parser for RSS 2.0 and Atom)
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "public", "data");

const MAX_AGE_HOURS = 72;      // drop anything older than 3 days
const MAX_PER_FEED = 15;       // cap each feed's contribution
const MAX_TOTAL = 200;         // overall cap after sorting
const FETCH_TIMEOUT_MS = 20000;

// Opinion filter: publishers route opinion through URL sections, and most
// label the register in the title. Both checks are cheap and structural.
const OPINION_URL = /\/(opinion|opinions|comment|commentisfree|editorial|editorials|analysis|column|columnists|blogs?)\//i;
const OPINION_TITLE = /^(opinion|editorial|analysis|comment|column|perspective|viewpoint|letters?)\s*[:|—-]/i;

const decodeEntities = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

const stripHtml = (s) => decodeEntities(s).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1].trim() : "";
}

/** Parse RSS 2.0 <item> and Atom <entry> blocks from a feed body. */
function parseFeed(xml) {
  const items = [];
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  for (const block of blocks) {
    const title = stripHtml(tag(block, "title"));
    // Atom links are attributes; RSS links are element text
    let link = stripHtml(tag(block, "link"));
    if (!link) {
      const m = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i) ??
        block.match(/<link[^>]*href=["']([^"']+)["']/i);
      link = m ? decodeEntities(m[1]) : "";
    }
    const dateRaw =
      tag(block, "pubDate") || tag(block, "published") || tag(block, "updated") || tag(block, "dc:date");
    const summaryRaw = tag(block, "description") || tag(block, "summary") || tag(block, "content");
    const source = stripHtml(tag(block, "source"));
    if (!title || !link) continue;
    const date = new Date(decodeEntities(dateRaw));
    items.push({
      title,
      url: link,
      publishedAt: Number.isNaN(date.getTime()) ? null : date.toISOString(),
      summary: stripHtml(summaryRaw).slice(0, 280),
      itemSource: source || null,
    });
  }
  return items;
}

/** Google News wraps everything: titles end " - Source", links redirect,
 * and summaries are markup soup. Clean all three. */
function cleanGoogleNews(item) {
  const m = item.title.match(/^(.*)\s-\s([^-]+)$/);
  if (m) {
    item.title = m[1].trim();
    item.itemSource = item.itemSource || m[2].trim();
  }
  item.summary = ""; // Google News summaries just restate the title
  return item;
}

const normTitle = (t) => t.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

async function fetchFeed(feed) {
  const res = await fetch(feed.url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "User-Agent": "vincentramdhanie.com news aggregator (personal use)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  let items = parseFeed(xml);
  if (/news\.google\.com/.test(feed.url)) items = items.map(cleanGoogleNews);
  return items.slice(0, MAX_PER_FEED).map((it) => ({
    ...it,
    source: it.itemSource || feed.name,
    category: feed.category,
  }));
}

async function main() {
  const config = JSON.parse(await readFile(path.join(ROOT, "src", "config", "feeds.json"), "utf8"));
  await mkdir(DATA_DIR, { recursive: true });

  const cutoff = Date.now() - MAX_AGE_HOURS * 3600 * 1000;
  const all = [];
  const errors = [];

  const results = await Promise.allSettled(config.feeds.map((f) => fetchFeed(f)));
  results.forEach((r, i) => {
    const feed = config.feeds[i];
    if (r.status === "fulfilled") {
      console.log(`ok    ${feed.name}: ${r.value.length} items`);
      all.push(...r.value);
    } else {
      console.error(`FAIL  ${feed.name}: ${r.reason.message}`);
      errors.push(feed.name);
    }
  });

  const seenUrl = new Set();
  const seenTitle = new Set();
  const items = all
    .filter((it) => !OPINION_URL.test(it.url) && !OPINION_TITLE.test(it.title))
    .filter((it) => it.publishedAt && new Date(it.publishedAt).getTime() >= cutoff)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .filter((it) => {
      const t = normTitle(it.title);
      if (seenUrl.has(it.url) || seenTitle.has(t)) return false;
      seenUrl.add(it.url);
      seenTitle.add(t);
      return true;
    })
    .slice(0, MAX_TOTAL)
    .map((it, i) => ({ id: i, ...it, itemSource: undefined }));

  await writeFile(
    path.join(DATA_DIR, "news.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), failedFeeds: errors, items }, null, 1),
  );
  console.log(`\nwrote public/data/news.json: ${items.length} items, ${errors.length} failed feed(s)`);
  // Only die if literally everything failed — partial news beats none.
  if (items.length === 0) process.exit(1);
}

main();
