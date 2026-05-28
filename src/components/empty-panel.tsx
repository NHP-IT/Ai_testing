export function EmptyPanel({
  title,
  body,
  children
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded border border-line bg-panel p-5">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
