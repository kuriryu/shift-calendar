import type { Metadata } from "next";
import { Geist, Inter, Noto_Sans_JP } from "next/font/google";
import SmartHRProvider from "@/components/SmartHRProvider";
import "smarthr-ui/smarthr-ui.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-brand",
  subsets: ["latin"],
});

const siteUrl = "https://monthly-shift-calendar.vercel.app";
const siteTitle = "Shift Kit";
const siteDescription =
  "シフトの事務作業をスマートに。希望の収集からシフト作成まで、面倒な作業を減らします。";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: siteUrl,
    siteName: siteTitle,
    title: siteTitle,
    description: siteDescription,
    images: [{ url: `${siteUrl}/ogp.png`, width: 1200, height: 630, alt: siteTitle }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [`${siteUrl}/ogp.png`],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${notoSansJp.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <SmartHRProvider>{children}</SmartHRProvider>
      </body>
    </html>
  );
}
