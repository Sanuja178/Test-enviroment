import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sesame Street Leadership Survey",
  description: "Discover your leadership archetype — inspired by Sesame Street",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
