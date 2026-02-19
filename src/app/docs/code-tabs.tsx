// app/docs/code-tabs.tsx — FULL REPLACEMENT
"use client";

import { useState } from "react";

interface Tab {
  lang: string;
  code: string;
}

interface Props {
  tabs: Tab[];
}

interface Token {
  type: "comment" | "string" | "keyword" | "function" | "number" | "plain" | "punctuation";
  value: string;
}

const KEYWORDS: Record<string, Set<string>> = {
  JavaScript: new Set([
    "const", "let", "var", "async", "await", "function", "return",
    "new", "import", "from", "export", "if", "else", "for", "while",
    "true", "false", "null", "undefined", "typeof", "instanceof",
  ]),
  Python: new Set([
    "import", "from", "def", "return", "if", "else", "elif", "for",
    "while", "in", "as", "with", "class", "async", "await", "None",
    "True", "False", "not", "and", "or", "is", "lambda", "try",
    "except", "finally", "raise", "yield", "pass", "break", "continue",
  ]),
  Go: new Set([
    "package", "import", "func", "return", "if", "else", "for",
    "range", "var", "const", "type", "struct", "interface", "map",
    "make", "nil", "true", "false", "defer", "go", "chan", "select",
    "case", "default", "switch", "break", "continue", "fallthrough",
  ]),
};

function tokenize(code: string, lang: string): Token[] {
  const keywords = KEYWORDS[lang] ?? new Set();
  const tokens: Token[] = [];
  let i = 0;

  while (i < code.length) {
    // Single-line comment: // or #
    if (
      (code[i] === "/" && code[i + 1] === "/") ||
      (lang === "Python" && code[i] === "#")
    ) {
      let end = code.indexOf("\n", i);
      if (end === -1) end = code.length;
      tokens.push({ type: "comment", value: code.slice(i, end) });
      i = end;
      continue;
    }

    // Multi-line comment: /* */
    if (code[i] === "/" && code[i + 1] === "*") {
      let end = code.indexOf("*/", i + 2);
      if (end === -1) end = code.length;
      else end += 2;
      tokens.push({ type: "comment", value: code.slice(i, end) });
      i = end;
      continue;
    }

    // Strings: single, double, backtick, f-strings
    if (
      code[i] === '"' ||
      code[i] === "'" ||
      code[i] === "`" ||
      (lang === "Python" && code[i] === "f" && (code[i + 1] === '"' || code[i + 1] === "'"))
    ) {
      let start = i;
      if (code[i] === "f") i++; // skip f prefix
      const quote = code[i];
      i++;
      while (i < code.length) {
        if (code[i] === "\\" && i + 1 < code.length) {
          i += 2;
          continue;
        }
        if (code[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      tokens.push({ type: "string", value: code.slice(start, i) });
      continue;
    }

    // Numbers
    if (/\d/.test(code[i]) && (i === 0 || /[\s,([{:=+\-*/<>!&|^~%]/.test(code[i - 1]))) {
      let end = i;
      while (end < code.length && /[\d.eExXa-fA-F_]/.test(code[end])) end++;
      tokens.push({ type: "number", value: code.slice(i, end) });
      i = end;
      continue;
    }

    // Words (identifiers / keywords)
    if (/[a-zA-Z_$]/.test(code[i])) {
      let end = i;
      while (end < code.length && /[a-zA-Z0-9_$]/.test(code[end])) end++;
      const word = code.slice(i, end);

      if (keywords.has(word)) {
        tokens.push({ type: "keyword", value: word });
      } else if (end < code.length && code[end] === "(") {
        tokens.push({ type: "function", value: word });
      } else {
        tokens.push({ type: "plain", value: word });
      }
      i = end;
      continue;
    }

    // Punctuation and operators
    if (/[{}()\[\];:.,=+\-*/<>!&|^~%?@\\]/.test(code[i])) {
      tokens.push({ type: "punctuation", value: code[i] });
      i++;
      continue;
    }

    // Whitespace and everything else
    let end = i;
    while (
      end < code.length &&
      !/[a-zA-Z0-9_$"'`#/{}()\[\];:.,=+\-*/<>!&|^~%?@\\]/.test(code[end])
    ) {
      end++;
    }
    if (end === i) end = i + 1;
    tokens.push({ type: "plain", value: code.slice(i, end) });
    i = end;
  }

  return tokens;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderTokens(tokens: Token[]): string {
  return tokens
    .map((t) => {
      const escaped = escapeHtml(t.value);
      switch (t.type) {
        case "comment":
          return `<span class="hl-comment">${escaped}</span>`;
        case "string":
          return `<span class="hl-string">${escaped}</span>`;
        case "keyword":
          return `<span class="hl-keyword">${escaped}</span>`;
        case "function":
          return `<span class="hl-function">${escaped}</span>`;
        case "number":
          return `<span class="hl-number">${escaped}</span>`;
        case "punctuation":
          return `<span class="hl-punct">${escaped}</span>`;
        default:
          return escaped;
      }
    })
    .join("");
}

const LANG_ACCENT: Record<string, string> = {
  JavaScript: "#d4a0ff",
  Python: "#ff79c6",
  Go: "#bd93f9",
};

export function CodeTabs({ tabs }: Props) {
  const [active, setActive] = useState(0);
  const currentTab = tabs[active];
  const accent = LANG_ACCENT[currentTab.lang] ?? "#d4a0ff";
  const lines = currentTab.code.split("\n");

  return (
    <div className="code-block">
      <div className="code-tabs">
        {tabs.map((tab, i) => {
          const a = LANG_ACCENT[tab.lang] ?? "#d4a0ff";
          return (
            <button
              key={tab.lang}
              onClick={() => setActive(i)}
              className={`code-tab ${i === active ? "active" : ""}`}
              style={{
                borderBottomColor: i === active ? a : "transparent",
                color: i === active ? a : undefined,
              }}
            >
              {tab.lang.toLowerCase()}
            </button>
          );
        })}
        <div className="code-tab-spacer" />
      </div>
      <div className="code-content">
        <div className="code-bar">
          <span className="code-lang" style={{ color: accent }}>
            {currentTab.lang.toLowerCase()}
          </span>
          <span className="code-bar-sep" />
          <span className="code-line-count">
            {lines.length} lines
          </span>
          <button
            className="code-copy-btn"
            onClick={(e) => {
              navigator.clipboard.writeText(currentTab.code);
              const btn = e.currentTarget;
              btn.textContent = "copied";
              setTimeout(() => (btn.textContent = "copy"), 1500);
            }}
          >
            copy
          </button>
        </div>
        <div className="code-body">
          <div className="code-line-nums">
            {lines.map((_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
          <pre className="code-pre">
            <code
              dangerouslySetInnerHTML={{
                __html: renderTokens(tokenize(currentTab.code, currentTab.lang)),
              }}
            />
          </pre>
        </div>
      </div>
    </div>
  );
}