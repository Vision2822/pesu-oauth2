// components/json-viewer.tsx — FULL REPLACEMENT
"use client";

interface Props {
  data: string;
  title?: string;
}

function highlightJSON(json: string): string {
  return json
    .replace(
      /("(?:[^"\\]|\\.)*")\s*:/g,
      '<span class="json-key">$1</span>:'
    )
    .replace(
      /:\s*("(?:[^"\\]|\\.)*")/g,
      ': <span class="json-string">$1</span>'
    )
    .replace(
      /:\s*(true|false)/g,
      ': <span class="json-bool">$1</span>'
    )
    .replace(
      /:\s*(null)/g,
      ': <span class="json-null">$1</span>'
    )
    .replace(
      /:\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g,
      ': <span class="json-number">$1</span>'
    );
}

function getFieldIcon(key: string): string {
  const icons: Record<string, string> = {
    name: "id",
    prn: "#",
    srn: "#",
    email: "@",
    phone: "tel",
    program: "edu",
    branch: "dep",
    semester: "sem",
    section: "sec",
    campus: "loc",
    campus_code: "loc",
    photo_base64: "img",
    date_of_birth: "dob",
    error: "err",
    message: "msg",
  };
  return icons[key] ?? "—";
}

export function JsonViewer({ data, title = "Response" }: Props) {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(data);
  } catch {
    return (
      <div className="json-viewer">
        <pre className="json-raw">{data}</pre>
      </div>
    );
  }

  const isError = "error" in parsed;
  const fieldCount = Object.keys(parsed).length;

  return (
    <div className="json-viewer">
      {/* Header */}
      <div className="json-header">
        <div className="json-header-left">
          <span
            className="json-status-dot"
            style={{ background: isError ? "#c44" : "#4a4" }}
          />
          <span className="json-title">{title}</span>
        </div>
        <div className="json-header-right">
          <span className="json-badge">
            {fieldCount} field{fieldCount !== 1 ? "s" : ""}
          </span>
          <span className="json-badge">JSON</span>
        </div>
      </div>

      {/* Card View */}
      <div className="json-cards">
        {Object.entries(parsed).map(([key, value]) => {
          const icon = getFieldIcon(key);
          const isPhotoField = key === "photo_base64";

          return (
            <div
              key={key}
              className={`json-field ${isError && key === "error" ? "json-field-error" : ""}`}
            >
              <div className="json-field-header">
                <span className="json-field-icon">{icon}</span>
                <span className="json-field-key">{key}</span>
              </div>
              <div className="json-field-value">
                {isPhotoField && typeof value === "string" ? (
                  <div className="json-photo-wrapper">
                    <img
                      src={`data:image/jpeg;base64,${value}`}
                      alt="Profile"
                      className="json-photo"
                    />
                    <span className="json-photo-label">
                      {value.length.toLocaleString()} chars
                    </span>
                  </div>
                ) : typeof value === "object" ? (
                  <span className="json-field-nonstring">
                    {JSON.stringify(value)}
                  </span>
                ) : typeof value === "boolean" || value === null ? (
                  <span className="json-field-nonstring">
                    {String(value)}
                  </span>
                ) : typeof value === "number" ? (
                  <span className="json-field-nonstring">
                    {value}
                  </span>
                ) : (
                  <span>{String(value)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Raw JSON */}
      <details className="json-raw-section">
        <summary className="json-raw-toggle">
          <span className="json-raw-toggle-icon">{"{ }"}</span>
          Raw JSON
        </summary>
        <div className="json-raw-content">
          <div className="json-raw-bar">
            <span className="json-raw-lang">json</span>
            <span className="json-raw-separator" />
            <span className="json-raw-size">
              {new Blob([JSON.stringify(parsed)]).size} bytes
            </span>
            <button
              className="json-copy-btn"
              onClick={(e) => {
                navigator.clipboard.writeText(
                  JSON.stringify(parsed, null, 2)
                );
                const btn = e.currentTarget;
                btn.textContent = "copied";
                setTimeout(() => (btn.textContent = "copy"), 1500);
              }}
            >
              copy
            </button>
          </div>
          <div className="json-raw-body">
            <div className="json-line-numbers">
              {JSON.stringify(parsed, null, 2)
                .split("\n")
                .map((_, i) => (
                  <span key={i}>{i + 1}</span>
                ))}
            </div>
            <pre className="json-highlighted">
              <code
                dangerouslySetInnerHTML={{
                  __html: highlightJSON(JSON.stringify(parsed, null, 2)),
                }}
              />
            </pre>
          </div>
        </div>
      </details>
    </div>
  );
}