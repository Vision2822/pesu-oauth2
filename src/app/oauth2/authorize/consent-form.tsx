"use client";

import { useActionState } from "react";
import { consentAction } from "./action";

interface Props {
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  requestedScopes: string[];
  scopeDescriptions: Record<string, string>;
  scopeFields: Record<string, Record<string, string>>;
  profile: Record<string, unknown>;
}

export function ConsentForm({
  clientId,
  redirectUri,
  scope,
  state,
  codeChallenge,
  codeChallengeMethod,
  requestedScopes,
  scopeDescriptions,
  scopeFields,
  profile,
}: Props) {
  const [formState, formAction, pending] = useActionState(consentAction, {
    error: null as string | null,
  });

  return (
    <form action={formAction}>
      <input type="hidden" name="client_id" value={clientId} />
      <input type="hidden" name="redirect_uri" value={redirectUri} />
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="state" value={state} />
      <input type="hidden" name="code_challenge" value={codeChallenge} />
      <input type="hidden" name="code_challenge_method" value={codeChallengeMethod} />

      {formState.error && (
        <div className="alert alert-danger">{formState.error}</div>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <p style={{ fontSize: "0.75rem", color: "var(--g12)", marginBottom: "0.75rem" }}>
          Select what to share:
        </p>

        {requestedScopes.map((s) => (
          <div
            key={s}
            style={{
              border: "1px solid var(--border)",
              marginBottom: "0.5rem",
              background: "var(--g2)",
            }}
          >
            <div
              style={{
                padding: "0.5rem 0.75rem",
                borderBottom: "1px solid var(--border)",
                background: "var(--g3)",
                fontSize: "0.8rem",
              }}
            >
              <strong>{s}</strong>
              <br />
              <span className="text-muted" style={{ fontSize: "0.7rem" }}>
                {scopeDescriptions[s]}
              </span>
            </div>
            <div style={{ padding: "0.5rem 0.75rem" }}>
              {scopeFields[s] &&
                Object.entries(scopeFields[s]).map(([field, desc]) => {
                  const val = profile[field];
                  return (
                    <div className="checkbox-group" key={`${s}:${field}`}>
                      <input
                        type="checkbox"
                        name="granted_fields"
                        value={`${s}:${field}`}
                        id={`f-${s}-${field}`}
                        defaultChecked
                      />
                      <label
                        htmlFor={`f-${s}-${field}`}
                        style={{ fontSize: "0.8rem" }}
                      >
                        <strong>{field}</strong>
                        <span className="text-muted"> — {desc}</span>
                        {val ? (
                          <span style={{ fontSize: "0.7rem", color: "var(--g13)", display: "block" }}>
                            {field === "photo_base64" ? "Photo available" : `Current: ${String(val)}`}
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.7rem", color: "#a80", display: "block" }}>
                            Not available
                          </span>
                        )}
                      </label>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          type="submit"
          name="action"
          value="allow"
          className="btn btn-primary"
          disabled={pending}
          style={{ flex: 1, justifyContent: "center" }}
        >
          {pending ? "..." : "Allow"}
        </button>
        <button
          type="submit"
          name="action"
          value="deny"
          className="btn btn-secondary"
          disabled={pending}
          style={{ flex: 1, justifyContent: "center" }}
        >
          Deny
        </button>
      </div>
    </form>
  );
}