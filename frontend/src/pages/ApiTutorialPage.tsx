import { useState, useCallback } from "react"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, ChevronDown, ChevronRight, Terminal, Play } from "lucide-react"

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api"

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE"

interface FieldDef {
  name: string
  label: string
  placeholder: string
  type?: string
}

interface EndpointDef {
  method: HttpMethod
  displayPath: string
  auth: boolean
  desc: string
  curl: string
  fields: FieldDef[]
  makeRequest: (values: Record<string, string>, apiKey?: string) => { url: string; options: RequestInit }
}

const METHOD_BADGES: Record<HttpMethod, string> = {
  GET: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  POST: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  PUT: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
}

const ENDPOINTS: EndpointDef[] = [
  {
    method: "GET",
    displayPath: "/api/health",
    auth: false,
    desc: "Check if the backend server is running.",
    curl: "curl http://localhost:8001/api/health",
    fields: [],
    makeRequest: () => ({
      url: `${BASE_URL}/health`,
      options: { method: "GET", headers: { "Content-Type": "application/json" } },
    }),
  },
  {
    method: "POST",
    displayPath: "/api/auth/verify",
    auth: false,
    desc: "Authenticate with an API key.",
    curl: [
      "curl -X POST http://localhost:8001/api/auth/verify \\",
      '  -H "Content-Type: application/json" \\',
      '  -d \'{"api_key": "sk-admin"}\'',
    ].join("\n"),
    fields: [{ name: "api_key", label: "API Key", placeholder: "sk-admin" }],
    makeRequest: (values) => ({
      url: `${BASE_URL}/auth/verify`,
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: values.api_key }),
      },
    }),
  },
  {
    method: "GET",
    displayPath: "/api/storage?path=...",
    auth: true,
    desc: "List contents of a directory relative to storage root.",
    curl: [
      "curl http://localhost:8001/api/storage?path=/ \\",
      '  -H "Authorization: Bearer sk-admin"',
    ].join("\n"),
    fields: [{ name: "path", label: "Directory Path", placeholder: "/" }],
    makeRequest: (values, apiKey) => {
      const params = new URLSearchParams({ path: values.path || "/" })
      return {
        url: `${BASE_URL}/storage?${params}`,
        options: { method: "GET", headers: headers(apiKey) },
      }
    },
  },
  {
    method: "GET",
    displayPath: "/api/storage/content?path=...",
    auth: true,
    desc: "Read a file's content from storage root.",
    curl: [
      "curl http://localhost:8001/api/storage/content?path=/readme.md \\",
      '  -H "Authorization: Bearer sk-admin"',
    ].join("\n"),
    fields: [{ name: "path", label: "File Path", placeholder: "/readme.md" }],
    makeRequest: (values, apiKey) => {
      const params = new URLSearchParams({ path: values.path || "/readme.md" })
      return {
        url: `${BASE_URL}/storage/content?${params}`,
        options: { method: "GET", headers: headers(apiKey) },
      }
    },
  },
  {
    method: "GET",
    displayPath: "/api/devices",
    auth: true,
    desc: "List all tracked devices.",
    curl: [
      "curl http://localhost:8001/api/devices \\",
      '  -H "Authorization: Bearer sk-admin"',
    ].join("\n"),
    fields: [],
    makeRequest: (_values, apiKey) => ({
      url: `${BASE_URL}/devices`,
      options: { method: "GET", headers: headers(apiKey) },
    }),
  },
  {
    method: "POST",
    displayPath: "/api/devices",
    auth: true,
    desc: "Register a new device.",
    curl: [
      "curl -X POST http://localhost:8001/api/devices \\",
      '  -H "Content-Type: application/json" \\',
      '  -H "Authorization: Bearer sk-admin" \\',
      '  -d \'{"code": "my-laptop"}\'',
    ].join("\n"),
    fields: [{ name: "code", label: "Device Code", placeholder: "my-laptop" }],
    makeRequest: (values, apiKey) => ({
      url: `${BASE_URL}/devices`,
      options: {
        method: "POST",
        headers: headers(apiKey),
        body: JSON.stringify({ code: values.code }),
      },
    }),
  },
  {
    method: "DELETE",
    displayPath: "/api/devices/{id}",
    auth: true,
    desc: "Remove a device by ID.",
    curl: [
      "curl -X DELETE http://localhost:8001/api/devices/1 \\",
      '  -H "Authorization: Bearer sk-admin"',
    ].join("\n"),
    fields: [{ name: "id", label: "Device ID", placeholder: "1", type: "number" }],
    makeRequest: (values, apiKey) => ({
      url: `${BASE_URL}/devices/${encodeURIComponent(values.id)}`,
      options: { method: "DELETE", headers: headers(apiKey) },
    }),
  },
  {
    method: "GET",
    displayPath: "/api/directories",
    auth: true,
    desc: "List all labeled directories.",
    curl: [
      "curl http://localhost:8001/api/directories \\",
      '  -H "Authorization: Bearer sk-admin"',
    ].join("\n"),
    fields: [],
    makeRequest: (_values, apiKey) => ({
      url: `${BASE_URL}/directories`,
      options: { method: "GET", headers: headers(apiKey) },
    }),
  },
  {
    method: "POST",
    displayPath: "/api/directories",
    auth: true,
    desc: "Create a directory entry with a label. Supports relative paths (resolved under storage root) or absolute paths like E:/MyBlogs.",
    curl: [
      "curl -X POST http://localhost:8001/api/directories \\",
      '  -H "Content-Type: application/json" \\',
      '  -H "Authorization: Bearer sk-admin" \\',
      '  -d \'{"path": "/docs", "label": "Documents"}\'',
    ].join("\n"),
    fields: [
      { name: "path", label: "Path", placeholder: "/docs or E:/MyBlogs" },
      { name: "label", label: "Label", placeholder: "Documents" },
    ],
    makeRequest: (values, apiKey) => ({
      url: `${BASE_URL}/directories`,
      options: {
        method: "POST",
        headers: headers(apiKey),
        body: JSON.stringify({ path: values.path, label: values.label }),
      },
    }),
  },
  {
    method: "PUT",
    displayPath: "/api/directories/{id}",
    auth: true,
    desc: "Update a directory's label.",
    curl: [
      "curl -X PUT http://localhost:8001/api/directories/1 \\",
      '  -H "Content-Type: application/json" \\',
      '  -H "Authorization: Bearer sk-admin" \\',
      '  -d \'{"label": "New Label"}\'',
    ].join("\n"),
    fields: [
      { name: "id", label: "Directory ID", placeholder: "1", type: "number" },
      { name: "label", label: "Label", placeholder: "New Label" },
    ],
    makeRequest: (values, apiKey) => ({
      url: `${BASE_URL}/directories/${encodeURIComponent(values.id)}`,
      options: {
        method: "PUT",
        headers: headers(apiKey),
        body: JSON.stringify({ label: values.label }),
      },
    }),
  },
  {
    method: "DELETE",
    displayPath: "/api/directories/{id}",
    auth: true,
    desc: "Remove a directory label record (files on disk are preserved).",
    curl: [
      "curl -X DELETE http://localhost:8001/api/directories/1 \\",
      '  -H "Authorization: Bearer sk-admin"',
    ].join("\n"),
    fields: [{ name: "id", label: "Directory ID", placeholder: "1", type: "number" }],
    makeRequest: (values, apiKey) => ({
      url: `${BASE_URL}/directories/${encodeURIComponent(values.id)}`,
      options: { method: "DELETE", headers: headers(apiKey) },
    }),
  },
]

