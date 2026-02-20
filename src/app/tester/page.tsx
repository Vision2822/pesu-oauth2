import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AVAILABLE_SCOPES } from "@/lib/constants";
import { TesterClient } from "./tester-client";

export default async function TesterPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/tester");

  const defaultClientId = process.env.TESTER_CLIENT_ID ?? "";

  return (
    <div className="container" style={{ paddingTop: "6rem", maxWidth: "720px" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>OAuth Tester</h1>
      <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "2rem" }}>
        Test the full OAuth flow interactively.
      </p>
      <TesterClient
        defaultClientId={defaultClientId}
        availableScopes={AVAILABLE_SCOPES}
      />
    </div>
  );
}