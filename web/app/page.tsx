import Link from "next/link";

import { FeatureList } from "../components/feature-list";

export default function LandingPage() {
  return (
    <div className="grid gap-12 md:grid-cols-[1.3fr_1fr]">
      <section className="space-y-6">
        <h2 className="text-4xl font-semibold text-white sm:text-5xl">
          Anonymous voices, verifiable membership
        </h2>
        <p className="max-w-xl text-lg text-slate-300">
          Stand up zero-knowledge channels and polls for your organization. Employees prove they belong without revealing who
          they are, enabling candid feedback and inclusive decision making.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/admin" className="rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white shadow">
            Launch admin console
          </Link>
          <Link
            href="/member"
            className="rounded-md border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition hover:text-white"
          >
            Explore member experience
          </Link>
        </div>
      </section>
      <aside className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <FeatureList />
      </aside>
    </div>
  );
}
