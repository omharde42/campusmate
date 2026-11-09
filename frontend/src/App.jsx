import { useCallback, useEffect, useState } from "react";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import SourceViewer from "./components/SourceViewer.jsx";
import Landing from "./pages/Landing.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import Noticeboard from "./pages/Noticeboard.jsx";
import Tickets from "./pages/Tickets.jsx";
import HowItWorks from "./pages/HowItWorks.jsx";
import TestingPlan from "./pages/TestingPlan.jsx";
import AdminWorkspace from "./pages/AdminWorkspace.jsx";
import { getMode } from "./lib/api.js";

/**
 * CampusMate application shell.
 *
 * Holds global appearance/accessibility state, the active page, the shared chat
 * context and the source viewer. Pages are modular components under `pages/`.
 */
export default function App() {
  const [page, setPage] = useState("home");
  const [theme, setTheme] = useState(localStorage.getItem("cm-theme") || "dark");
  const [largeText, setLargeText] = useState(localStorage.getItem("cm-large") === "true");
  const [highContrast, setHighContrast] = useState(localStorage.getItem("cm-contrast") === "true");
  const [reduceMotion, setReduceMotion] = useState(localStorage.getItem("cm-motion") === "true");
  const [mode, setMode] = useState(getMode());

  const [chatContext, setChatContext] = useState({});
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const [sourceCitation, setSourceCitation] = useState(null);
  const [ticketPreset, setTicketPreset] = useState(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("cm-theme", theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.classList.toggle("large-text", largeText);
    localStorage.setItem("cm-large", largeText);
  }, [largeText]);
  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", highContrast);
    localStorage.setItem("cm-contrast", highContrast);
  }, [highContrast]);
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
    localStorage.setItem("cm-motion", reduceMotion);
  }, [reduceMotion]);

  const navigate = useCallback(
    (next) => {
      setPage(next);
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      setMode(getMode());
    },
    [reduceMotion]
  );

  const handleAsk = useCallback(
    (question) => {
      setPendingQuestion(question);
      navigate("chat");
    },
    [navigate]
  );

  const handleRaiseTicket = useCallback(
    (result) => {
      setTicketPreset({
        category: result?.category || undefined,
        description: result?.answer ? `Related to: ${result.answer}` : "",
      });
      navigate("tickets");
    },
    [navigate]
  );

  return (
    <div className="app-shell">
      <Header
        page={page}
        onNavigate={navigate}
        theme={theme}
        onTheme={() => setTheme(theme === "light" ? "dark" : "light")}
        largeText={largeText}
        onLargeText={() => setLargeText((v) => !v)}
        highContrast={highContrast}
        onHighContrast={() => setHighContrast((v) => !v)}
        reduceMotion={reduceMotion}
        onReduceMotion={() => setReduceMotion((v) => !v)}
        mode={mode}
      />

      {page === "home" && <Landing onNavigate={navigate} onAsk={handleAsk} />}
      {page === "chat" && (
        <ChatPage
          context={chatContext}
          onContextChange={setChatContext}
          onOpenSource={setSourceCitation}
          onAskTopic={handleAsk}
          onNavigate={navigate}
          pendingQuestion={pendingQuestion}
          onConsumePending={() => setPendingQuestion(null)}
        />
      )}
      {page === "notices" && <Noticeboard onOpenSource={setSourceCitation} />}
      {page === "tickets" && <Tickets preset={ticketPreset} onNavigate={navigate} />}
      {page === "how" && <HowItWorks />}
      {page === "testing" && <TestingPlan />}
      {page === "admin" && <AdminWorkspace />}

      <Footer onNavigate={navigate} />

      <SourceViewer citation={sourceCitation} onClose={() => setSourceCitation(null)} />
    </div>
  );
}
