/**
 * Offline demo engine.
 *
 * A browser-side mirror of the backend answer policy, used only when the
 * FastAPI service cannot be reached. It applies the same rules: category
 * detection, clarification for missing context, evidence-only answers and
 * escalation for unsupported questions. All content is synthetic SAMPLE data.
 */

export const OFFLINE_NOTICES = [
  {
    id: 1,
    doc_uid: "admiss-sample01",
    title: "Admissions document checklist (sample)",
    category: "Admissions",
    doc_type: "pdf",
    programme: "BSc CS",
    academic_year: "2026-27",
    publication_date: "2026-10-28",
    version: 1,
    source_page: 1,
    status: "published",
  },
  {
    id: 2,
    doc_uid: "fees-sample02",
    title: "Fee payment information (sample)",
    category: "Fees",
    doc_type: "pdf",
    programme: "BSc CS",
    academic_year: "2026-27",
    publication_date: "2026-10-22",
    version: 1,
    source_page: 1,
    status: "published",
  },
  {
    id: 3,
    doc_uid: "examin-sample03",
    title: "Sample Mathematics examination notice (superseded)",
    category: "Examinations",
    doc_type: "pdf",
    programme: "BSc CS",
    semester: "1",
    subject: "Mathematics",
    publication_date: "2026-09-15",
    version: 1,
    source_page: 1,
    status: "replaced",
  },
  {
    id: 4,
    doc_uid: "examin-sample04",
    title: "Sample Mathematics examination notice (current)",
    category: "Examinations",
    doc_type: "pdf",
    programme: "BSc CS",
    semester: "1",
    subject: "Mathematics",
    publication_date: "2026-11-03",
    version: 2,
    source_page: 1,
    status: "published",
  },
  {
    id: 5,
    doc_uid: "timet-sample05",
    title: "Weekly timetable sample",
    category: "Timetables",
    doc_type: "pdf",
    programme: "BSc CS",
    semester: "1",
    publication_date: "2026-10-18",
    version: 1,
    source_page: 1,
    status: "published",
  },
  {
    id: 6,
    doc_uid: "colleg-sample06",
    title: "Campus activity registration (sample)",
    category: "College activities",
    doc_type: "pdf",
    publication_date: "2026-10-12",
    version: 1,
    source_page: 1,
    status: "published",
  },
];

const EVIDENCE = {
  Admissions:
    "Documents required for admission: class 12 marksheet, transfer certificate, migration certificate if applicable, category certificate if applicable, four passport-size photographs and a government photo identity proof. Submit originals for verification.",
  Fees: "The semester fee can be paid in two instalments. The first instalment is due before the semester begins and the second is due at the mid-semester review. Pay online through the college fee portal and keep the receipt.",
  Examinations:
    "The Mathematics examination will be held on 10 December 2026 at 10:00 AM in Room 204. This notice replaces version 1. Bring your hall ticket and student ID.",
  Timetables:
    "Monday: Mathematics 09:00 AM Room 204. Monday: Programming Lab 11:00 AM Lab 3. Wednesday: Mathematics 10:00 AM Room 204. Friday: Programming Lab 02:00 PM Lab 3.",
  "College activities":
    "How to register for an event: open the student activities portal and sign in, choose the event, fill the registration form, then collect your participation pass. Eligibility varies by event.",
};

const KEYWORDS = {
  Admissions: ["admission", "document", "apply", "eligibility", "enroll"],
  Fees: ["fee", "payment", "pay", "tuition", "deadline", "scholarship", "refund"],
  Examinations: ["exam", "examination", "test", "paper", "result", "marks", "viva"],
  Timetables: ["timetable", "schedule", "class", "lecture", "room", "period"],
  "College activities": ["event", "activity", "club", "fest", "sport", "register"],
};

const REQUIRED = {
  Admissions: ["programme"],
  Fees: ["programme", "academic_year"],
  Examinations: ["programme", "semester", "subject"],
  Timetables: ["programme", "semester"],
  "College activities": [],
};

const LABELS = {
  programme: "your programme",
  semester: "your semester",
  subject: "the subject",
  academic_year: "the academic year",
};

function detectCategory(question) {
  const q = question.toLowerCase();
  let best = null;
  let bestHits = 0;
  for (const [category, words] of Object.entries(KEYWORDS)) {
    const hits = words.filter((w) => q.includes(w)).length;
    if (hits > bestHits) {
      best = category;
      bestHits = hits;
    }
  }
  return best;
}

function missingContext(category, context) {
  if (!category) return [];
  return REQUIRED[category].filter((f) => !(context[f] || "").trim());
}

function clarification(category, missing) {
  const labels = missing.map((f) => LABELS[f] || f);
  let wanted;
  if (labels.length === 1) wanted = labels[0];
  else if (labels.length === 2) wanted = `${labels[0]} and ${labels[1]}`;
  else wanted = `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
  return `Could you tell me ${wanted}? I need that to find the correct ${category.toLowerCase()} notice.`;
}

function citationFor(category) {
  const doc = OFFLINE_NOTICES.find(
    (d) => d.category === category && d.status === "published"
  );
  if (!doc) return [];
  return [
    {
      document_id: doc.doc_uid,
      document_title: doc.title,
      page: doc.source_page,
      publication_date: doc.publication_date,
      version: doc.version,
      status: doc.status,
      source_status: "current",
      category: doc.category,
      excerpt: EVIDENCE[category],
      open_url: `/api/documents/${doc.doc_uid}/source`,
    },
  ];
}

export function offlineAnswer(question, context = {}) {
  const category = detectCategory(question);
  if (!category) {
    return {
      state: "escalated",
      answer:
        "I could not find an approved notice that answers this question. I will not guess. You can raise a helpdesk ticket and the right office will follow up.",
      clarification_question: null,
      citations: [],
      knowledge_version: "kv-offline",
      category: null,
      is_sample_data: true,
      ticket_suggested: true,
    };
  }
  const missing = missingContext(category, context);
  if (missing.length) {
    return {
      state: "needs_context",
      answer:
        "I can help with that, but I need a little more information before I look for the right notice.",
      clarification_question: clarification(category, missing),
      citations: [],
      knowledge_version: "kv-offline",
      category,
      is_sample_data: true,
      ticket_suggested: false,
    };
  }
  return {
    state: "answered",
    answer: EVIDENCE[category],
    clarification_question: null,
    citations: citationFor(category),
    knowledge_version: "kv-offline",
    category,
    is_sample_data: true,
    ticket_suggested: false,
  };
}
