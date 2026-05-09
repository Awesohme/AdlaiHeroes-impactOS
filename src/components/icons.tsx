type IconProps = {
  className?: string;
};

function IconBase({ children, className }: IconProps & { children: React.ReactNode }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function ArrowUpRight(props: IconProps) {
  return (
    <IconBase {...props}>
      <path {...stroke} d="M7 17 17 7" />
      <path {...stroke} d="M9 7h8v8" />
    </IconBase>
  );
}

export function CalendarCheck(props: IconProps) {
  return (
    <IconBase {...props}>
      <path {...stroke} d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a2 2 0 0 1 2-2Z" />
      <path {...stroke} d="m8 15 2.5 2.5L16 12" />
    </IconBase>
  );
}

export function Database(props: IconProps) {
  return (
    <IconBase {...props}>
      <ellipse {...stroke} cx="12" cy="5" rx="7" ry="3" />
      <path {...stroke} d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
      <path {...stroke} d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </IconBase>
  );
}

export function FileText(props: IconProps) {
  return (
    <IconBase {...props}>
      <path {...stroke} d="M7 3h7l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path {...stroke} d="M14 3v5h5M8 13h8M8 17h6" />
    </IconBase>
  );
}

export function FolderArchive(props: IconProps) {
  return (
    <IconBase {...props}>
      <path {...stroke} d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7Z" />
      <path {...stroke} d="M9 12h6M10 16h4" />
    </IconBase>
  );
}

export function HeartHandshake(props: IconProps) {
  return (
    <IconBase {...props}>
      <path {...stroke} d="M12 20s-7-4.4-9-9a4.5 4.5 0 0 1 7-5.2L12 8l2-2.2a4.5 4.5 0 0 1 7 5.2c-2 4.6-9 9-9 9Z" />
      <path {...stroke} d="m8 13 2 2 4-4 2 2" />
    </IconBase>
  );
}

export function ShieldCheck(props: IconProps) {
  return (
    <IconBase {...props}>
      <path {...stroke} d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z" />
      <path {...stroke} d="m8.5 12 2.2 2.2 4.8-5" />
    </IconBase>
  );
}

export function UsersRound(props: IconProps) {
  return (
    <IconBase {...props}>
      <path {...stroke} d="M16 20a4 4 0 0 0-8 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 19a3.5 3.5 0 0 0-4-3.4M16.5 5.4a3 3 0 0 1 0 5.2M4 19a3.5 3.5 0 0 1 4-3.4M7.5 5.4a3 3 0 0 0 0 5.2" />
    </IconBase>
  );
}
