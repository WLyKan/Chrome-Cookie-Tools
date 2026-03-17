import type { FC } from "react";

const navLinks = [
  { href: "#features", label: "功能特性" },
  { href: "#scenarios", label: "使用场景" },
  { href: "#", label: "文档" },
];

const badges = [
  { label: "CHROME 扩展", color: "badge-blue" },
  { label: "V0.9.0", color: "badge-blue" },
  { label: "COOKIE + LOCALSTORAGE", color: "badge-green" },
  { label: "本地处理", color: "badge-purple" },
  { label: "开源免费", color: "badge-orange" },
];

const toolCategories = [
  { icon: "📋", label: "Cookie 读写" },
  { icon: "🗄️", label: "LocalStorage" },
  { icon: "⚙️", label: "配置管理" },
  { icon: "🔄", label: "跨环境同步" },
  { icon: "🔒", label: "安全可控" },
  { icon: "⚡", label: "即装即用" },
];

export const App: FC = () => {
  return (
    <div className="page">
      <nav className="navbar">
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
          <a href="#" className="btn-nav-outline" target="_blank" rel="noreferrer">
            立即安装
          </a>
          <a href="#" className="btn-nav-github" target="_blank" rel="noreferrer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-1.23-3.795-1.23-.54-1.38-1.335-1.755-1.335-1.755-1.08-.75.09-.735.09-.735 1.2.09 1.83 1.23 1.83 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub
          </a>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-inner">
          <div className="hero-left">
            <h1 className="hero-title">
              开发者的
              <span className="hero-title-highlight">存储同步助手</span>
            </h1>
            <p className="hero-desc">
              Storage Dev Tools 是一款面向开发者的 Chrome 浏览器扩展，用于在开发、测试、预发布环境之间快速传输 Cookie 和 LocalStorage 数据。
              支持认证 Token 和配置数据的跨环境同步，简化调试流程，提高开发效率。
            </p>
            <div className="hero-badges">
              {badges.map((b) => (
                <span key={b.label} className={`badge ${b.color}`}>
                  {b.label}
                </span>
              ))}
            </div>
            <div className="hero-actions">
              <a href="#" className="btn-primary" target="_blank" rel="noreferrer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                立即安装
              </a>
              <a href="#" className="btn-secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                了解更多
              </a>
            </div>
          </div>

          <div className="hero-right">
            <div className="browser-mockup">
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
                      <span className="tool-icon">{t.icon}</span>
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
                    <div className="extra-preview">
                      <img
                        src="/extension-screenshot.png"
                        alt="扩展界面预览"
                        className="extra-img"
                      />
                    </div>
                    <span className="extra-caption">扩展界面</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main>
        <section id="features" className="section">
          <h2 className="section-title">核心特性</h2>
          <div className="feature-grid">
            <article className="feature-card">
              <h3 className="feature-title">一键同步 Cookie / LocalStorage</h3>
              <p className="feature-desc">在 dev / test / staging 之间快速迁移登录态和配置数据。</p>
            </article>
            <article className="feature-card">
              <h3 className="feature-title">安全可控</h3>
              <p className="feature-desc">所有数据仅在本地浏览器中处理，不会上传到任何服务器。</p>
            </article>
            <article className="feature-card">
              <h3 className="feature-title">为前端开发者而生</h3>
              <p className="feature-desc">专注于 3-5 个关键 key 的高频场景，简单、直接。</p>
            </article>
          </div>
        </section>

        <section id="scenarios" className="section section-muted">
          <h2 className="section-title">适合这些场景</h2>
          <ul className="scenario-list">
            <li>在 dev.example.com 调好配置，快速同步到 staging.example.com</li>
            <li>频繁切换不同账号 / 环境，需要快速迁移认证 Token</li>
            <li>团队成员之间共享一组本地配置 key，减少重复配置成本</li>
          </ul>
        </section>
      </main>

      <footer className="footer">
        <span>Storage Dev Tools</span>
        <span className="dot" />
        <span>专为前端开发者设计的环境存储助手</span>
      </footer>
    </div>
  );
};
