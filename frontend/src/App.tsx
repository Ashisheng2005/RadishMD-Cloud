import { AuthProvider, useAuth } from "@/context/auth-context"
import { DeviceProvider } from "@/context/device-context"
import LoginPage from "@/pages/LoginPage"
import DashboardPage from "@/pages/DashboardPage"

function AppContent() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <DashboardPage /> : <LoginPage />
}

export default function App() {
  return (
    <AuthProvider>
      <DeviceProvider>
        <AppContent />
      </DeviceProvider>
    </AuthProvider>
  )
}
