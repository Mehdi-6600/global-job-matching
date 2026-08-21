import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Global Job Matching - AI-Powered Job Matching Platform",
  description: "Find your dream job anywhere with AI-powered global job matching.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased flex flex-col min-h-screen`}>
        <div className="flex-grow">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
