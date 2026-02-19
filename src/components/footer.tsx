import Link from "next/link";

export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        marginTop: "4rem",
        padding: "2rem 0",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "2rem",
        }}
      >
        <div>
          <p style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.25rem" }}>
            PESU Auth
          </p>
          <p style={{ fontSize: "0.7rem", color: "var(--g10)" }}>
            Not an official PES service.
          </p>
        </div>

        <div style={{ display: "flex", gap: "2rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            <span
              style={{
                fontSize: "0.65rem",
                color: "var(--g10)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Navigate
            </span>
            <Link href="/docs" style={{ fontSize: "0.75rem", color: "var(--g12)" }}>
              Docs
            </Link>
            <Link href="/faq" style={{ fontSize: "0.75rem", color: "var(--g12)" }}>
              FAQ
            </Link>
            <Link href="/about" style={{ fontSize: "0.75rem", color: "var(--g12)" }}>
              About
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            <span
              style={{
                fontSize: "0.65rem",
                color: "var(--g10)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Tools
            </span>
            <Link href="/tester" style={{ fontSize: "0.75rem", color: "var(--g12)" }}>
              Tester
            </Link>
            <Link href="/admin" style={{ fontSize: "0.75rem", color: "var(--g12)" }}>
              Admin
            </Link>
            <Link
              href="/transparency"
              style={{ fontSize: "0.75rem", color: "var(--g12)" }}
            >
              Transparency
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            <span
              style={{
                fontSize: "0.65rem",
                color: "var(--g10)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Source
            </span>
            <a
              href="https://github.com/Vision2822/pesu-oauth2"
              target="_blank"
              style={{ fontSize: "0.75rem", color: "var(--g12)" }}
            >
              GitHub
            </a>
            <Link
              href="/api/health"
              style={{ fontSize: "0.75rem", color: "var(--g12)" }}
            >
              Health
            </Link>
          </div>
        </div>
      </div>

      <div className="container" style={{ marginTop: "1.5rem" }}>
        <p style={{ fontSize: "0.65rem", color: "var(--g8)" }}>
          © 2025 PESU OAuth2 · MIT License
        </p>
      </div>
    </footer>
  );
}