import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { api } from "@/services/api"

interface AuthContextType {
  apiKey: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (key: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const STORAGE_KEY = "radish_api_key"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY))
  const [isLoading, setIsLoading] = useState(false)

  const login = useCallback(async (key: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      await api.verifyKey(key)
      setApiKey(key)
      localStorage.setItem(STORAGE_KEY, key)
      return true
    } catch {
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setApiKey(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        apiKey,
        isAuthenticated: apiKey !== null,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error(" useAuth 必须在 AuthProvider 中使用") // "useAuth must be used within AuthProvider"
  return ctx
}
