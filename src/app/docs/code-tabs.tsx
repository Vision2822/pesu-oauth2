"use client";

import { useState } from "react";

interface Tab {
  lang: string;
  code: string;
}

interface Props {
  tabs: Tab[];
}

const LANG_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  JavaScript: { bg: "#1a1a1a", text: "#f7df1e", accent: "#f7df1e" },
  Python: { bg: "#1a1a1a", text: "#3776ab", accent: "#ffd43b" },
  Go: { bg: "#1a1a1a", text: "#00add8", accent: "#00add8" },
};

const SYNTAX: Record<string, { keywords: string[]; strings: RegExp; comments: RegExp; functions: RegExp }> = {
  JavaScript: {
    keywords: ["const", "let", "var", "async", "await", "function", "return", "new", "import", "from", "export", "if", "else", "for", "while"],
    strings: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
    comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
    functions: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
  },
  Python: {
    keywords: ["import", "from", "def", "return", "if", "else", "for", "while", "in", "as", "with", "class", "async", "await", "None", "True", "False"],
    strings: /(["'])(?:(?!\1)[^\\]|\\.)*\1|f(["'])(?:(?!\2)[^\\]|\\.)*\2/g,
    comments: /(#.*$)/gm,
    functions: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
  },
  Go: {
    keywords: ["package", "import", "func", "return", "if", "else", "for", "range", "var", "const", "type", "struct", "interface", "map", "make", "nil"],
    strings: /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
    comments: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
    functions: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
  },
};

function highlightCode(code: string, lang: string): string {
  const syntax = SYNTAX[lang];
  if (!syntax) return escapeHtml(code);

  let highlighted = escapeHtml(code);

  highlighted = highlighted.replace(
    syntax.comments,
    '<span class="code-comment">$1</span>'
  );

  highlighted = highlighted.replace(
    syntax.strings,
    '<span class="code-string">$&</span>'
  );

  syntax.keywords.forEach((kw) => {
    const regex = new RegExp(`\\b(${kw})\\b`, "g");
    highlighted = highlighted.replace(regex, '<span class="code-keyword">$1</span>');
  });

  highlighted = highlighted.replace(
    /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
    '<span class="code-function">$1</span>('
  );

  return highlighted;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function CodeTabs({ tabs }: Props) {
  const [active, setActive] = useState(0);
  const currentTab = tabs[active];
  const colors = LANG_COLORS[currentTab.lang] || LANG_COLORS.JavaScript;

  return (
    <div className="code-block">
      <div className="code-tabs">
        {tabs.map((tab, i) => {
          const c = LANG_COLORS[tab.lang] || LANG_COLORS.JavaScript;
          return (
            <button
              key={tab.lang}
              onClick={() => setActive(i)}
              className={`code-tab ${i === active ? "active" : ""}`}
              style={{
                borderBottomColor: i === active ? c.accent : "transparent",
                color: i === active ? c.text : "var(--g10)",
              }}
            >
              {tab.lang}
            </button>
          );
        })}
        <div className="code-tab-spacer" />
      </div>
      <div className="code-content" style={{ background: colors.bg }}>
        <div className="code-header">
          <span className="code-dot" style={{ background: "#ff5f56" }} />
          <span className="code-dot" style={{ background: "#ffbd2e" }} />
          <span className="code-dot" style={{ background: "#27ca40" }} />
          <span className="code-lang" style={{ color: colors.accent }}>
            {currentTab.lang.toLowerCase()}
          </span>
        </div>
        <pre className="code-pre">
          <code
            dangerouslySetInnerHTML={{
              __html: highlightCode(currentTab.code, currentTab.lang),
            }}
          />
        </pre>
      </div>
    </div>
  );
}