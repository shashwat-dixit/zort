import type { Metadata } from "next";
import { Poppins } from "next/font/google"
import "./globals.css";

const poppins = Poppins({
  subsets: ['latin'],
  display: "swap",
  weight: ["400", "600", "800"],
})

export const metadata: Metadata = {
  title: "Zort | Whiteboard",
  description: "A collaborative whiteboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={poppins.className}>
      <body
        className="antialiased"
      >
        {children}
      </body>
    </html>
  );
}
