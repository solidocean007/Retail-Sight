import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import "./accessPageShell.css";

type AccessHighlight = {
  label: string;
  detail: string;
};

type AccessPageShellProps = {
  storyEyebrow: string;
  storyTitle: string;
  storyDescription: string;
  highlights: AccessHighlight[];
  panelEyebrow: string;
  panelTitle: string;
  panelDescription?: string;
  children: ReactNode;
  trustMessage?: string;
};

export default function AccessPageShell({
  storyEyebrow,
  storyTitle,
  storyDescription,
  highlights,
  panelEyebrow,
  panelTitle,
  panelDescription,
  children,
  trustMessage = "Your account and company information stay private.",
}: AccessPageShellProps) {
  return (
    <main className="access-shell-page">
      <div className="access-shell-layout">
        <aside className="access-shell-story" aria-label="About Displaygram">
          <Link to="/" className="access-shell-brand-link">
            <img
              src="/displaygram-logo-long-BLUE.svg"
              alt="Displaygram"
              className="access-shell-logo"
            />
          </Link>

          <div className="access-shell-story-copy">
            <p className="access-shell-eyebrow">{storyEyebrow}</p>
            <h1>{storyTitle}</h1>
            <p className="access-shell-lede">{storyDescription}</p>
          </div>

          <ul className="access-shell-highlights">
            {highlights.map((highlight, index) => (
              <li key={highlight.label}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{highlight.label}</strong>
                  <p>{highlight.detail}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="access-shell-trust">
            <span aria-hidden="true">✓</span>
            <p>{trustMessage}</p>
          </div>
        </aside>

        <section className="access-shell-panel" aria-labelledby="access-panel-title">
          <div className="access-shell-panel-inner">
            <header className="access-shell-panel-header">
              <p className="access-shell-panel-eyebrow">{panelEyebrow}</p>
              <h2 id="access-panel-title">{panelTitle}</h2>
              {panelDescription && <p>{panelDescription}</p>}
            </header>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
