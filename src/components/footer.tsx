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
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <p style={{ fontSize: "0.7rem", color: "var(--g10)" }}>
          PESU Auth · Not an official PES service
        </p>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          <Link href="/docs" style={{ fontSize: "0.75rem", color: "var(--g12)" }}>
            Docs
          </Link>
          <Link href="/about" style={{ fontSize: "0.75rem", color: "var(--g12)" }}>
            About
          </Link>
          <Link href="/transparency" style={{ fontSize: "0.75rem", color: "var(--g12)" }}>
            Transparency
          </Link>
          <a
            href="https://github.com/Vision2822/pesu-oauth2"
            target="_blank"
            style={{ fontSize: "0.75rem", color: "var(--g12)" }}
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}