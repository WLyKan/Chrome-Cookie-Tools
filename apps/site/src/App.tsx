import { useEffect, useState, type FC } from "react";

const navLinks = [
  { href: "#features", label: "功能特性" },
  { href: "#scenarios", label: "使用场景" },
  { href: "#install", label: "本地安装" },
];

const badges = [
  { label: "CHROME 扩展", color: "badge-blue" },
  { label: "V1.0.0", color: "badge-blue" },
  { label: "COOKIE + LOCALSTORAGE", color: "badge-green" },
  { label: "本地处理", color: "badge-purple" },
  { label: "开源免费", color: "badge-orange" },
];

const toolCategories = [
  { icon: "cookie", label: "Cookie 读写" },
  { icon: "storage", label: "LocalStorage" },
  { icon: "settings", label: "配置管理" },
  { icon: "sync", label: "跨环境同步" },
  { icon: "shield", label: "安全可控" },
  { icon: "lightning", label: "即装即用" },
  { icon: "domain", label: "域名校验" },
  { icon: "import", label: "一键导入导出" },
  { icon: "permission", label: "权限管理" },
];

const GITHUB_REPO_URL = "https://github.com/WLyKan/Chrome-Cookie-Tools";
const GITHUB_LATEST_RELEASE_API = "https://api.github.com/repos/WLyKan/Chrome-Cookie-Tools/releases/latest";

const trustPoints = [
  "数据仅在浏览器本地处理，不经过第三方服务器",
  "开源可审计，关键逻辑可追溯",
  "按需申请站点权限，操作边界明确",
];

const featureCards = [
  {
    title: "30 秒跨环境同步",
    desc: "将 dev 里调好的登录态和配置快速同步到 test / staging，避免重复登录与重复配置。",
  },
  {
    title: "面向高频调试场景",
    desc: "聚焦核心 3-5 个 key 的读写迁移，把复杂流程压缩成几个稳定动作。",
  },
  {
    title: "安全边界清晰",
    desc: "域名校验、权限控制与本地处理默认启用，降低误操作和数据暴露风险。",
  },
];

const workflowSteps = [
  {
    title: "读取",
    desc: "从当前域名读取 Cookie / LocalStorage",
  },
  {
    title: "保存配置",
    desc: "按业务模块保存 key 列表，后续复用",
  },
  {
    title: "同步",
    desc: "一键写入目标环境，快速恢复登录态",
  },
];

interface GithubReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface GithubReleaseResponse {
  assets?: GithubReleaseAsset[];
}

interface ToolIconProps {
  name: string;
}

const ToolIcon: FC<ToolIconProps> = ({ name }) => {
  switch (name) {
    case "cookie":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13.5 3a3.5 3.5 0 0 0 0 7h.5a3 3 0 0 1 3 3v.5a3.5 3.5 0 1 0 0 7h-5A8.5 8.5 0 0 1 3.5 12v-.5A8.5 8.5 0 0 1 12 3h1.5Z" />
        </svg>
      );
    case "storage":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6c0-1.1 3.6-2 8-2s8 .9 8 2-3.6 2-8 2-8-.9-8-2Zm0 6c0 1.1 3.6 2 8 2s8-.9 8-2m-16 6c0 1.1 3.6 2 8 2s8-.9 8-2V6" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m12 8 1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3L12 8Zm0-5 1.2 2.5 2.8.4-2 1.9.5 2.8L12 9.2 9.5 10.6l.5-2.8-2-1.9 2.8-.4L12 3Zm0 12 1.2 2.5 2.8.4-2 1.9.5 2.8-2.5-1.4-2.5 1.4.5-2.8-2-1.9 2.8-.4L12 15Z" />
        </svg>
      );
    case "sync":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h11l-2.5-2.5L14 3l5 5-5 5-1.5-1.5L15 9H4V7Zm16 10H9l2.5 2.5L10 21l-5-5 5-5 1.5 1.5L9 15h11v2Z" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 5 6v6c0 5 3.4 8.8 7 10 3.6-1.2 7-5 7-10V6l-7-3Zm-1 12 6-6 1.4 1.4L11 17.8l-3.4-3.4L9 13l2 2Z" />
        </svg>
      );
    case "lightning":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13 2 5 13h6l-1 9 8-11h-6l1-9Z" />
        </svg>
      );
    case "domain":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm7.7 9h-3.1a15.6 15.6 0 0 0-1.5-5 8 8 0 0 1 4.6 5ZM12 4.1c1 .9 2.1 3.3 2.6 6.9H9.4c.5-3.6 1.6-6 2.6-6.9ZM4.3 13h3.1c.1 1.8.4 3.5.9 5a8 8 0 0 1-4-5Zm3.1-2H4.3a8 8 0 0 1 4-5 15.2 15.2 0 0 0-.9 5Zm1.9 2h5.4c-.5 3.6-1.6 6-2.7 6s-2.2-2.4-2.7-6Zm0-2c.5-3.6 1.6-6 2.7-6s2.2 2.4 2.7 6H9.3Zm5.4 2h3.1a8 8 0 0 1-4 5c.5-1.5.8-3.2.9-5Z" />
        </svg>
      );
    case "import":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3v11m0 0 4-4m-4 4-4-4M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
        </svg>
      );
    case "permission":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 4 7v6c0 4.7 3 7.9 8 9 5-1.1 8-4.3 8-9V7l-8-4Zm-1 12 6-6 1.4 1.4L11 17.8l-3.4-3.4L9 13l2 2Z" />
        </svg>
      );
    default:
      return null;
  }
};

