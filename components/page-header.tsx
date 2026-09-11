export function PageHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description: string }) {
  return (
    <div>
      {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ffd84d]">{eyebrow}</p> : null}
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-3xl text-slate-400">{description}</p>
    </div>
  );
}
