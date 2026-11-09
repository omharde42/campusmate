import { useState } from "react";
import {
  Accessibility,
  Contrast,
  Eye,
  GraduationCap,
  Menu,
  Moon,
  Sun,
  Type,
  X,
} from "lucide-react";

const NAV = [
  ["home", "Overview"],
  ["chat", "Ask CampusMate"],
  ["notices", "Noticeboard"],
  ["tickets", "Tickets"],
  ["how", "How it works"],
];

export default function Header({
  page,
  onNavigate,
  theme,
  onTheme,
  largeText,
  onLargeText,
  highContrast,
  onHighContrast,
  reduceMotion,
  onReduceMotion,
  mode,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const go = (target) => {
    setMenuOpen(false);
    setSettingsOpen(false);
    onNavigate(target);
  };

  return (
    <header className="topbar">
      <button className="brand" onClick={() => go("home")} aria-label="CampusMate home">
        <span className="brand-mark">
          <GraduationCap size={21} />
        </span>
        <span>
          campusmate<span className="brand-dot">.</span>
          <small>SMART STUDENT HELPDESK</small>
        </span>
      </button>

      <nav className={`nav ${menuOpen ? "open" : ""}`} aria-label="Primary">
        {NAV.map(([target, label]) => (
          <button
            key={target}
            className={`nav-link ${page === target ? "active" : ""}`}
            onClick={() => go(target)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="top-actions">
        <span className={`mode-pill ${mode === "offline" ? "offline" : ""}`} title="Backend connection status">
          <span className="status-dot" /> {mode === "offline" ? "Offline demo" : "Live API"}
        </span>
        <button
          className="icon-btn"
          aria-label="Accessibility and appearance settings"
          onClick={() => setSettingsOpen((v) => !v)}
        >
          <Accessibility size={19} />
        </button>
        <button className="btn btn-small btn-outline" onClick={() => go("tickets")}>
          Raise a ticket
        </button>
        <button
          className="btn btn-small btn-primary desktop-only"
          onClick={() => go("admin")}
        >
          Admin
        </button>
        <button
          className="icon-btn mobile-menu-btn"
          aria-label="Open navigation"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {settingsOpen && (
        <div className="settings-popover">
          <div className="popover-head">
            <strong>Appearance &amp; accessibility</strong>
            <button
              className="icon-btn tiny"
              onClick={() => setSettingsOpen(false)}
              aria-label="Close settings"
            >
              <X size={15} />
            </button>
          </div>
          <div className="setting-row">
            <span>
              {theme === "light" ? <Sun size={16} /> : <Moon size={16} />} Light theme
            </span>
            <button
              className={`switch ${theme === "light" ? "on" : ""}`}
              role="switch"
              aria-checked={theme === "light"}
              onClick={onTheme}
            >
              <i />
            </button>
          </div>
          <div className="setting-row">
            <span>
              <Type size={16} /> Larger text
            </span>
            <button
              className={`switch ${largeText ? "on" : ""}`}
              role="switch"
              aria-checked={largeText}
              onClick={onLargeText}
            >
              <i />
            </button>
          </div>
          <div className="setting-row">
            <span>
              <Contrast size={16} /> High contrast
            </span>
            <button
              className={`switch ${highContrast ? "on" : ""}`}
              role="switch"
              aria-checked={highContrast}
              onClick={onHighContrast}
            >
              <i />
            </button>
          </div>
          <div className="setting-row">
            <span>
              <Eye size={16} /> Reduce animations
            </span>
            <button
              className={`switch ${reduceMotion ? "on" : ""}`}
              role="switch"
              aria-checked={reduceMotion}
              onClick={onReduceMotion}
            >
              <i />
            </button>
          </div>
          <p className="tiny-note">Settings are saved in this browser.</p>
        </div>
      )}
    </header>
  );
}
