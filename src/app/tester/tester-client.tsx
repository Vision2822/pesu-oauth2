"use client";

import { useState, useEffect } from "react";
import { JsonViewer } from "@/components/json-viewer";

interface Props {
  defaultClientId: string;
  availableScopes: Record<string, string>;
}

type Step = "configure" | "exchange" | "fetch" | "done";

export function TesterClient({ defaultClientId, availableScopes }: Props) {
  const [clientId, setClientId] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("tester_client_id") || defaultClientId;
    }
    return defaultClientId;
  });
  const [scopes, setScopes] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("tester_scopes");
      return saved ? JSON.parse(saved) : Object.keys(availableScopes);
    }
    return Object.keys(availableScopes);
  });

  const [verifier, setVerifier] = useState("");
  const [challenge, setChallenge] = useState("");
  const [code, setCode] = useState("");
  const [token, setToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [userData, setUserData] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");
  const [log, setLog] = useState<string[]>([]);

  function addLog(msg: string) {
    const ts = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setLog((prev) => [...prev, `[${ts}] ${msg}`]);
  }

  function getCurrentStep(): Step {
    if (userData) return "done";
    if (token) return "fetch";
    if (code) return "exchange";
    return "configure";
  }

  useEffect(() => {
    if (clientId) sessionStorage.setItem("tester_client_id", clientId);
  }, [clientId]);

  useEffect(() => {
    sessionStorage.setItem("tester_scopes", JSON.stringify(scopes));
  }, [scopes]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("code");
    const returnedState = params.get("state");

    if (c) {
      const savedState = sessionStorage.getItem("oauth_state");
      if (returnedState && savedState && returnedState !== savedState) {
        setError("state mismatch — possible CSRF attack");
        addLog("ERR  state parameter mismatch");
      } else {
        setCode(c);
        addLog(`OK   authorization code received: ${c.slice(0, 16)}...`);
        if (returnedState) {
          addLog("OK   state parameter validated");
        }
      }
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
      setError("client_id is required");
      return;
    }
    if (scopes.length === 0) {
      setError("select at least one scope");
      return;
    }
    setError("");

    addLog("GEN  generating PKCE challenge...");
    const { v, c } = await generatePKCE();
    sessionStorage.setItem("pkce_verifier", v);
    addLog(`OK   verifier: ${v.slice(0, 16)}...`);
    addLog(`OK   challenge: ${c.slice(0, 16)}...`);

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

    addLog(`REQ  redirecting to /oauth2/authorize`);
    addLog(`     scopes: ${scopes.join(", ")}`);
    window.location.href = url.toString();
  }

  async function exchangeCode() {
    if (!code) {
      setError("no authorization code");
      return;
    }

    const v = sessionStorage.getItem("pkce_verifier") || verifier;
    if (!v) {
      setError("missing code_verifier — session may have expired");
      return;
    }

    const currentClientId =
      clientId || sessionStorage.getItem("tester_client_id");
    if (!currentClientId) {
      setError("client_id missing — re-enter and retry");
      return;
    }

    setError("");
    setLoading("exchanging code for tokens...");
    addLog("REQ  POST /api/oauth2/token");
    addLog("     grant_type: authorization_code");

    const redirectUri = window.location.origin + window.location.pathname;

    try {
      const res = await fetch("/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: currentClientId,
          code_verifier: v,
        }),
      });

      const data = await res.json();
      addLog(`RES  ${res.status} ${res.statusText}`);

      if (data.error) {
        setError(`${data.error}: ${data.error_description}`);
        addLog(`ERR  ${data.error}: ${data.error_description}`);
        return;
      }

      setToken(data.access_token);
      if (data.refresh_token) setRefreshToken(data.refresh_token);
      sessionStorage.setItem("access_token", data.access_token);
      addLog(`OK   access_token: ${data.access_token.slice(0, 16)}...`);
      addLog(`OK   expires_in: ${data.expires_in}s`);
      addLog(`OK   scope: ${data.scope}`);
      if (data.refresh_token) {
        addLog(`OK   refresh_token: ${data.refresh_token.slice(0, 16)}...`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "network error";
      setError(msg);
      addLog(`ERR  ${msg}`);
    } finally {
      setLoading("");
    }
  }

  async function fetchUser() {
    const t = token || sessionStorage.getItem("access_token");
    if (!t) {
      setError("no access token");
      return;
    }
    setError("");
    setLoading("fetching user data...");
    addLog("REQ  GET /api/v1/user");
    addLog(`     authorization: Bearer ${t.slice(0, 16)}...`);

    try {
      const res = await fetch("/api/v1/user", {
        headers: { Authorization: `Bearer ${t}` },
      });

      const data = await res.json();
      addLog(`RES  ${res.status} ${res.statusText}`);

      if (data.error) {
        addLog(`ERR  ${data.error}: ${data.message ?? ""}`);
      } else {
        const fields = Object.keys(data);
        addLog(`OK   received ${fields.length} fields: ${fields.join(", ")}`);
      }

      setUserData(JSON.stringify(data, null, 2));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "network error";
      setError(msg);
      addLog(`ERR  ${msg}`);
    } finally {
      setLoading("");
    }
  }

  function reset() {
    setVerifier("");
    setChallenge("");
    setCode("");
    setToken("");
    setRefreshToken("");
    setUserData("");
    setError("");
    setLoading("");
    setLog([]);
    sessionStorage.removeItem("pkce_verifier");
    sessionStorage.removeItem("oauth_state");
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("tester_client_id");
    sessionStorage.removeItem("tester_scopes");
    setClientId(defaultClientId);
    setScopes(Object.keys(availableScopes));
  }

  const step = getCurrentStep();

  return (
    <div>
      {error && (
        <div className="tester-error">
          <span className="tester-error-label">err</span>
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="tester-loading">
          <span className="tester-loading-spinner" />
          <span>{loading}</span>
        </div>
      )}

      <div className="tester-steps">
        {(
          [
            { key: "configure", label: "configure", num: "1" },
            { key: "exchange", label: "exchange", num: "2" },
            { key: "fetch", label: "fetch", num: "3" },
            { key: "done", label: "done", num: "4" },
          ] as const
        ).map(({ key, label, num }, i) => (
          <div key={key} className="tester-step-row">
            {i > 0 && <span className="tester-step-line" />}
            <div
              className={`tester-step ${
                step === key
                  ? "tester-step-active"
                  : getCurrentStepIndex(step) > i
                    ? "tester-step-done"
                    : ""
              }`}
            >
              <span className="tester-step-num">{num}</span>
              <span className="tester-step-label">{label}</span>
            </div>
          </div>
        ))}
      </div>

      <section className="tester-section">
        <div className="tester-section-header">
          <span className="tester-section-num">01</span>
          <span className="tester-section-title">configure</span>
          {step !== "configure" && (
            <span className="tester-section-check">done</span>
          )}
        </div>
        <div className="tester-section-body">
          <div className="form-group">
            <label className="form-label">client_id</label>
            <input
              className="form-input mono"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="paste your client id"
              spellCheck={false}
            />
          </div>
          <div className="form-group">
            <label className="form-label">scope</label>
            <div className="tester-scopes">
              {Object.entries(availableScopes).map(([s, desc]) => (
                <label key={s} className="tester-scope-item">
                  <input
                    type="checkbox"
                    checked={scopes.includes(s)}
                    onChange={(e) => {
                      if (e.target.checked) setScopes([...scopes, s]);
                      else setScopes(scopes.filter((x) => x !== s));
                    }}
                  />
                  <span className="tester-scope-name">{s}</span>
                  <span className="tester-scope-desc">{desc}</span>
                </label>
              ))}
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={startAuth}
            disabled={!!loading || step !== "configure"}
          >
            start authorization
          </button>
        </div>
      </section>

      {(step === "exchange" || step === "fetch" || step === "done") && (
        <section className="tester-section">
          <div className="tester-section-header">
            <span className="tester-section-num">02</span>
            <span className="tester-section-title">exchange code</span>
            {(step === "fetch" || step === "done") && (
              <span className="tester-section-check">done</span>
            )}
          </div>
          <div className="tester-section-body">
            <div className="tester-kv">
              <span className="tester-kv-key">code</span>
              <code className="tester-kv-value">{code.slice(0, 32)}...</code>
            </div>
            {step === "exchange" && (
              <button
                className="btn btn-primary"
                onClick={exchangeCode}
                disabled={!!loading}
                style={{ marginTop: "0.75rem" }}
              >
                {loading ? loading : "exchange for tokens"}
              </button>
            )}
            {(step === "fetch" || step === "done") && (
              <div style={{ marginTop: "0.75rem" }}>
                <div className="tester-kv">
                  <span className="tester-kv-key">access_token</span>
                  <code className="tester-kv-value">
                    {token.slice(0, 32)}...
                  </code>
                </div>
                {refreshToken && (
                  <div className="tester-kv">
                    <span className="tester-kv-key">refresh_token</span>
                    <code className="tester-kv-value">
                      {refreshToken.slice(0, 32)}...
                    </code>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {(step === "fetch" || step === "done") && (
        <section className="tester-section">
          <div className="tester-section-header">
            <span className="tester-section-num">03</span>
            <span className="tester-section-title">fetch user data</span>
            {step === "done" && (
              <span className="tester-section-check">done</span>
            )}
          </div>
          <div className="tester-section-body">
            {step === "fetch" && (
              <button
                className="btn btn-primary"
                onClick={fetchUser}
                disabled={!!loading}
              >
                {loading ? loading : "GET /api/v1/user"}
              </button>
            )}
            {step === "done" && userData && (
              <JsonViewer data={userData} title="user profile" />
            )}
          </div>
        </section>
      )}

      {log.length > 0 && (
        <details className="tester-log" open={log.length <= 10}>
          <summary className="tester-log-toggle">
            <span className="tester-log-icon">&gt;_</span>
            <span>request log</span>
            <span className="tester-log-count">{log.length}</span>
          </summary>
          <div className="tester-log-body">
            {log.map((entry, i) => (
              <div
                key={i}
                className={`tester-log-entry ${
                  entry.includes("ERR")
                    ? "tester-log-err"
                    : entry.includes("OK")
                      ? "tester-log-ok"
                      : entry.startsWith("     ")
                        ? "tester-log-detail"
                        : ""
                }`}
              >
                {entry}
              </div>
            ))}
          </div>
        </details>
      )}

      <div style={{ marginTop: "1.5rem" }}>
        <button className="btn btn-secondary" onClick={reset}>
          reset
        </button>
      </div>
    </div>
  );
}

function getCurrentStepIndex(step: Step): number {
  return ["configure", "exchange", "fetch", "done"].indexOf(step);
}