function headers(apiKey?: string): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" }
  if (apiKey) h["Authorization"] = `Bearer ${apiKey}`
  return h
}

function EndpointCard({ endpoint }: { endpoint: EndpointDef }) {
  const { apiKey } = useAuth()
  const [showCurl, setShowCurl] = useState(false)
  const [showTry, setShowTry] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<{ status: number; body: unknown } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSend = useCallback(async () => {
    setLoading(true)
    setResponse(null)
    setError(null)
    try {
      const { url, options } = endpoint.makeRequest(values, endpoint.auth ? apiKey ?? undefined : undefined)
      const res = await fetch(url, options)
      let body: unknown
      try {
        body = await res.json()
      } catch {
        body = await res.text()
      }
      setResponse({ status: res.status, body })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed")
    } finally {
      setLoading(false)
    }
  }, [endpoint, values, apiKey])

  return (
    <Card>
      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <span
            className={`inline-flex shrink-0 items-center rounded px-2 py-0.5 text-xs font-bold font-mono ${METHOD_BADGES[endpoint.method]}`}
          >
            {endpoint.method}
          </span>
          <div className="flex-1 min-w-0">
            <code className="text-sm font-mono font-semibold">{endpoint.displayPath}</code>
            <p className="text-sm text-muted-foreground mt-0.5">{endpoint.desc}</p>
          </div>
          {endpoint.auth && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              Bearer
            </Badge>
          )}
        </div>

        {/* cURL expand */}
        <button
          type="button"
          onClick={() => setShowCurl((v) => !v)}
          className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {showCurl ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <Terminal className="h-3 w-3" />
          cURL example
        </button>
        {showCurl && (
          <pre className="mt-1 overflow-x-auto rounded bg-muted p-3 text-xs">
            <code>{endpoint.curl}</code>
          </pre>
        )}

        {/* Try it expand */}
        <button
          type="button"
          onClick={() => setShowTry((v) => !v)}
          className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {showTry ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <Play className="h-3 w-3" />
          Try it
        </button>
        {showTry && (
          <div className="mt-2 space-y-2">
            {endpoint.fields.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {endpoint.fields.map((f) => (
                  <div key={f.name} className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">{f.label}</label>
                    <Input
                      type={f.type || "text"}
                      placeholder={f.placeholder}
                      value={values[f.name] || ""}
                      onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                      className="h-8 w-52 text-xs"
                    />
                  </div>
                ))}
              </div>
            )}

            <Button size="sm" onClick={handleSend} disabled={loading}>
              {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              Send Request
            </Button>

            {response && (
              <div className="rounded border">
                <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs text-muted-foreground">
                  <span>Status:</span>
                  <span className={response.status < 400 ? "font-semibold text-green-600" : "font-semibold text-red-600"}>
                    {response.status}
                  </span>
                </div>
                <pre className="max-h-60 overflow-y-auto p-3 text-xs">
                  <code>{JSON.stringify(response.body, null, 2)}</code>
                </pre>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function ApiTutorialPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">API Reference</h2>
        <p className="text-sm text-muted-foreground">
          Browse all API endpoints, view cURL examples, and test them directly.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {ENDPOINTS.map((ep) => (
          <EndpointCard key={ep.displayPath + ep.method} endpoint={ep} />
        ))}
      </div>
    </div>
  )
}
