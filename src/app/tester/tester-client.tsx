"use client";

import { useState, useEffect } from "react";

interface Props {
  defaultClientId: string;
  availableScopes: Record<string, string>;
}

export function TesterClient({ defaultClientId, availableScopes }: Props) {
  const [clientId, setClientId] = useState(defaultClientId);
  const [scopes, setScopes] = useState<string[]>(Object.keys(availableScopes));
  const [verifier, setVerifier] = useState("");
  const [challenge, setChallenge] = useState("");
  const [authUrl, setAuthUrl] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [userData, setUserData] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("code");
    if (c) {
      setCode(c);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function generatePKCE() {
    const v = crypto.randomUUID() + crypto.randomUUID();
    setVerifier(v);
    const hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(v)
    );
    const c = btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    setChallenge(c);
    return { v, c };
  }

  async function startAuth() {
    if (!clientId) {
      setError("Client ID required");
      return;
    }
    setError("");
    const { v, c } = await generatePKCE();
    sessionStorage.setItem("pkce_verifier", v);

    const redirectUri = window.location.origin + window.location.pathname;
    const state = crypto.randomUUID();
    sessionStorage.setItem("oauth_state", state);

    const url = new URL("/oauth2/authorize", window.location.origin);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", scopes.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", c);
    url.searchParams.set("code_challenge_method", "S256");

    setAuthUrl(url.toString());
    window.location.href = url.toString();
  }

  async function exchangeCode() {
    if (!code) {
      setError("No authorization code");
      return;
    }
    setError("");

    const v = sessionStorage.getItem("pkce_verifier") || verifier;
    if (!v) {
      setError("Missing code verifier");
      return;
    }

    const redirectUri = window.location.origin + window.location.pathname;

    const res = await fetch("/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: v,
      }),
    });

    const data = await res.json();
    if (data.error) {
      setError(`${data.error}: ${data.error_description}`);
      return;
    }

    setToken(data.access_token);
    sessionStorage.setItem("access_token", data.access_token);
  }

  async function fetchUser() {
    const t = token || sessionStorage.getItem("access_token");
    if (!t) {
      setError("No access token");
      return;
    }
    setError("");

    const res = await fetch("/api/v1/user", {
      headers: { Authorization: `Bearer ${t}` },
    });

    const data = await res.json();
    setUserData(JSON.stringify(data, null, 2));
  }

  function reset() {
    setVerifier("");
    setChallenge("");
    setAuthUrl("");
    setCode("");
    setToken("");
    setUserData("");
    setError("");
    sessionStorage.removeItem("pkce_verifier");
    sessionStorage.removeItem("oauth_state");
    sessionStorage.removeItem("access_token");
  }

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "0.9rem", marginBottom: "0.75rem", color: "var(--g14)" }}>
          1. Configure
        </h2>
        <div className="form-group">
          <label className="form-label">Client ID</label>
          <input
            className="form-input"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Your client ID"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Scopes</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {Object.keys(availableScopes).map((s) => (
              <label key={s} style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <input
                  type="checkbox"
                  checked={scopes.includes(s)}
                  onChange={(e) => {
                    if (e.target.checked) setScopes([...scopes, s]);
                    else setScopes(scopes.filter((x) => x !== s));
                  }}
                />
                {s}
              </label>
            ))}
          </div>
        </div>
        <button className="btn btn-primary" onClick={startAuth}>
          Start Authorization
        </button>
      </section>

      {code && (
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "0.9rem", marginBottom: "0.75rem", color: "var(--g14)" }}>
            2. Exchange Code
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--g12)", marginBottom: "0.5rem" }}>
            Code received: <code>{code.slice(0, 20)}...</code>
          </p>
          <button className="btn btn-primary" onClick={exchangeCode}>
            Exchange for Token
          </button>
        </section>
      )}

      {token && (
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "0.9rem", marginBottom: "0.75rem", color: "var(--g14)" }}>
            3. Fetch User
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--g12)", marginBottom: "0.5rem" }}>
            Token: <code>{token.slice(0, 20)}...</code>
          </p>
          <button className="btn btn-primary" onClick={fetchUser}>
            Get User Info
          </button>
        </section>
      )}

      {userData && (
        <section style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "0.9rem", marginBottom: "0.75rem", color: "var(--g14)" }}>
            User Data
          </h2>
          <pre>{userData}</pre>
        </section>
      )}

      <button className="btn btn-secondary" onClick={reset}>
        Reset
      </button>
    </div>
  );
}