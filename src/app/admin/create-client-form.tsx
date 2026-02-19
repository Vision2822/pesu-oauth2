"use client";

import { useActionState } from "react";
import { createClientAction } from "./action";

interface Props {
  availableScopes: Record<string, string>;
}

interface State {
  error: string | null;
  success: string | null;
  clientId: string | null;
  clientSecret: string | null;
}

const initial: State = {
  error: null,
  success: null,
  clientId: null,
  clientSecret: null,
};

export function CreateClientForm({ availableScopes }: Props) {
  const [state, formAction, pending] = useActionState(createClientAction, initial);

  return (
    <div>
      {state.error && (
        <div className="alert alert-danger">{state.error}</div>
      )}

      {state.success && (
        <div className="alert alert-success">
          <strong>{state.success}</strong>
          <br />
          <span style={{ fontSize: "0.8rem" }}>
            Client ID: <code>{state.clientId}</code>
          </span>
          {state.clientSecret && (
            <>
              <br />
              <span style={{ fontSize: "0.8rem" }}>
                Client Secret:{" "}
                <code style={{ wordBreak: "break-all" }}>{state.clientSecret}</code>
              </span>
              <br />
              <span style={{ fontSize: "0.75rem", color: "var(--g12)" }}>
                Copy the secret now — it will not be shown again.
              </span>
            </>
          )}
        </div>
      )}

      <form action={formAction}>
        <div className="form-group">
          <label className="form-label" htmlFor="client_name">
            Client Name
          </label>
          <input
            className="form-input"
            type="text"
            id="client_name"
            name="client_name"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="redirect_uris">
            Redirect URIs
          </label>
          <input
            className="form-input"
            type="text"
            id="redirect_uris"
            name="redirect_uris"
            placeholder="https://myapp.com/callback http://localhost:3000/callback"
            required
          />
          <p className="form-hint">Space-separated. Must use http or https.</p>
        </div>

        <div className="form-group">
          <label className="form-label">Client Type</label>
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.25rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer" }}>
              <input type="radio" name="client_type" value="public" defaultChecked />
              Public
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", cursor: "pointer" }}>
              <input type="radio" name="client_type" value="confidential" />
              Confidential
            </label>
          </div>
          <p className="form-hint">
            Public = SPA / mobile. Confidential = backend server.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Allowed Scopes</label>
          <div
            style={{
              border: "1px solid var(--border)",
              background: "var(--g2)",
              padding: "0.75rem",
            }}
          >
            {Object.entries(availableScopes).map(([scope, desc]) => (
              <div className="checkbox-group" key={scope}>
                <input
                  type="checkbox"
                  name="scope"
                  value={scope}
                  id={`scope-${scope}`}
                  defaultChecked
                />
                <label htmlFor={`scope-${scope}`} style={{ fontSize: "0.8rem" }}>
                  <code>{scope}</code>
                  <span className="text-muted"> — {desc}</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={pending}
        >
          {pending ? "Creating..." : "Create Client"}
        </button>
      </form>
    </div>
  );
}