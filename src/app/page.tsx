"use client";

import { useEffect, useState } from "react";

import config from "@/config/feeds.json";

interface NewsItem {
  id: number;
  title: string;
  url: string;
  source: string;
  category: string;
  publishedAt: string;
  summary: string;
}

interface NewsFile {
  generatedAt: string;
  failedFeeds: string[];
  items: NewsItem[];
}

const CATEGORIES = config.categories as Record<string, { label: string; color: string }>;

function relativeTime(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

/** Local-timezone day heading: Today, Yesterday, or a date. */
function dayHeading(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

function Tag({ category }: { category: string }) {
  const cat = CATEGORIES[category];
  if (!cat) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2 py-px text-[10px] font-medium uppercase tracking-wider text-neutral-400"
      title={cat.label}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
      {cat.label}
    </span>
  );
}

export default function Home() {
  const [data, setData] = useState<NewsFile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/data/news.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          News<span className="text-neutral-500">.</span>
        </h1>
        {data && (
          <p className="text-xs text-neutral-500">updated {relativeTime(data.generatedAt)}</p>
        )}
      </header>

      {loading && (
        <p className="animate-pulse py-16 text-center text-sm text-neutral-500">Loading…</p>
      )}

      {!loading && !data && (
        <div className="rounded-lg border border-dashed border-white/15 p-8 text-center text-sm text-neutral-400">
          <p className="font-medium text-neutral-300">No data yet</p>
          <p className="mt-2">
            Run <code className="rounded bg-white/10 px-1.5 py-0.5">npm run fetch-news</code> to
            populate <code className="rounded bg-white/10 px-1.5 py-0.5">public/data/</code>.
          </p>
        </div>
      )}

      {data && (
        <ol className="space-y-0">
          {data.items.map((item, i) => {
            const heading = dayHeading(item.publishedAt);
            const showHeading =
              i === 0 || dayHeading(data.items[i - 1].publishedAt) !== heading;
            return (
              <li key={item.id}>
                {showHeading && (
                  <h2 className="mt-8 mb-3 border-b border-white/10 pb-2 text-xs font-semibold uppercase tracking-widest text-neutral-500 first:mt-0">
                    {heading}
                  </h2>
                )}
                <article className="group py-3">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    <Tag category={item.category} />
                    <span>{item.source}</span>
                    <span aria-hidden>·</span>
                    <time dateTime={item.publishedAt}>{relativeTime(item.publishedAt)}</time>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[17px] font-medium leading-snug text-neutral-100 underline-offset-2 hover:underline"
                  >
                    {item.title}
                  </a>
                  {item.summary && (
                    <p className="mt-1 max-w-prose text-sm leading-relaxed text-neutral-400">
                      {item.summary}
                    </p>
                  )}
                </article>
              </li>
            );
          })}
        </ol>
      )}

      <footer className="mt-14 border-t border-white/10 py-6 text-center text-xs text-neutral-500">
        <p>
          <a
            href="https://vincentramdhanie.com"
            className="text-neutral-400 underline-offset-2 hover:text-white hover:underline"
          >
            ← Back to vincentramdhanie.com
          </a>
        </p>
        <p className="mt-2">
          Headlines link to their original sources. Refreshed every 3 hours from public RSS feeds;
          opinion and editorial sections are filtered out.
        </p>
      </footer>
    </div>
  );
}
