import { useEffect, useState } from "react"
import { useAuth } from "@/context/auth-context"
import { useDirectory, useFileContent } from "@/hooks/use-storage"
import { BreadcrumbNav } from "@/components/BreadcrumbNav"
import { FileExplorer } from "@/components/FileExplorer"
import { Sidebar, type TabId } from "@/components/Sidebar"
import { DeviceSelector } from "@/components/DeviceSelector"
import DeviceManagementPage from "@/pages/DeviceManagementPage"
import DirectoryManagementPage from "@/pages/DirectoryManagementPage"
import ApiTutorialPage from "@/pages/ApiTutorialPage"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { LogOut, Loader2, AlertCircle } from "lucide-react"

export default function DashboardPage() {
  const { logout, apiKey } = useAuth()
  const [activeTab, setActiveTab] = useState<TabId>("storage")
  const { entries, currentPath, isLoading, error, navigate } = useDirectory()
  const { file, isLoading: fileLoading, error: fileError, openFile, closeFile } = useFileContent()

  useEffect(() => {
    if (activeTab === "storage") {
      navigate("/")
    }
  }, [activeTab, navigate])

  return (
    <div className="flex min-h-screen">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b px-6 py-3">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Radish Cloud</h1>
            {activeTab === "storage" && <DeviceSelector />}
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground break-all hidden sm:block">
              {apiKey?.slice(0, 12)}...
            </p>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="mr-1 h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === "storage" && (
            <>
              {/* Breadcrumb */}
              <div className="mb-4">
                <BreadcrumbNav path={currentPath} onNavigate={navigate} />
              </div>

              <Separator className="mb-4" />

              {/* File explorer */}
              <div className="flex-1 rounded-lg border">
                <FileExplorer
                  entries={entries}
                  isLoading={isLoading}
                  error={error}
                  onOpen={openFile}
                  onNavigate={navigate}
                />
              </div>

              {/* File content dialog */}
              <Dialog open={file !== null || fileLoading || !!fileError} onOpenChange={() => closeFile()}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{file?.name || "Loading..."}</DialogTitle>
                    <DialogDescription>
                      {file?.path || ""}
                      {file?.truncated && (
                        <span className="ml-2 text-amber-500">(Content truncated — file too large)</span>
                      )}
                    </DialogDescription>
                  </DialogHeader>

                  {fileLoading && (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Loading file...
                    </div>
                  )}

                  {fileError && (
                    <div className="flex items-center gap-2 py-4 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>{fileError}</span>
                    </div>
                  )}

                  {file && !fileLoading && (
                    <>
                      {file.is_binary ? (
                        <div className="py-8 text-center text-muted-foreground">
                          <p className="text-lg">Cannot preview binary file</p>
                        </div>
                      ) : (
                        <pre className="rounded-lg bg-muted p-4 text-sm overflow-x-auto whitespace-pre-wrap">
                          <code>{file.content}</code>
                        </pre>
                      )}
                    </>
                  )}
                </DialogContent>
              </Dialog>
            </>
          )}

          {activeTab === "devices" && <DeviceManagementPage />}
          {activeTab === "directories" && <DirectoryManagementPage />}
          {activeTab === "api" && <ApiTutorialPage />}
        </div>
      </div>
    </div>
  )
}
