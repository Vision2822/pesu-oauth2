import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { oauth2Clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { AVAILABLE_SCOPES } from "@/lib/constants";
import { ClientCard } from "@/components/client-card";
import { CreateClientForm } from "./create-client-form";

export default async function AdminPage() {
  let user;
  try {
    user = await requireAdmin();
  } catch {
    redirect("/login?next=/admin");
  }

  const clients = await db
    .select()
    .from(oauth2Clients)
    .where(eq(oauth2Clients.userId, user.id));

  return (
    <div className="container" style={{ paddingTop: "6rem", maxWidth: "720px" }}>
      <h1 style={{ fontSize: "1.3rem", marginBottom: "0.25rem" }}>
        Client Management
      </h1>
      <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: "2rem" }}>
        Registered OAuth2 clients for your account.
      </p>

      <section style={{ marginBottom: "3rem" }}>
        <h2
          style={{
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--g12)",
            marginBottom: "1rem",
            paddingBottom: "0.5rem",
            borderBottom: "1px solid var(--border)",
          }}
        >
          Create New Client
        </h2>
        <CreateClientForm availableScopes={AVAILABLE_SCOPES} />
      </section>

      <section>
        <h2
          style={{
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--g12)",
            marginBottom: "1rem",
            paddingBottom: "0.5rem",
            borderBottom: "1px solid var(--border)",
          }}
        >
          Existing Clients ({clients.length})
        </h2>

        {clients.length === 0 ? (
          <p className="text-muted" style={{ fontSize: "0.8rem" }}>
            No clients yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {clients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}