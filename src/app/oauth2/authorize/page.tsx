import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getClient } from "@/lib/oauth2/grants";
import { AVAILABLE_SCOPES, SCOPE_FIELDS } from "@/lib/constants";
import { ConsentForm } from "./consent-form";

interface SearchParams {
  response_type?: string;
  client_id?: string;
  redirect_uri?: string;
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (!user) {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    redirect(`/login?next=${encodeURIComponent(`/oauth2/authorize?${qs}`)}`);
  }

  if (params.response_type !== "code") {
    return (
      <div className="container" style={{ paddingTop: "6rem", maxWidth: "500px" }}>
        <div className="alert alert-danger">
          Invalid response_type. Must be &quot;code&quot;.
        </div>
      </div>
    );
  }

  if (!params.client_id || !params.redirect_uri || !params.scope) {
    return (
      <div className="container" style={{ paddingTop: "6rem", maxWidth: "500px" }}>
        <div className="alert alert-danger">
          Missing required parameters: client_id, redirect_uri, scope.
        </div>
      </div>
    );
  }

  if (!params.code_challenge || params.code_challenge_method !== "S256") {
    return (
      <div className="container" style={{ paddingTop: "6rem", maxWidth: "500px" }}>
        <div className="alert alert-danger">
          PKCE required. Provide code_challenge with method S256.
        </div>
      </div>
    );
  }

  const client = await getClient(params.client_id);

  if (!client) {
    return (
      <div className="container" style={{ paddingTop: "6rem", maxWidth: "500px" }}>
        <div className="alert alert-danger">Unknown client_id.</div>
      </div>
    );
  }

  const uris = client.redirectUris as string[];
  if (!uris.includes(params.redirect_uri)) {
    return (
      <div className="container" style={{ paddingTop: "6rem", maxWidth: "500px" }}>
        <div className="alert alert-danger">Redirect URI not registered.</div>
      </div>
    );
  }

  const requestedScopes = params.scope.split(" ").filter((s) => s in AVAILABLE_SCOPES);

  if (requestedScopes.length === 0) {
    return (
      <div className="container" style={{ paddingTop: "6rem", maxWidth: "500px" }}>
        <div className="alert alert-danger">No valid scopes requested.</div>
      </div>
    );
  }

  const profile = (user.profileData ?? {}) as Record<string, unknown>;

  return (
    <div className="container" style={{ paddingTop: "6rem", maxWidth: "500px" }}>
      <h1 style={{ fontSize: "1.2rem", marginBottom: "0.25rem" }}>
        Authorize
      </h1>
      <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: "1.5rem" }}>
        <strong>{client.clientName}</strong> wants access to your account.
      </p>

      <div
        style={{
          padding: "0.6rem 0.8rem",
          background: "var(--g2)",
          border: "1px solid var(--border)",
          marginBottom: "1rem",
          fontSize: "0.8rem",
        }}
      >
        <span className="text-muted">Signed in as </span>
        <strong>{user.pesuprn}</strong>
        <span style={{ marginLeft: "0.5rem" }}>
          {client.clientSecret === null ? (
            <span className="badge badge-info">Public</span>
          ) : (
            <span className="badge badge-success">Confidential</span>
          )}
        </span>
      </div>

      <ConsentForm
        clientId={params.client_id}
        redirectUri={params.redirect_uri}
        scope={params.scope}
        state={params.state ?? ""}
        codeChallenge={params.code_challenge}
        codeChallengeMethod={params.code_challenge_method}
        requestedScopes={requestedScopes}
        scopeDescriptions={AVAILABLE_SCOPES}
        scopeFields={SCOPE_FIELDS}
        profile={profile}
      />
    </div>
  );
}