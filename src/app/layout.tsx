import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://news.vincentramdhanie.com"),
  title: "News — Vincent Ramdhanie",
  description:
    "Vincent Ramdhanie's personal news feed — factual headlines from wire-style sources: world, science, technology, AI, the SF Bay Area, and Trinidad & Tobago.",
  authors: [{ name: "Vincent Ramdhanie", url: "https://vincentramdhanie.com" }],
  creator: "Vincent Ramdhanie",
  openGraph: {
    type: "website",
    url: "https://news.vincentramdhanie.com/",
    siteName: "News",
    title: "News — Vincent Ramdhanie",
    description:
      "A personal, opinion-free news feed: world, science, technology, AI, the SF Bay Area, and Trinidad & Tobago.",
  },
  twitter: {
    card: "summary",
    title: "News — Vincent Ramdhanie",
    description:
      "A personal, opinion-free news feed: world, science, technology, AI, the SF Bay Area, and Trinidad & Tobago.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
