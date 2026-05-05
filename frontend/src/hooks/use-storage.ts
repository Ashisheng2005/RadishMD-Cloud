import { useState, useCallback } from "react"
import { api, ApiError } from "@/services/api"
import { useAuth } from "@/context/auth-context"
import { useDevice } from "@/context/device-context"
import type { StorageEntry, FileContentResponse } from "@/types"

export function useDirectory() {
  const { apiKey } = useAuth()
  const { selectedDeviceCode } = useDevice()
  const [entries, setEntries] = useState<StorageEntry[]>([])
  const [currentPath, setCurrentPath] = useState("/")
  const [currentName, setCurrentName] = useState("root")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const navigate = useCallback(
    async (path: string) => {
      if (!apiKey) return
      setIsLoading(true)
      setError(null)
      try {
        const data = await api.listDirectory(path, apiKey, selectedDeviceCode)
        setEntries(data.entries)
        setCurrentPath(data.path)
        setCurrentName(data.name)
      } catch (e) {
        if (e instanceof ApiError) {
          setError(e.message)
        } else {
          setError("Failed to load directory")
        }
      } finally {
        setIsLoading(false)
      }
    },
    [apiKey, selectedDeviceCode],
  )

  return { entries, currentPath, currentName, isLoading, error, navigate }
}

export function useFileContent() {
  const { apiKey } = useAuth()
  const { selectedDeviceCode } = useDevice()
  const [file, setFile] = useState<FileContentResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openFile = useCallback(
    async (path: string) => {
      if (!apiKey) return
      setIsLoading(true)
      setError(null)
      setFile(null)
      try {
        const data = await api.readFile(path, apiKey, selectedDeviceCode)
        setFile(data)
      } catch (e) {
        if (e instanceof ApiError) {
          setError(e.message)
        } else {
          setError("Failed to read file")
        }
      } finally {
        setIsLoading(false)
      }
    },
    [apiKey, selectedDeviceCode],
  )

  const closeFile = useCallback(() => {
    setFile(null)
    setError(null)
  }, [])

  return { file, isLoading, error, openFile, closeFile }
}
