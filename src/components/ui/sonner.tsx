import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const toastClassNames = {
  success:
    "!border-green-500/50 !bg-green-50 !text-green-900 dark:!bg-green-950/90 dark:!text-green-100 dark:!border-green-500/30 [&>svg]:!text-green-600 dark:[&>svg]:!text-green-400",
  error:
    "!border-destructive/50 !bg-destructive/10 !text-destructive dark:!bg-destructive/20 dark:!text-destructive [&>svg]:!text-destructive",
  warning:
    "!border-amber-500/50 !bg-amber-50 !text-amber-900 dark:!bg-amber-950/90 dark:!text-amber-100 dark:!border-amber-500/30 [&>svg]:!text-amber-600 dark:[&>svg]:!text-amber-400",
  info: "!border-blue-500/50 !bg-blue-50 !text-blue-900 dark:!bg-blue-950/90 dark:!text-blue-100 dark:!border-blue-500/30 [&>svg]:!text-blue-600 dark:[&>svg]:!text-blue-400",
}

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: "",
          success: toastClassNames.success,
          error: toastClassNames.error,
          warning: toastClassNames.warning,
          info: toastClassNames.info,
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
