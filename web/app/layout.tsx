import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Zero-knowledge workspace",
  description: "Anonymous collaboration with verifiable membership"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen`}>
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">
          <header className="flex items-center justify-between border-b border-white/10 pb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              anon<span className="text-primary-500">.org</span>
            </h1>
            <nav className="flex items-center gap-4 text-sm text-slate-300">
              <a href="/" className="transition hover:text-white">
                Overview
              </a>
              <a href="/admin" className="transition hover:text-white">
                Admin console
              </a>
              <a href="/member" className="transition hover:text-white">
                Member workspace
              </a>
            </nav>
          </header>
          <main className="flex-1 py-8">{children}</main>
          <footer className="border-t border-white/10 pt-4 text-xs text-slate-400">
            <p>No identities stored. Proofs only.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
