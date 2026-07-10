import type { Metadata, Viewport } from "next"
import { AuthProvider } from "@/components/auth/auth-context"
import { TeamThemeProvider } from "@/components/auth/team-theme"
import { MobileNav } from "@/components/layout/mobile-nav"
import { NavProvider } from "@/components/layout/nav-context"
import { CookieConsent } from "@/components/consent/cookie-consent"
import { AnalyticsTracker } from "@/components/consent/analytics-tracker"
import { Toaster } from "sonner"
import "./globals.css"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
const title = "PADDOCK — F1 community, live timing и статистика"
const description = "Русскоязычное F1-комьюнити: новости, обсуждения, live timing, статистика сезонов, fantasy-прогнозы и паблики болельщиков."

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s | PADDOCK",
  },
  description,
  applicationName: "PADDOCK",
  keywords: [
    "F1",
    "Формула 1",
    "live timing",
    "Jolpica",
    "OpenF1",
    "статистика F1",
    "F1 community",
    "Ф1 новости",
    "календарь Формулы 1",
  ],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/paddock-icon.svg",
    apple: "/paddock-icon.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    title,
    description,
    type: "website",
    locale: "ru_RU",
    siteName: "PADDOCK",
    url: "/",
    images: [
      {
        url: "/paddock-og.svg",
        width: 1200,
        height: 630,
        alt: "PADDOCK — F1 community, live timing и статистика",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PADDOCK — F1 community",
    description: "Новости, live timing, статистика и обсуждения Формулы 1.",
    images: ["/paddock-og.svg"],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="h-full">
      <body className="min-h-full flex flex-col md:pb-0 pb-16">
          <AuthProvider>
            <TeamThemeProvider>
              <NavProvider>
                {children}
                <MobileNav />
                <AnalyticsTracker />
                <CookieConsent />
              </NavProvider>
            </TeamThemeProvider>
            <Toaster
              position="bottom-center"
              richColors
              closeButton
              toastOptions={{
                style: {
                  background: "var(--color-glass-bg)",
                  border: "1px solid var(--color-border-default)",
                  color: "var(--color-text-primary)",
                  backdropFilter: "blur(16px) saturate(140%)",
                  borderRadius: "var(--radius-lg)",
                },
              }}
            />
          </AuthProvider>
      </body>
    </html>
  )
}
