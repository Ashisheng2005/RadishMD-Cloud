import { createContext, useContext, useState, type ReactNode } from "react"

interface DeviceContextType {
  selectedDeviceCode: string | null
  setSelectedDeviceCode: (code: string | null) => void
}

const DeviceContext = createContext<DeviceContextType | null>(null)

const STORAGE_KEY = "radish_device_code"

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [selectedDeviceCode, setSelectedDeviceCodeState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  )

  const setSelectedDeviceCode = (code: string | null) => {
    setSelectedDeviceCodeState(code)
    if (code) {
      localStorage.setItem(STORAGE_KEY, code)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  return (
    <DeviceContext.Provider value={{ selectedDeviceCode, setSelectedDeviceCode }}>
      {children}
    </DeviceContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDevice() {
  const ctx = useContext(DeviceContext)
  if (!ctx) throw new Error("useDevice must be used within DeviceProvider")
  return ctx
}
