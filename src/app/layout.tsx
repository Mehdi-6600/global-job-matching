import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import { Footer } from "@/components/footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Global Job Matching",
  description: "Find your dream job worldwide with Global Job Matching.",
  openGraph: {
    title: "Global Job Matching",
    description: "Find your dream job worldwide with Global Job Matching.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Global Job Matching",
    description: "Find your dream job worldwide with Global Job Matching.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
