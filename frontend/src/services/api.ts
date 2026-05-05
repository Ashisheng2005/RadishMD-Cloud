import type { AuthResponse, Device, Directory, FileContentResponse } from "@/types"

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api"

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  apiKey?: string | null,
  deviceCode?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`
  }
  if (deviceCode) {
    headers["X-Device-Code"] = deviceCode
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new ApiError(body.detail || "Request failed", res.status)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

interface DirectoryResponse {
  path: string
  name: string
  entries: Array<{
    name: string
    path: string
    type: "file" | "directory"
    size: number | null
    modified: string | null
  }>
}

export const api = {
  verifyKey(key: string) {
    return request<AuthResponse>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ api_key: key }),
    })
  },

  listDirectory(path: string, apiKey: string, deviceCode?: string | null) {
    return request<DirectoryResponse>(
      `/storage?path=${encodeURIComponent(path)}`,
      {},
      apiKey,
      deviceCode,
    )
  },

  readFile(path: string, apiKey: string, deviceCode?: string | null) {
    return request<FileContentResponse>(
      `/storage/content?path=${encodeURIComponent(path)}`,
      {},
      apiKey,
      deviceCode,
    )
  },

  devices: {
    list(apiKey: string) {
      return request<Device[]>("/devices", {}, apiKey)
    },

    create(apiKey: string, code: string) {
      return request<Device>("/devices", {
        method: "POST",
        body: JSON.stringify({ code }),
      }, apiKey)
    },

    delete(apiKey: string, id: number) {
      return request<void>(`/devices/${id}`, { method: "DELETE" }, apiKey)
    },
  },

  directories: {
    list(apiKey: string) {
      return request<Directory[]>("/directories", {}, apiKey)
    },

    create(apiKey: string, path: string, label: string) {
      return request<Directory>("/directories", {
        method: "POST",
        body: JSON.stringify({ path, label }),
      }, apiKey)
    },

    update(apiKey: string, id: number, label: string) {
      return request<Directory>(`/directories/${id}`, {
        method: "PUT",
        body: JSON.stringify({ label }),
      }, apiKey)
    },

    delete(apiKey: string, id: number) {
      return request<void>(`/directories/${id}`, { method: "DELETE" }, apiKey)
    },
  },
}
