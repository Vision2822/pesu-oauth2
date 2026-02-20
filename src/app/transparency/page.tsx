export default function TransparencyPage() {
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA;
  const repoOwner = process.env.VERCEL_GIT_REPO_OWNER;
  const repoSlug = process.env.VERCEL_GIT_REPO_SLUG;

  const repoUrl =
    repoOwner && repoSlug
      ? `https://github.com/${repoOwner}/${repoSlug}`
      : "https://github.com/Vision2822/pesu-oauth2";

  const commitUrl = commitSha ? `${repoUrl}/commit/${commitSha}` : null;

  return (
    <div className="container" style={{ paddingTop: "6rem", maxWidth: "600px" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Transparency</h1>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem", color: "var(--g16)" }}>
          Open Source
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--g13)", lineHeight: 1.6 }}>
          Every line of code is public. You can audit exactly what runs on this
          server.
        </p>
        <p style={{ marginTop: "0.75rem" }}>
          <a
            href={repoUrl}
            target="_blank"
            style={{ fontSize: "0.85rem", color: "var(--g16)", textDecoration: "underline" }}
          >
            View source on GitHub →
          </a>
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem", color: "var(--g16)" }}>
          No Password Storage
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--g13)", lineHeight: 1.6 }}>
          Your PESU password is forwarded to PESU Academy for verification, then
          immediately discarded. We store only your profile data (name, PRN, etc)
          after you consent.
        </p>
      </section>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem", color: "var(--g16)" }}>
          Granular Consent
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--g13)", lineHeight: 1.6 }}>
          Apps request specific data scopes. You see exactly what&apos;s requested
          and can uncheck fields you don&apos;t want to share. You&apos;re always
          in control.
        </p>
      </section>

      {commitUrl && (
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1rem", marginBottom: "0.5rem", color: "var(--g16)" }}>
            Current Deployment
          </h2>
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--g12)",
              background: "var(--g2)",
              border: "1px solid var(--border)",
              padding: "0.75rem",
              wordBreak: "break-all",
            }}
          >
            <a href={commitUrl} target="_blank" style={{ color: "var(--g14)" }}>
              {commitSha}
            </a>
          </p>
        </section>
      )}
    </div>
  );
}