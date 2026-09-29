// Title block at the top of each owner admin page.
export function PageHeader({ title, description }: { title: string; description?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-3xl font-bold tracking-[-0.02em] sm:text-4xl">{title}</h1>
      {description && <p className="max-w-2xl text-sm leading-relaxed text-muted">{description}</p>}
    </div>
  );
}
