import { GraduationCap, ExternalLink } from "lucide-react";

const LINKS = [
  ["home", "Overview"],
  ["chat", "Ask CampusMate"],
  ["notices", "Noticeboard"],
  ["tickets", "Helpdesk tickets"],
  ["how", "How it works"],
  ["testing", "Testing plan"],
];

export default function Footer({ onNavigate }) {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="brand-mark">
            <GraduationCap size={20} />
          </span>
          <div>
            <b>
              campusmate<span className="brand-dot">.</span>
            </b>
            <small>Official information with a source and a clear next step.</small>
          </div>
        </div>
        <nav className="footer-links" aria-label="Footer">
          {LINKS.map(([target, label]) => (
            <button key={target} onClick={() => onNavigate(target)}>
              {label}
            </button>
          ))}
          <button onClick={() => onNavigate("admin")} className="footer-admin">
            Admin workspace <ExternalLink size={12} />
          </button>
        </nav>
        <div className="footer-bottom">
          <span>CAMPUSMATE · SMART STUDENT HELPDESK CHATBOT</span>
          <span>
            Presentation mode · Anonymous · Synthetic sample data only
          </span>
        </div>
      </div>
    </footer>
  );
}
