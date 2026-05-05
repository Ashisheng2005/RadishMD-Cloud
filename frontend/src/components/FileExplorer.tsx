import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileItem } from "@/components/FileItem"
import { Loader2, FolderOpen, FileText, AlertCircle } from "lucide-react"
import type { StorageEntry } from "@/types"

interface Props {
  entries: StorageEntry[]
  isLoading: boolean
  error: string | null
  onOpen: (path: string) => void
  onNavigate: (path: string) => void
}

export function FileExplorer({ entries, isLoading, error, onOpen, onNavigate }: Props) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mb-2 h-8 w-8 animate-spin" />
        <p>Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <FolderOpen className="mb-2 h-12 w-12" />
        <p className="text-lg font-medium">空目录</p>
        <p className="text-sm">此文件夹内没有文件或子目录</p>
      </div>
    )
  }

  const handleClick = (path: string) => {
    const entry = entries.find((e) => e.path === path)
    if (!entry) return
    if (entry.type === "directory") {
      onNavigate(path)
    } else {
      onOpen(path)
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50%]">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Name
            </div>
          </TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Modified</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <FileItem key={entry.path} entry={entry} onOpen={handleClick} />
        ))}
      </TableBody>
    </Table>
  )
}
