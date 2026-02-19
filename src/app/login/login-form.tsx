"use client";

import { useActionState } from "react";
import { loginAction } from "./action";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, {
    error: null as string | null,
  });

  return (
    <form action={formAction}>
      {next && <input type="hidden" name="next" value={next} />}

      {state.error && (
        <div className="alert alert-danger">{state.error}</div>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor="username">
          SRN / PRN
        </label>
        <input
          className="form-input"
          type="text"
          id="username"
          name="username"
          placeholder="PES1UG21CS001"
          required
          autoFocus
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="password">
          Password
        </label>
        <input
          className="form-input"
          type="password"
          id="password"
          name="password"
          required
        />
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={pending}
        style={{ width: "100%", justifyContent: "center", marginTop: "0.5rem" }}
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>

      <p
        className="text-muted"
        style={{ fontSize: "0.7rem", textAlign: "center", marginTop: "1rem" }}
      >
        Credentials are verified with PESU Academy and not stored.
      </p>
    </form>
  );
}