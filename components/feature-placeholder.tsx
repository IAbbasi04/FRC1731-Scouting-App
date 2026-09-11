export function FeaturePlaceholder({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-dashed border-blue-300/25 bg-[#0d1b2e]/80 p-6">
      <h2 className="font-semibold text-[#ffd84d]">{title}</h2>
      <div className="mt-2 text-sm leading-6 text-slate-400">{children}</div>
    </section>
  );
}
