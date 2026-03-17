import type { FC } from "react";

const features: { title: string; description: string }[] = [
  {
    title: "一键同步 Cookie / LocalStorage",
    description: "在开发、测试、预发布环境之间快速迁移登录态和配置数据，提高调试效率。",
  },
  {
    title: "安全可控",
    description: "所有数据仅在本地浏览器中处理，不会上传到任何服务器。",
  },
  {
    title: "为前端开发者而生",
    description: "专注于 3-5 个关键 key 的高频场景，简单、直接、不打扰。",
  },
];

export const App: FC = () => {
  return (
    <div className="page">
      <header className="hero">
        <div className="hero-badge">Chrome 扩展 · Storage Dev Tools</div>
        <h1 className="hero-title">在环境之间，秒级同步你的登录态和配置</h1>
        <p className="hero-subtitle">
          Storage Dev Tools 帮你在 dev / test / staging 之间快速迁移 Cookie 和 LocalStorage，
          不再反复复制粘贴 token 或配置。
        </p>
        <div className="hero-actions">
          <a className="btn-primary" href="#" target="_blank" rel="noreferrer">
            前往安装（占位链接）
          </a>
          <a className="btn-ghost" href="#features">
            了解功能
          </a>
        </div>
      </header>

      <section className="screenshot-section">
        <div className="screenshot-wrapper">
          <img
            src="/extension-screenshot.png"
            alt="Storage Dev Tools 扩展界面：操作 Tab 下的读取与写入存储数据功能"
            className="screenshot-img"
          />
        </div>
        <p className="screenshot-caption">扩展界面一览 · 支持 Cookie 与 LocalStorage 的读取与写入</p>
      </section>

      <main>
        <section id="features" className="section">
          <h2 className="section-title">核心特性</h2>
          <div className="feature-grid">
            {features.map((item) => (
              <article key={item.title} className="feature-card">
                <h3 className="feature-title">{item.title}</h3>
                <p className="feature-desc">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-muted">
          <h2 className="section-title">适合这些场景</h2>
          <ul className="scenario-list">
            <li>在 dev.example.com 调好配置，想要快速同步到 staging.example.com</li>
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

