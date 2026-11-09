import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Trash2, LifeBuoy } from "lucide-react";
import { askCampusMate, CATEGORIES } from "../lib/api.js";
import AnswerStateBadge from "./AnswerStateBadge.jsx";
import SourceCard from "./SourceCard.jsx";

/**
 * Student chat interface.
 *
 * Implements the full conversation flow: ask -> clarify -> answer with source,
 * or escalate to a helpdesk ticket. Answer states are rendered explicitly.
 */

const QUICK_QUESTIONS = [
  "When is my Mathematics exam?",
  "Which documents do I need?",
  "How do I register for an event?",
  "Where is my next class?",
];

let idSeq = 0;
const nextId = () => `m${++idSeq}`;

export default function ChatPanel({ onOpenSource, onRaiseTicket, context, onContextChange, pendingQuestion, onConsumePending }) {
  const [messages, setMessages] = useState([
    {
      id: nextId(),
      role: "assistant",
      text:
        "Hello! Ask me about admissions, fees, examinations, timetables or college activities. Add your programme and semester for a precise answer.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, loading]);

  // A question chosen on the landing page is sent automatically once.
  useEffect(() => {
    if (pendingQuestion) {
      send(pendingQuestion);
      onConsumePending?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuestion]);

  async function send(questionText) {
    const question = (questionText ?? input).trim();
    if (!question || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { id: nextId(), role: "student", text: question }]);
    setLoading(true);
    try {
      const result = await askCampusMate(question, context);
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", result },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          result: {
            state: "escalated",
            answer: `Something went wrong: ${error.message}. Please raise a helpdesk ticket.`,
            ticket_suggested: true,
            citations: [],
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-panel">
      <div className="chat-top">
        <div className="bot-avatar">
          <Sparkles size={17} />
        </div>
        <div>
          <b>CampusMate</b>
          <small>
            <span className="status-dot" /> Approved knowledge desk
          </small>
        </div>
        <span className="demo-tag">SAMPLE DATA</span>
        <button
          className="icon-btn tiny"
          title="Clear chat"
          aria-label="Clear chat"
          onClick={() => setMessages([])}
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="chat-body" ref={bodyRef} role="log" aria-live="polite">
        {messages.map((m) =>
          m.role === "student" ? (
            <div key={m.id} className="message user-message">
              {m.text}
            </div>
          ) : m.result ? (
            <AssistantMessage
              key={m.id}
              result={m.result}
              onOpenSource={onOpenSource}
              onRaiseTicket={onRaiseTicket}
            />
          ) : (
            <div key={m.id} className="message bot-message">
              {m.text}
            </div>
          )
        )}
        {loading && (
          <div className="message bot-message loading-indicator" aria-label="CampusMate is thinking">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        )}
      </div>

      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <div className="context-fields">
          <label>
            Programme
            <input
              value={context.programme || ""}
              onChange={(e) => onContextChange({ ...context, programme: e.target.value })}
              placeholder="e.g. BSc CS"
            />
          </label>
          <label>
            Semester
            <select
              value={context.semester || ""}
              onChange={(e) => onContextChange({ ...context, semester: e.target.value })}
            >
              <option value="">Select</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={String(s)}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Subject
            <input
              value={context.subject || ""}
              onChange={(e) => onContextChange({ ...context, subject: e.target.value })}
              placeholder="e.g. Mathematics"
            />
          </label>
          <label>
            Academic year
            <input
              value={context.academic_year || ""}
              onChange={(e) => onContextChange({ ...context, academic_year: e.target.value })}
              placeholder="e.g. 2026-27"
            />
          </label>
        </div>
        <div className="chat-input-row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a campus question…"
            aria-label="Ask a campus question"
          />
          <button className="send-btn" type="submit" aria-label="Send question" disabled={loading}>
            <Send size={18} />
          </button>
        </div>
        <div className="quick-prompts">
          {QUICK_QUESTIONS.map((q) => (
            <button type="button" key={q} onClick={() => send(q)}>
              {q}
            </button>
          ))}
        </div>
        <p className="demo-disclaimer">
          Answers use synthetic sample notices in this build. Always confirm with the
          official college notice.
        </p>
      </form>
    </div>
  );
}

function AssistantMessage({ result, onOpenSource, onRaiseTicket }) {
  const [showSources, setShowSources] = useState(true);
  return (
    <div className="message bot-message assistant-message">
      <AnswerStateBadge state={result.state} showBlurb />
      <p className="assistant-text">{result.answer}</p>

      {result.clarification_question && (
        <p className="clarification">
          <strong>Clarification:</strong> {result.clarification_question}
        </p>
      )}

      {result.citations?.length > 0 && (
        <>
          <button
            className="sources-toggle"
            onClick={() => setShowSources((v) => !v)}
            aria-expanded={showSources}
          >
            {showSources ? "Hide" : "Show"} {result.citations.length} source
            {result.citations.length > 1 ? "s" : ""}
          </button>
          {showSources &&
            result.citations.map((c) => (
              <SourceCard
                key={`${c.document_id}-${c.page}`}
                citation={c}
                onOpen={onOpenSource}
              />
            ))}
        </>
      )}

      {result.ticket_suggested && (
        <button className="btn btn-small btn-primary" onClick={() => onRaiseTicket(result)}>
          <LifeBuoy size={14} /> Raise a helpdesk ticket
        </button>
      )}

      {result.knowledge_version && (
        <small className="kv-note">Knowledge version: {result.knowledge_version}</small>
      )}
    </div>
  );
}
