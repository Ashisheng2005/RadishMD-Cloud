import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/context/auth-context"
import { api, ApiError } from "@/services/api"
import type { Device } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Monitor, Trash2, Plus } from "lucide-react"

export default function DeviceManagementPage() {
  const { apiKey } = useAuth()
  const [devices, setDevices] = useState<Device[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newCode, setNewCode] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    if (!apiKey) return
    api.devices
      .list(apiKey)
      .then((data) => setDevices(data))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Failed to load devices"))
      .finally(() => setIsLoading(false))
  }, [apiKey])

  const refreshDevices = useCallback(async () => {
    if (!apiKey) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.devices.list(apiKey)
      setDevices(data)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load devices")
    } finally {
      setIsLoading(false)
    }
  }, [apiKey])

  const handleCreate = async () => {
    if (!apiKey || !newCode.trim()) return
    setIsCreating(true)
    setCreateError(null)
    try {
      await api.devices.create(apiKey, newCode.trim())
      setNewCode("")
      await refreshDevices()
    } catch (e) {
      setCreateError(e instanceof ApiError ? e.message : "Failed to create device")
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!apiKey) return
    try {
      await api.devices.delete(apiKey, id)
      await refreshDevices()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to delete device")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Device Management</h2>
      </div>

      {/* Add device */}
      <Card>
        <CardContent className="flex items-center gap-2 pt-4">
          <Input
            placeholder="Enter device code..."
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="max-w-xs"
          />
          <Button onClick={handleCreate} disabled={isCreating || !newCode.trim()}>
            {isCreating ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1 h-4 w-4" />
            )}
            Add Device
          </Button>
        </CardContent>
      </Card>
      {createError && (
        <Alert variant="destructive">
          <AlertDescription>{createError}</AlertDescription>
        </Alert>
      )}

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
      ) : devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Monitor className="mb-2 h-8 w-8" />
          <p>No devices registered</p>
          <p className="text-sm">Add a device above to get started</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Last Connected</TableHead>
                <TableHead>Last Address</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="font-medium">{device.code}</TableCell>
                  <TableCell>
                    {device.last_connected_at ? (
                      new Date(device.last_connected_at).toLocaleString()
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {device.last_address || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(device.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(device.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
