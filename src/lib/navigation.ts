import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Workflow,
  FileCheck2,
  FileText,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navigation: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Programmes", href: "/programmes", icon: FolderKanban },
  { label: "Beneficiaries", href: "/beneficiaries", icon: Users },
  { label: "Pipeline", href: "/pipeline", icon: Workflow },
  { label: "Evidence", href: "/evidence", icon: FileCheck2 },
  { label: "Reports", href: "/reports", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings },
];
