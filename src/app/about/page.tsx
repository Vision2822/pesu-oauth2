export default function AboutPage() {
  return (
    <div className="container" style={{ paddingTop: "6rem", maxWidth: "600px" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>About</h1>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem", color: "var(--g16)" }}>
          What is this?
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--g13)", lineHeight: 1.6 }}>
          PESU Auth lets you sign into student-made apps using your PESU Academy
          account. Instead of creating a new username and password for every app,
          you just click &quot;Sign in with PESU&quot; and you&apos;re in.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem", color: "var(--g16)" }}>
          How does it work?
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--g13)", lineHeight: 1.6 }}>
          When you sign in, your credentials go directly to PESU Academy for
          verification. If correct, we get your profile info (name, PRN, branch,
          etc). We then ask what info you want to share with the app. You choose.
          The app only sees what you allow.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem", color: "var(--g16)" }}>
          Is my password stored?
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--g13)", lineHeight: 1.6 }}>
          No. Your password is sent to PESU Academy to verify you, then discarded.
          We never save it.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem", color: "var(--g16)" }}>
          Who made this?
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--g13)", lineHeight: 1.6 }}>
          A student project. Not affiliated with PES University. The code is
          open source — you can read every line on GitHub.
        </p>
      </section>

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          background: "var(--g2)",
          border: "1px solid var(--border)",
          fontSize: "0.8rem",
          color: "var(--g12)",
        }}
      >
        Questions? Open an issue on{" "}
        <a
          href="https://github.com/Vision2822/pesu-oauth2/issues"
          target="_blank"
          style={{ color: "var(--g16)", textDecoration: "underline" }}
        >
          GitHub
        </a>
        .
      </div>
    </div>
  );
}