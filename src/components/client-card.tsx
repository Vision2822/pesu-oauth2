import { deleteClientAction } from "@/app/admin/action";
import { oauth2Clients } from "@/lib/db/schema";

type Client = typeof oauth2Clients.$inferSelect;

export function ClientCard({ client }: { client: Client }) {
  const isPublic = client.clientSecret === null;
  const uris = client.redirectUris as string[];
  const scopes = client.scope.split(" ");

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        background: "var(--g2)",
        padding: "1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.5rem",
            }}
          >
            <strong style={{ fontSize: "0.9rem" }}>{client.clientName}</strong>
            {isPublic ? (
              <span className="badge badge-info">Public</span>
            ) : (
              <span className="badge badge-success">Confidential</span>
            )}
          </div>

          <div style={{ marginBottom: "0.4rem" }}>
            <span
              style={{
                fontSize: "0.65rem",
                color: "var(--g10)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Client ID
            </span>
            <br />
            <code
              style={{
                fontSize: "0.75rem",
                wordBreak: "break-all",
              }}
            >
              {client.clientId}
            </code>
          </div>

          <div style={{ marginBottom: "0.4rem" }}>
            <span
              style={{
                fontSize: "0.65rem",
                color: "var(--g10)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Redirect URIs
            </span>
            <br />
            <div
              style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.15rem" }}
            >
              {uris.map((uri) => (
                <code
                  key={uri}
                  style={{
                    fontSize: "0.7rem",
                    background: "var(--g3)",
                    padding: "0.1rem 0.4rem",
                  }}
                >
                  {uri}
                </code>
              ))}
            </div>
          </div>

          <div>
            <span
              style={{
                fontSize: "0.65rem",
                color: "var(--g10)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Scopes
            </span>
            <br />
            <div
              style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.15rem" }}
            >
              {scopes.map((s) => (
                <span
                  key={s}
                  style={{
                    fontSize: "0.7rem",
                    background: "var(--g4)",
                    padding: "0.1rem 0.4rem",
                    border: "1px solid var(--border)",
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        <form action={deleteClientAction}>
          <input type="hidden" name="id" value={client.id} />
          <button
            type="submit"
            className="btn btn-sm btn-danger"
            onClick={(e) => {
              if (!confirm(`Delete "${client.clientName}"?`)) e.preventDefault();
            }}
          >
            Delete
          </button>
        </form>
      </div>
    </div>
  );
}