export const App: FC = () => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [chromeDownloadUrl, setChromeDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    const loadLatestChromeDownloadUrl = async () => {
      try {
        const response = await fetch(GITHUB_LATEST_RELEASE_API, { signal: abortController.signal });
        if (!response.ok) {
          throw new Error(`获取 Release 失败: ${response.status}`);
        }
        const release = (await response.json()) as GithubReleaseResponse;
        const chromeAsset = release.assets?.find((asset) => asset.name.endsWith("-chrome.zip"));
        setChromeDownloadUrl(chromeAsset?.browser_download_url ?? null);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }
        console.error("加载 GitHub Release 下载链接失败", error);
        setChromeDownloadUrl(null);
      }
    };

    void loadLatestChromeDownloadUrl();

    return () => abortController.abort();
  }, []);

  return (
    <div className="page">
      <nav className="navbar">
        <div className="navbar-inner">
          <a href="#" className="navbar-logo">
            <span className="logo-icon">SD</span>
            <span className="logo-text">Storage Dev Tools</span>
          </a>
          <div className="navbar-links">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} className="nav-link">
                {link.label}
              </a>
            ))}
          </div>
          <div className="navbar-actions">
            <a href="#install" className="btn-nav-outline">
              立即安装
            </a>
            <a href={GITHUB_REPO_URL} className="btn-nav-github" target="_blank" rel="noreferrer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-1.23-3.795-1.23-.54-1.38-1.335-1.755-1.335-1.755-1.08-.75.09-.735.09-.735 1.2.09 1.83 1.23 1.83 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-inner container">
          <div className="hero-left">
            <h1 className="hero-title">
              30 秒完成
              <span className="hero-title-highlight">跨环境存储同步</span>
            </h1>
            <p className="hero-desc">
              Storage Dev Tools 是一款面向前端和测试协作场景的 Chrome 扩展。帮助你在 dev、test、staging 之间快速同步 Cookie 与 LocalStorage，
              减少重复登录、重复配置与环境切换成本。
            </p>
            <div className="hero-badges">
              {badges.map((b) => (
                <span key={b.label} className={`badge ${b.color}`}>
                  {b.label}
                </span>
              ))}
            </div>
            <div className="hero-actions">
              <a href="#install" className="btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                立即安装
              </a>
              <a href="#features" className="btn-secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                查看核心能力
              </a>
            </div>
            <ul className="trust-list">
              {trustPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>

          <div className="hero-right">
            <div className="browser-mockup" onMouseLeave={() => setIsPreviewOpen(false)}>
              <div className="browser-bar">
                <div className="browser-dots">
                  <span className="dot-red" />
                  <span className="dot-yellow" />
                  <span className="dot-green" />
                </div>
                <div className="browser-url">storage-dev-tools</div>
              </div>
              <div className="browser-content">
                <div className="tool-grid">
                  {toolCategories.map((t) => (
                    <div key={t.label} className="tool-item">
                      <span className="tool-icon">
                        <ToolIcon name={t.icon} />
                      </span>
                      <span className="tool-label">{t.label}</span>
                    </div>
                  ))}
                </div>
                <div className="browser-extra">
                  <div className="extra-left">
                    <span className="extra-title">Chrome 扩展</span>
                    <span className="extra-desc">即装即用，无需配置</span>
                    <ul className="extra-list">
                      <li>支持 Cookie 与 LocalStorage</li>
                      <li>配置历史，一键恢复</li>
                    </ul>
                  </div>
                  <div className="extra-right">
                    <div
                      className="extra-preview preview-hover"
                      onMouseEnter={() => setIsPreviewOpen(true)}
                      onClick={() => setIsPreviewOpen(true)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setIsPreviewOpen(true);
                        }
                      }}
                      aria-label="打开扩展界面大图预览"
                    >
                      <img
                        src={`${import.meta.env.BASE_URL}extension-screenshot.png`}
                        alt="扩展界面预览"
                        className="extra-img"
                      />
                      <div className="preview-hint">Hover 查看原图</div>
                    </div>
                    <span className="extra-caption">扩展界面</span>
                  </div>
                </div>
              </div>
              <div
                className={`preview-inplace ${isPreviewOpen ? "is-open" : ""}`}
                aria-hidden={!isPreviewOpen}
              >
                <button
                  className="preview-inplace-backdrop"
                  aria-label="关闭预览"
                  onClick={() => setIsPreviewOpen(false)}
                />
                <div className="preview-inplace-body">
                  <button
                    type="button"
                    className="preview-close-btn"
                    aria-label="关闭预览"
                    onClick={() => setIsPreviewOpen(false)}
                  >
                    ×
                  </button>
                  <img
                    src={`${import.meta.env.BASE_URL}extension-screenshot.png`}
                    alt="扩展界面预览（放大）"
                    className="preview-inplace-img"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="container">
        <section id="features" className="section">
          <h2 className="section-title">核心特性</h2>
          <div className="feature-grid">
            {featureCards.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="scenarios" className="section section-muted">
          <h2 className="section-title">标准使用流程</h2>
          <div className="workflow-grid">
            {workflowSteps.map((step, index) => (
              <article key={step.title} className="workflow-card">
                <span className="workflow-index">{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="install" className="section">
          <h2 className="section-title">本地安装教程</h2>
          <div className="install-grid">
            <div className="install-card">
              <h3 className="install-title">方式一：从 GitHub Releases 安装（推荐）</h3>
              <ol className="install-steps">
                <li>
                  打开仓库 <a className="install-link" href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">GitHub</a>，进入 Releases 下载最新的扩展压缩包。
                  {chromeDownloadUrl ? (
                    <>
                      {" "}也可 <a className="install-link" href={chromeDownloadUrl} target="_blank" rel="noreferrer">点击直接下载 Chrome 扩展包</a>。
                    </>
                  ) : null}
                </li>
                <li>解压到本地任意目录（后续不要删除/移动该目录）。</li>
                <li>打开 Chrome 扩展管理页：<span className="install-kbd">chrome://extensions</span>。</li>
                <li>右上角开启「开发者模式」。</li>
                <li>点击「加载已解压的扩展程序」，选择刚才解压后的目录。</li>
              </ol>
              <div className="install-tip">
                提示：如果你更新了版本，建议先移除旧的解压目录扩展，再重新加载新目录，避免资源缓存导致的异常。
              </div>
            </div>

            <div className="install-card">
              <h3 className="install-title">方式二：从源码构建并安装</h3>
              <ol className="install-steps">
                <li>克隆仓库到本地。</li>
                <li>在项目根目录执行：</li>
              </ol>
              <pre className="install-code">
                <code>{`pnpm install
pnpm build`}</code>
              </pre>
              <ol className="install-steps" start={4}>
                <li>构建完成后，打开 <span className="install-kbd">chrome://extensions</span> 并开启开发者模式。</li>
                <li>点击「加载已解压的扩展程序」，选择目录：<span className="install-kbd">.output/chrome-mv3/</span>。</li>
              </ol>
              <div className="install-tip">
                如果提示缺少权限或 Cookie 相关 API 不可用，请确认已在弹窗里授权对应站点权限，并在扩展详情页中检查「网站访问权限」设置。
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-inner container">
          <span>Storage Dev Tools</span>
          <span className="dot" />
          <span>现代化、轻量、可审计的环境存储助手</span>
        </div>
      </footer>
    </div>
  );
};
