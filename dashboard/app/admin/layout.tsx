"use client";

import React, { useEffect, useState } from "react";

const ADMIN_PASSWORD = "AdminPassword123!";
const STORAGE_KEY = "temptagbot_admin_unlocked";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const v = window.localStorage.getItem(STORAGE_KEY);
      if (v === "1") setUnlocked(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === ADMIN_PASSWORD) {
      setUnlocked(true);
      setError(null);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, "1");
      }
    } else {
      setError("Incorrect password.");
    }
  };

  if (!unlocked) {
    return (
      <section style={{ maxWidth: "360px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>Admin access</h2>
        <p style={{ fontSize: "0.9rem", color: "#9ca3af", marginBottom: "0.75rem" }}>
          This area is restricted. Enter the admin password to continue.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem 0.7rem",
              borderRadius: "0.5rem",
              border: "1px solid #1f2933",
              backgroundColor: "#020617",
              color: "#e5e7eb",
              fontSize: "0.95rem",
              marginBottom: "0.5rem",
            }}
          />
          {error && (
            <p style={{ color: "#f87171", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "999px",
              border: "1px solid #3b82f6",
              backgroundColor: "#1d4ed8",
              color: "#e5e7eb",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            Enter
          </button>
        </form>
      </section>
    );
  }

  return <>{children}</>;
}

