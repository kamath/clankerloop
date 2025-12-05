import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { QueryClientProviderWrapper } from "./providers";
import { Comic_Relief } from "next/font/google";
import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components";
import { Analytics } from "@vercel/analytics/next";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

const comicRelief = Comic_Relief({
  weight: "700",
  subsets: ["latin"],
  variable: "--font-comic-relief",
});

export const metadata: Metadata = {
  title: "ClankerLoop",
  description:
    "ClankerLoop is a platform for creating and solving coding interview problems, powered by AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${comicRelief.variable}`}
      >
        <Analytics />
        <AuthKitProvider>
          <QueryClientProviderWrapper>{children}</QueryClientProviderWrapper>
        </AuthKitProvider>
      </body>
    </html>
  );
}
