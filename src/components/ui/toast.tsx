import { CheckCircle2, Info, TriangleAlert, XCircle } from "lucide-react";
import type { CSSProperties } from "react";
import {
  Toaster as HotToaster,
  toast as hotToast,
  type ToastOptions,
} from "react-hot-toast";

const BASE_TOAST_STYLE: CSSProperties = {
  width: "260px",
  maxWidth: "260px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--border)",
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  fontSize: "12px",
};

const DEFAULT_OPTIONS: ToastOptions = {
  duration: 3000,
  position: "top-right",
  style: BASE_TOAST_STYLE,
};

const EXTENSION_UPDATE_TOAST_ID = "extension-update-notice";

interface ExtensionUpdateNoticeToastOptions {
  currentVersion: string;
  latestVersion: string;
  releaseUrl?: string;
}

export function Toaster() {
  return (
    <HotToaster
      position="top-right"
      gutter={8}
      containerStyle={{
        top: "0.75rem",
        right: "0.75rem",
      }}
      toastOptions={DEFAULT_OPTIONS}
    />
  );
}

export const toast = {
  success: (message: string) =>
    hotToast.success(message, {
      icon: <CheckCircle2 className="size-4 text-green-600" />,
      style: {
        ...BASE_TOAST_STYLE,
        borderColor: "rgb(34 197 94 / 0.5)",
        background: "rgb(240 253 244)",
        color: "rgb(20 83 45)",
      },
    }),
  error: (message: string) =>
    hotToast.error(message, {
      icon: <XCircle className="size-4 text-red-600" />,
      style: {
        ...BASE_TOAST_STYLE,
        borderColor: "rgb(239 68 68 / 0.5)",
        background: "rgb(254 242 242)",
        color: "rgb(127 29 29)",
      },
    }),
  info: (message: string) =>
    hotToast(message, {
      icon: <Info className="size-4 text-blue-600" />,
      style: {
        ...BASE_TOAST_STYLE,
        borderColor: "rgb(59 130 246 / 0.5)",
        background: "rgb(239 246 255)",
        color: "rgb(30 64 175)",
      },
    }),
  warning: (message: string) =>
    hotToast(message, {
      icon: <TriangleAlert className="size-4 text-amber-600" />,
      style: {
        ...BASE_TOAST_STYLE,
        borderColor: "rgb(245 158 11 / 0.5)",
        background: "rgb(255 251 235)",
        color: "rgb(146 64 14)",
      },
    }),
  extensionUpdateNotice: ({
    currentVersion,
    latestVersion,
    releaseUrl,
  }: ExtensionUpdateNoticeToastOptions) =>
    hotToast.custom(
      (toastItem) => (
        <div className="w-[320px] rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">
              发现新版本 v{latestVersion}（当前 v{currentVersion}）
            </span>
            <div className="flex shrink-0 items-center gap-1">
              {releaseUrl && (
                <button
                  type="button"
                  className="cursor-pointer rounded border border-blue-300 bg-white px-2 py-0.5 text-[11px] transition-colors duration-200 hover:bg-blue-100"
                  onClick={() => {
                    void browser.tabs.create({ url: releaseUrl });
                    hotToast.dismiss(toastItem.id);
                  }}
                >
                  查看
                </button>
              )}
              <button
                type="button"
                className="cursor-pointer rounded px-1 text-[11px] transition-colors duration-200 hover:bg-blue-100"
                onClick={() => hotToast.dismiss(toastItem.id)}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      ),
      {
        id: EXTENSION_UPDATE_TOAST_ID,
        duration: Number.POSITIVE_INFINITY,
        position: "top-right",
      },
    ),
  dismiss: (toastId?: string) => hotToast.dismiss(toastId),
};
