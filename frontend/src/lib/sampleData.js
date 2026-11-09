/**
 * Synthetic demonstration content from the presentation.
 *
 * IMPORTANT: every item here is clearly-labelled SAMPLE data. It is never real
 * college information. The example conversation mirrors the PPTX slide showing
 * that CampusMate asks a clarifying question before answering.
 */

export const SAMPLE_CONVERSATION = {
  title: "Example conversation (synthetic demo data)",
  note: "This transcript uses the presentation's synthetic sample notice. It is not a real examination schedule.",
  turns: [
    { role: "student", text: "When is my exam?" },
    {
      role: "assistant",
      state: "needs_context",
      text: "Which programme, semester and subject?",
    },
    { role: "student", text: "BSc CS, Semester 1, Mathematics." },
    {
      role: "assistant",
      state: "answered",
      text: "10 December 2026, 10:00 AM — Room 204.",
      citation: {
        document_title: "Sample_Exam_Notice_v2.pdf",
        page: 1,
        publication_date: "3 November 2026",
        version: 2,
        replaces: "Replaces version 1",
      },
    },
  ],
};

export const PROBLEMS = [
  {
    id: "scattered",
    title: "Scattered notices",
    body: "Students search multiple places to find useful information.",
  },
  {
    id: "context",
    title: "Missing context",
    body: "Fees and timetables depend on programme, semester, and date.",
  },
  {
    id: "repeated",
    title: "Repeated office queries",
    body: "Staff repeatedly answer common questions while unusual cases wait.",
  },
];

export const WORKFLOW = [
  {
    step: 1,
    title: "Ask a question in everyday language",
    body: "Type your question the way you would say it. Add your programme and semester when you can.",
  },
  {
    step: 2,
    title: "Read an answer with its official source",
    body: "Every answer shows the notice it came from, the exact page, the publication date and the version.",
  },
  {
    step: 3,
    title: "Clarify, or create a helpdesk ticket",
    body: "If details are missing CampusMate asks for them. If nothing supports the answer, raise a ticket instead of guessing.",
  },
];

export const TOPICS = [
  {
    id: "admissions",
    name: "Admissions",
    example: "Which documents do I need?",
    context: "Programme and entry route.",
    description: "Entry requirements, document checklists and eligibility.",
  },
  {
    id: "fees",
    name: "Fees",
    example: "When is the next fee deadline?",
    context: "Programme and academic year.",
    description:
      "Fee deadlines and payment steps. Private fee balances are never shown here.",
  },
  {
    id: "examinations",
    name: "Examinations",
    example: "When is my Mathematics exam?",
    context: "Semester and subject.",
    description: "Examination dates, rooms and hall-ticket guidance.",
  },
  {
    id: "timetables",
    name: "Timetables",
    example: "Where is my next class?",
    context: "Division, day, and time.",
    description: "Class schedules, rooms and lab sessions.",
  },
  {
    id: "activities",
    name: "College activities",
    example: "How do I register for an event?",
    context: "Event and eligibility.",
    description: "Events, clubs, sports and how to register.",
  },
];

export const TICKET_STATUSES = [
  "open",
  "pending",
  "in_progress",
  "resolved",
  "closed",
];

export const STATUS_LABELS = {
  open: "Open",
  pending: "Pending",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export const PROPOSED_TARGETS = [
  { label: "Supported-answer accuracy", target: "90%+" },
  { label: "Citation coverage", target: "100% of factual answers" },
  { label: "Unsupported guesses", target: "Zero across the unsupported set" },
  { label: "p95 response time", target: "5s or less on the demo setup" },
];

/**
 * Measured results for THIS demo build with synthetic sample data.
 *
 * Produced by `python tests/run_validation.py` over the 50-question dataset.
 * These are real measurements of the offline demo, not the proposed targets,
 * and they do not represent performance on real college data.
 */
export const MEASURED_RESULTS = {
  runLabel: "50-question curated dataset · offline stub LLM · sample data",
  metrics: [
    { label: "Supported-answer accuracy", measured: "25/25 (100%)", target: "90%+" },
    { label: "Citation coverage", measured: "26/26 (100%)", target: "100%" },
    { label: "Unsupported guesses", measured: "0 of 10", target: "0" },
    { label: "Clarification rate", measured: "10/50 (20%)", target: "n/a" },
    { label: "Escalation rate", measured: "14/50 (28%)", target: "n/a" },
    { label: "p95 response time", measured: "8 ms (local)", target: "≤ 5s" },
  ],
  caveat:
    "Latency was measured locally with a deterministic stub model. A hosted model adds network time; re-run the harness against the target deployment before quoting it.",
};

export const TEST_DATASET = [
  { label: "Routine questions (5 per category)", count: 25 },
  { label: "Questions missing context", count: 10 },
  { label: "Outdated or conflicting notices", count: 5 },
  { label: "Unsupported questions", count: 10 },
];

export const ROADMAP = [
  "Hindi and Marathi support",
  "Opt-in deadline reminders (require student consent)",
  "Student portal integration (authentication + separate permission design)",
  "Staff review of unanswered topics",
];
