import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "var(--g1)",
        borderBottom: "1px solid var(--border)",
        padding: "0.75rem 0",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center" }}>
          <Image
            src="/logo.png"
            alt="PESU Auth"
            width={200}
            height={200}
            style={{
              height: "2rem",
              width: "2rem",
              objectFit: "contain",
            }}
            priority
          />
        </Link>

        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <Link href="/docs" style={{ fontSize: "0.8rem", color: "var(--g12)" }}>
            Docs
          </Link>
          <Link href="/tester" style={{ fontSize: "0.8rem", color: "var(--g12)" }}>
            Tester
          </Link>
          <Link href="/about" style={{ fontSize: "0.8rem", color: "var(--g12)" }}>
            About
          </Link>

          {user ? (
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <Link href="/admin" style={{ fontSize: "0.8rem", color: "var(--g12)" }}>
                Admin
              </Link>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--g10)",
                  padding: "0.2rem 0.5rem",
                  border: "1px solid var(--border)",
                }}
              >
                {user.pesuprn.toUpperCase()}
              </span>
              <form action="/logout" method="POST" style={{ display: "inline" }}>
                <button type="submit" className="btn btn-sm btn-secondary">
                  Logout
                </button>
              </form>
            </div>
          ) : (
            <Link href="/login" className="btn btn-sm btn-primary">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}