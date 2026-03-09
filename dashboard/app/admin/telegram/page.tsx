"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

type TelegramSettings = {
  id: number;
  admin_group_id: number | null;
  description?: string | null;
};

const AdminTelegramPage: React.FC = () => {
  const [settings, setSettings] = useState<TelegramSettings | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error: supaError } = await supabase
          .from("telegram_settings")
          .select("*")
          .limit(1)
          .maybeSingle();

        if (supaError) throw supaError;
        setSettings(data);
        const raw =
          (data?.description as string | null) ??
          (data?.admin_group_id != null ? data.admin_group_id.toString() : "");
        setInput(raw ?? "");
      } catch (err: any) {
        setError(err.message ?? "Failed to load telegram settings");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const trimmed = input.trim();
      if (!trimmed) {
        throw new Error("At least one admin group ID is required.");
      }
      const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
      if (!parts.length) {
        throw new Error("At least one admin group ID is required.");
      }
      for (const p of parts) {
        if (!/^[-]?\d+$/.test(p)) {
          throw new Error("All admin group IDs must be numeric Telegram chat IDs (e.g. -100...).");
        }
      }
      const primaryId = Number(parts[0]);
      const upsertPayload = { id: 1, admin_group_id: primaryId, description: parts.join(",") };

      const { data, error: supaError } = await supabase
        .from("telegram_settings")
        .upsert(upsertPayload, { onConflict: "id" })
        .select()
        .maybeSingle();

      if (supaError) throw supaError;

      setSettings(data ?? null);
      setSuccess("Saved successfully.");
    } catch (err: any) {
      setError(err.message ?? "Failed to save telegram settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>
        Telegram settings
      </h2>

      {loading && <p>Loading...</p>}
      {error && (
        <p style={{ color: "#f87171", marginBottom: "0.75rem" }}>
          {error}
        </p>
      )}
      {success && (
        <p style={{ color: "#4ade80", marginBottom: "0.75rem" }}>
          {success}
        </p>
      )}

      <div
        style={{
          maxWidth: "420px",
          backgroundColor: "#020617",
          borderRadius: "0.75rem",
          border: "1px solid #1f2933",
          padding: "1rem",
        }}
      >
        <label
          htmlFor="adminGroupId"
          style={{ display: "block", fontSize: "0.9rem", marginBottom: "0.35rem" }}
        >
          Admin group chat ID(s)
        </label>
        <input
          id="adminGroupId"
          type="text"
          placeholder="-100..., -100..., ..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{
            width: "100%",
            padding: "0.4rem 0.6rem",
            borderRadius: "0.5rem",
            border: "1px solid #1f2933",
            backgroundColor: "#020617",
            color: "#e5e7eb",
            fontSize: "0.95rem",
          }}
        />
        <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.3rem" }}>
          You can set one or more numeric Telegram chat IDs (comma-separated). All listed IDs will receive new order notifications.
        </p>

        <button
          disabled={saving}
          onClick={() => void save()}
          style={{
            marginTop: "0.8rem",
            padding: "0.45rem 0.9rem",
            borderRadius: "999px",
            border: "1px solid #3b82f6",
            backgroundColor: saving ? "#1e293b" : "#1d4ed8",
            color: "#e5e7eb",
            fontSize: "0.9rem",
            cursor: saving ? "default" : "pointer",
          }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </section>
  );
};

export default AdminTelegramPage;

