import type { ElementType, ReactNode } from "react";
import clsx from "clsx";

interface SectionCardProps {
  title: string;
  description: string;
  icon?: ElementType;
  children: ReactNode;
}

export function SectionCard({ title, description, icon: Icon, children }: SectionCardProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl shadow-primary-500/10">
      <div className="flex items-start gap-4">
        {Icon ? <Icon className="h-6 w-6 text-primary-500" aria-hidden /> : null}
        <div className={clsx("space-y-2", Icon && "flex-1")}>
          <div>
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <p className="text-sm text-slate-300">{description}</p>
          </div>
          <div>{children}</div>
        </div>
      </div>
    </section>
  );
}
