export interface StorageEntry {
  name: string
  path: string
  type: "file" | "directory"
  size: number | null
  modified: string | null
}

export interface DirectoryResponse {
  path: string
  name: string
  entries: StorageEntry[]
}

export interface FileContentResponse {
  name: string
  path: string
  content: string | null
  is_binary: boolean
  truncated: boolean
}

export interface AuthResponse {
  success: boolean
  message: string
}

export interface Device {
  id: number
  code: string
  last_connected_at: string | null
  last_address: string | null
  created_at: string
}

export interface Directory {
  id: number
  path: string
  label: string
  created_at: string
}
