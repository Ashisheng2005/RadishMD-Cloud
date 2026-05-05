import { FolderOpen, Monitor, Tags, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

export type TabId = "storage" | "devices" | "directories" | "api"

interface SidebarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

const navItems: { id: TabId; label: string; icon: typeof FolderOpen }[] = [
  { id: "storage", label: "File Explorer", icon: FolderOpen },
  { id: "devices", label: "Devices", icon: Monitor },
  { id: "directories", label: "Directories", icon: Tags },
  { id: "api", label: "API Reference", icon: BookOpen },
]

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="flex w-48 flex-col border-r bg-muted/30 p-2">
      <nav className="flex flex-col gap-1">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activeTab === id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>
    </aside>
  )
}
