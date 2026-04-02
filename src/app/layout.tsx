import type { Metadata } from "next";
import { Inter, Orbitron } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" });

export const metadata: Metadata = {
  title: "ShadowTrace | AI SOC Simulator",
  description: "Real-time AI-powered cyber threat monitoring and analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${orbitron.variable} bg-cyber-dark text-white antialiased overflow-x-hidden`}>
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,242,255,0.03),transparent_70%)]" />
          <div className="scanline" />
        </div>
        {children}
      </body>
    </html>
  );
}
