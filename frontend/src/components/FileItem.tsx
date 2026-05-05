import { TableCell, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { FileIcon, FolderIcon } from "lucide-react"
import type { StorageEntry } from "@/types"

interface Props {
  entry: StorageEntry
  onOpen: (path: string) => void
}

export function FileItem({ entry, onOpen }: Props) {
  const isDir = entry.type === "directory"

  const formatSize = (bytes: number | null) => {
    if (bytes === null) return "—"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (date: string | null) => {
    if (!date) return "—"
    return new Date(date).toLocaleString()
  }

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onOpen(entry.path)}
    >
      <TableCell className="flex items-center gap-2">
        {isDir ? (
          <FolderIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="font-medium">{entry.name}</span>
      </TableCell>
      <TableCell>
        <Badge variant={isDir ? "secondary" : "outline"}>
          {isDir ? "directory" : "file"}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">{formatSize(entry.size)}</TableCell>
      <TableCell className="text-muted-foreground">{formatDate(entry.modified)}</TableCell>
    </TableRow>
  )
}
