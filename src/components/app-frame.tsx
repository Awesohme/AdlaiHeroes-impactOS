export function AppFrame({
  title,
  eyebrow,
  description,
  action,
  children,
}: {
  title: string;
  eyebrow: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="workspace-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {action}
      </header>
      {children}
    </>
  );
}
