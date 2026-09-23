import type { Metadata } from "next";
import { Bitter, Inter } from "next/font/google";
import "./globals.css";

const heading = Bitter({
  variable: "--font-heading",
  subsets: ["latin", "latin-ext"],
  weight: ["700", "800"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Personalizovaná detská kniha – prototyp",
  description: "Prototyp hero sekcie: scroll-viazaná animácia listovania knihou.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="sk"
      className={`${heading.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body bg-white text-ink">
        {children}
      </body>
    </html>
  );
}
