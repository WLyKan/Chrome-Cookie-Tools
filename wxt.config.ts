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
  vite: () => ({
    plugins: [
      tailwindcss(),
    ],
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
