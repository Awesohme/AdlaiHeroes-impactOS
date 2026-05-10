import {
  LayoutDashboard,
  FolderKanban,
  Users,
  FileCheck2,
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
  { label: "Evidence", href: "/evidence", icon: FileCheck2 },
  { label: "Settings", href: "/settings", icon: Settings },
];
