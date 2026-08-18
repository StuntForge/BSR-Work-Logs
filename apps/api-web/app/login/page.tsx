"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client-api";
import { Logo } from "@/app/dashboard/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // /api/auth/portal-login only ever succeeds for a committee/admin account — no client-side
      // gate needed here, unlike the old email-based flow.
      await apiFetch("/api/auth/portal-login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      router.push("/dashboard/users");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="stack" style={{ alignItems: "center" }}>
        <Logo width={240} />
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, margin: "-8px 0 4px", textAlign: "center" }}>
          Member Progress &amp; Upgrade System
        </p>
        <form className="card auth-card stack" onSubmit={handleSubmit}>
          <div className="field">
            <label className="label">Username</label>
            <input className="input" type="text" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <div className="error-text">{error}</div>}
          <button className="btn btn-primary btn-block" disabled={loading} type="submit">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
