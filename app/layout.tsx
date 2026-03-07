import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Geist_Mono, Playfair_Display } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kraftplace",
  description: "Mise en relation marques et boutiques",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${inter.variable} ${geistMono.variable} ${playfair.variable} antialiased`}
      >
        <div className="sticky top-0 z-[100] w-full h-9 flex items-center justify-center bg-[#1A1A1A] text-white py-1.5 px-4">
          <span className="text-[11px] sm:text-xs font-medium">
            Version Pilote : Kraftplace grandit avec vous.{' '}
            <Link
              href="/mentions-legales"
              className="underline underline-offset-2 hover:no-underline"
            >
              En savoir plus
            </Link>
          </span>
        </div>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
