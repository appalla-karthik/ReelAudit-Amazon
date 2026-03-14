import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { AmazonNovaCursor } from "./amazon-nova-cursor";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Reel Audit - Global AI Video Compliance Engine",
  description:
    "Reel Audit dashboard for AI-driven, multi-market video compliance review.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${spaceGrotesk.variable} ${manrope.variable} bg-[#F5F7FB] text-slate-900 antialiased`}
      >
        <AmazonNovaCursor />
        {children}
      </body>
    </html>
  );
}
