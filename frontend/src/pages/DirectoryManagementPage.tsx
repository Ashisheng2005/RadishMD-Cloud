import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/context/auth-context"
import { api, ApiError } from "@/services/api"
import type { Directory } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Tags, Plus, Trash2, Pencil } from "lucide-react"

export default function DirectoryManagementPage() {
  const { apiKey } = useAuth()
  const [directories, setDirectories] = useState<Directory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create state
  const [showCreate, setShowCreate] = useState(false)
  const [newPath, setNewPath] = useState("")
  const [newLabel, setNewLabel] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Edit state
  const [editingDir, setEditingDir] = useState<Directory | null>(null)
  const [editLabel, setEditLabel] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  // Delete state
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    if (!apiKey) return
    api.directories
      .list(apiKey)
      .then((data) => setDirectories(data))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load directories"))
      .finally(() => setIsLoading(false))
  }, [apiKey])

  const refreshDirectories = useCallback(async () => {
    if (!apiKey) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.directories.list(apiKey)
      setDirectories(data)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load directories")
    } finally {
      setIsLoading(false)
    }
  }, [apiKey])

  const handleCreate = async () => {
    if (!apiKey || !newPath.trim() || !newLabel.trim()) return
    setIsCreating(true)
    setCreateError(null)
    try {
      await api.directories.create(apiKey, newPath.trim(), newLabel.trim())
      setNewPath("")
      setNewLabel("")
      setShowCreate(false)
      await refreshDirectories()
    } catch (e) {
      setCreateError(e instanceof ApiError ? e.message : "Failed to create directory")
    } finally {
      setIsCreating(false)
    }
  }

  const handleEdit = async () => {
    if (!apiKey || !editingDir || !editLabel.trim()) return
    setIsUpdating(true)
    try {
      await api.directories.update(apiKey, editingDir.id, editLabel.trim())
      setEditingDir(null)
      await refreshDirectories()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to update directory")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!apiKey) return
    try {
      await api.directories.delete(apiKey, id)
      await refreshDirectories()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to delete directory")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Directory Management</h2>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Add Directory
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading...
        </div>
      ) : directories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Tags className="mb-2 h-8 w-8" />
          <p>No directories with labels</p>
          <p className="text-sm">Click "Add Directory" to create one</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Path</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {directories.map((dir) => (
                <TableRow key={dir.id}>
                  <TableCell className="font-mono text-sm">{dir.path}</TableCell>
                  <TableCell>{dir.label}</TableCell>
                  <TableCell>
                    {new Date(dir.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingDir(dir)
                          setEditLabel(dir.label)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingId(dir.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); setCreateError(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Directory</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Path</label>
              <Input
                placeholder="/my-directory"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Path relative to storage root
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Label</label>
              <Input
                placeholder="My Documents"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
            </div>
            {createError && (
              <Alert variant="destructive">
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !newPath.trim() || !newLabel.trim()}
            >
              {isCreating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingDir} onOpenChange={() => setEditingDir(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Label</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium">Label</label>
            <Input
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDir(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isUpdating || !editLabel.trim()}>
              {isUpdating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Directory</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove this directory record? The files on disk
            will not be deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
