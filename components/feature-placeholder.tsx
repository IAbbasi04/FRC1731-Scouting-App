export function FeaturePlaceholder({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 p-6"><h2 className="font-semibold">{title}</h2><div className="mt-2 text-sm leading-6 text-zinc-400">{children}</div></section>;
}
