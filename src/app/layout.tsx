import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/shared/AuthSessionProvider";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Be-Nice Catering Services | Authentic Ghanaian Cuisine",
  description:
    "Order online, scan a table QR code, or visit us in Community 5, Tema. Authentic Ghanaian cuisine made with tradition — powered by Coratech Restaurant OS.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bn-cream text-bn-charcoal">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
