import type { Metadata } from "next";
import { Geist, Noto_Sans_JP } from "next/font/google";
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

export const metadata: Metadata = {
  title: "シフトカレンダー",
  description: "今月のシフトを確認するカレンダー",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${notoSansJp.variable} h-full antialiased`}
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
