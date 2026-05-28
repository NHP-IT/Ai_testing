import {
  Bot,
  Database,
  Home,
  PlugZap,
  PlayCircle,
  Settings2
} from "lucide-react";

export const appRoutes = [
  {
    href: "/",
    label: "Dashboard",
    icon: Home
  },
  {
    href: "/agents",
    label: "Agents",
    icon: Bot
  },
  {
    href: "/judge",
    label: "Judge",
    icon: Settings2
  },
  {
    href: "/corpus",
    label: "Corpus",
    icon: Database
  },
  {
    href: "/connections",
    label: "Connections",
    icon: PlugZap
  },
  {
    href: "/runs/new",
    label: "New Run",
    icon: PlayCircle
  }
] as const;
