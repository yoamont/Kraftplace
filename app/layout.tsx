import type { Metadata } from "next";
import Link from "next/link";
import { Inter, Geist_Mono, Playfair_Display } from "next/font/google";
import CookieConsent from "@/components/CookieConsent";
import ConditionalAnalytics from "@/components/ConditionalAnalytics";
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
  title: {
    default: "Kraftplace — Le trait d'union entre marques et boutiques",
    template: "%s | Kraftplace",
  },
  description: "Kraftplace met en relation les marques artisanales et éthiques avec les boutiques engagées. Trouvez votre prochain partenariat.",
  metadataBase: new URL("https://kraftplace.fr"),
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://kraftplace.fr",
    siteName: "Kraftplace",
    title: "Kraftplace — Le trait d'union entre marques et boutiques",
    description: "Kraftplace met en relation les marques artisanales et éthiques avec les boutiques engagées.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kraftplace",
    description: "Mise en relation marques artisanales et boutiques engagées.",
  },
  robots: {
    index: true,
    follow: true,
  },
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
        <CookieConsent />
        <ConditionalAnalytics />
      </body>
    </html>
  );
}
