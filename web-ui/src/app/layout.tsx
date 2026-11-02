import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

// Same typeface as mobile-ui; exposed as --font-manrope for the `font-sans` token.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Broadcastly",
  description: "Official communication for party executives.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
