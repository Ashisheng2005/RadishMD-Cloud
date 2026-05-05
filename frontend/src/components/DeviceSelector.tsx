import { useEffect, useState } from "react"
import { useAuth } from "@/context/auth-context"
import { useDevice } from "@/context/device-context"
import { api } from "@/services/api"
import type { Device } from "@/types"
import { Select } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

export function DeviceSelector() {
  const { apiKey } = useAuth()
  const { selectedDeviceCode, setSelectedDeviceCode } = useDevice()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!apiKey) return
    api.devices
      .list(apiKey)
      .then(setDevices)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [apiKey])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading devices...
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-muted-foreground whitespace-nowrap">Device:</label>
      <Select
        value={selectedDeviceCode || ""}
        onChange={(e) => setSelectedDeviceCode(e.target.value || null)}
        className="w-44 h-8 text-xs"
      >
        <option value="">None</option>
        {devices.map((d) => (
          <option key={d.id} value={d.code}>
            {d.code}
          </option>
        ))}
      </Select>
    </div>
  )
}
