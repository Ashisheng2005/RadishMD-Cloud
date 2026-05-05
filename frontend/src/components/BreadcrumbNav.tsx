import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

interface Props {
  path: string
  onNavigate: (path: string) => void
}

export function BreadcrumbNav({ path, onNavigate }: Props) {
  const segments = path.split("/").filter(Boolean)

  const buildPath = (index: number) => {
    const parts = segments.slice(0, index + 1)
    return "/" + parts.join("/")
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            href="#"
            onClick={(e: React.MouseEvent) => {
              e.preventDefault()
              onNavigate("/")
            }}
          >
            root
          </BreadcrumbLink>
        </BreadcrumbItem>
        {segments.map((seg, i) => (
          <BreadcrumbItem key={i}>
            <BreadcrumbSeparator />
            <BreadcrumbLink
              href="#"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault()
                onNavigate(buildPath(i))
              }}
              isLast={i === segments.length - 1}
            >
              {seg}
            </BreadcrumbLink>
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
