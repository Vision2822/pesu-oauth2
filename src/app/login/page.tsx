import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const params = await searchParams;

  return (
    <div className="container" style={{ paddingTop: "6rem", maxWidth: "380px" }}>
      <h1 style={{ fontSize: "1.3rem", marginBottom: "0.25rem" }}>Sign in</h1>
      <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: "1.5rem" }}>
        Use your PESU Academy credentials.
      </p>
      <LoginForm next={params.next} />
    </div>
  );
}