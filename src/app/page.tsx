import Link from "next/link";

export default function HomePage() {
  return (
    <div className="container" style={{ paddingTop: "8rem" }}>
      <section style={{ maxWidth: "520px" }}>
        <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: "0.5rem" }}>
          PESU OAuth2
        </p>
        <h1 style={{ fontSize: "2rem", lineHeight: 1.2, marginBottom: "1rem" }}>
          One login for the PESU ecosystem.
        </h1>
        <p className="text-muted" style={{ fontSize: "0.9rem", marginBottom: "2rem" }}>
          Authenticate students. Share profile data with consent. Built for
          developers building on top of PESU.
        </p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link href="/docs" className="btn btn-primary">
            Docs
          </Link>
          <Link href="/login" className="btn btn-secondary">
            Sign in
          </Link>
        </div>
      </section>

      <hr className="divider" style={{ margin: "4rem 0" }} />

      <section className="grid-3" style={{ marginBottom: "6rem" }}>
        <div>
          <h4 style={{ fontSize: "0.85rem", marginBottom: "0.4rem" }}>
            No passwords stored
          </h4>
          <p className="text-muted" style={{ fontSize: "0.8rem" }}>
            Credentials are forwarded to PESU Academy and discarded.
          </p>
        </div>
        <div>
          <h4 style={{ fontSize: "0.85rem", marginBottom: "0.4rem" }}>
            Granular consent
          </h4>
          <p className="text-muted" style={{ fontSize: "0.8rem" }}>
            Users pick exactly which fields to share per app.
          </p>
        </div>
        <div>
          <h4 style={{ fontSize: "0.85rem", marginBottom: "0.4rem" }}>
            Open source
          </h4>
          <p className="text-muted" style={{ fontSize: "0.8rem" }}>
            Every line is public. Audit it yourself.
          </p>
        </div>
      </section>
    </div>
  );
}