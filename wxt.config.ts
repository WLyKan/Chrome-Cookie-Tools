import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";
import { execSync } from "node:child_process";

const extensionName = process.env.NODE_ENV === "development"
  ? "chrome-cookie-tools (DEV)"
  : "chrome-cookie-tools";
const fallbackVersion = "1.0.0";

function normalizeManifestVersion(rawTag: string): string | null {
  const normalized = rawTag.trim().replace(/^v/i, "");
  const versionMatch = normalized.match(/^\d+\.\d+\.\d+(?:\.\d+)?/);
  if (!versionMatch) {
    return null;
  }
  return versionMatch[0];
}

function resolveManifestVersionFromGitTag(): string {
  try {
    const rawTag = execSync("git describe --tags --abbrev=0", {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const version = normalizeManifestVersion(rawTag);
    if (version) {
      return version;
    }
    console.warn(
      `[wxt.config] 非法 tag 版本格式: "${rawTag}"，回退到 ${fallbackVersion}`,
    );
  } catch {
    console.warn(`[wxt.config] 未读取到 git tag，回退到 ${fallbackVersion}`);
  }
  return fallbackVersion;
}

// See https://wxt.dev/api/config.html
export default defineConfig({
  dev: {
    server: {
      port: 3000,
    },
  },
  vite: () => ({
    plugins: [
      tailwindcss(),
    ],
    server: {
      port: 3000,
      // 端口被占用时直接失败，避免静默切到 3001 导致扩展仍请求 3000
      strictPort: true,
      // 扩展页面（chrome-extension://）加载 localhost 上的 module 脚本需要 CORS 头
      cors: {
        origin: [
          /^chrome-extension:\/\/.+$/,
          /^http:\/\/localhost(:\d+)?$/,
          /^http:\/\/127\.0\.0\.1(:\d+)?$/,
        ],
      },
    },
    resolve: {
      alias: {
        "@": "/src",
      },
    },
  }),
  modules: ["@wxt-dev/module-react"],
  srcDir: "src",
  manifest: {
    version: resolveManifestVersionFromGitTag(),
    name: extensionName,
    permissions: [
      "storage",
      "tabs",
      "scripting",
      "activeTab",
      "cookies",
    ],
    host_permissions: ["<all_urls>"],
    // web_accessible_resources: [
    //   {
    //     resources: ["read-local-storage.js"],
    //     matches: ["<all_urls>"],
    //   },
    // ],
  },
});
