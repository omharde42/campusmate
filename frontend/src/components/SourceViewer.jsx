import { X, FileText, ExternalLink, Download } from "lucide-react";
import AnswerStateBadge from "./AnswerStateBadge.jsx";

/**
 * Source viewer.
 *
 * Opens the source document for a citation. For PDF sources the file is shown
 * in an embedded viewer where the browser supports it, with an explicit
 * open/download action as a fallback. Replaced / expired sources are labelled.
 */
export default function SourceViewer({ citation, onClose }) {
  if (!citation) return null;
  const url = citation.open_url || `/api/documents/${citation.document_id}/source`;
  const isSample = true;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card source-viewer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="source-viewer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close icon-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <div className="page-kicker">
          <FileText size={16} /> SOURCE DOCUMENT
        </div>
        <h2 id="source-viewer-title">{citation.document_title}</h2>
        <dl className="source-meta">
          <div>
            <dt>Page</dt>
            <dd>{citation.page}</dd>
          </div>
          <div>
            <dt>Publication date</dt>
            <dd>{citation.publication_date || "Not available"}</dd>
          </div>
          <div>
            <dt>Version</dt>
            <dd>{citation.version}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <span className={`source-badge source-${citation.source_status}`}>
                {citation.source_status}
              </span>
            </dd>
          </div>
        </dl>

        {citation.excerpt && (
          <blockquote className="source-quote">“{citation.excerpt}”</blockquote>
        )}

        <div className="source-viewer-frame">
          <object data={`${url}#page=${citation.page}`} type="application/pdf" width="100%" height="320">
            <div className="pdf-fallback">
              <FileText size={26} />
              <p>Inline preview is unavailable in this browser.</p>
              <a className="btn btn-small btn-outline" href={url} target="_blank" rel="noreferrer">
                Open document <ExternalLink size={13} />
              </a>
            </div>
          </object>
        </div>

        <div className="modal-actions">
          <a className="btn btn-primary" href={url} target="_blank" rel="noreferrer">
            Open source document <ExternalLink size={15} />
          </a>
          <a className="btn btn-outline" href={url} download>
            Download <Download size={15} />
          </a>
        </div>

        {isSample && (
          <p className="demo-disclaimer">
            Synthetic sample document generated for the CampusMate demonstration.
            It is not an official college notice.
          </p>
        )}
      </div>
    </div>
  );
}
