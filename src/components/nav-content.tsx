"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

export function NavContent({ user }: { user: any }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link href="/" className="navbar-logo" onClick={() => setOpen(false)}>
          <Image
            src="/logo.png"
            alt="PESU Auth"
            width={200}
            height={200}
            style={{ height: "2rem", width: "2rem", objectFit: "contain" }}
            priority
          />
        </Link>

        <button
          className={`navbar-burger ${open ? "navbar-burger-open" : ""}`}
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <span />
          <span />
          <span />
        </button>

        {open && <div className="navbar-overlay" onClick={() => setOpen(false)} />}

        <div className={`navbar-menu ${open ? "navbar-menu-open" : ""}`}>
          <div className="navbar-links">
            <Link href="/docs" className="navbar-link" onClick={() => setOpen(false)}>Docs</Link>
            <Link href="/tester" className="navbar-link" onClick={() => setOpen(false)}>Tester</Link>
            <Link href="/about" className="navbar-link" onClick={() => setOpen(false)}>About</Link>
          </div>

          <div className="navbar-sep" />

          {user ? (
            <div className="navbar-user">
              <Link href="/admin" className="navbar-link" onClick={() => setOpen(false)}>Admin</Link>
              <span className="navbar-badge">{user.pesuprn.toUpperCase()}</span>
              <form action="/logout" method="POST" style={{ display: "inline" }}>
                <button type="submit" className="btn btn-sm btn-secondary">Logout</button>
              </form>
            </div>
          ) : (
            <Link href="/login" className="btn btn-sm btn-primary" onClick={() => setOpen(false)}>Sign in</Link>
          )}
        </div>
      </div>
    </nav>
  );
}