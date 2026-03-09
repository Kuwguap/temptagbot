"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Product = {
  id: string;
  code: string;
  label: string;
  price_cents: number;
  active: boolean;
};

type TelegramSettings = {
  id: number;
  admin_group_id: number | null;
  description?: string | null;
};

export default function AdminOverviewPage() {
  const [productCount, setProductCount] = useState<number | null>(null);
  const [telegramSettings, setTelegramSettings] = useState<TelegramSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const { data: products, error: prodError } = await supabase
          .from("products")
          .select("id");

        if (prodError) throw prodError;
        setProductCount(Array.isArray(products) ? products.length : 0);

        const { data: telegram, error: telError } = await supabase
          .from("telegram_settings")
          .select("*")
          .limit(1)
          .maybeSingle();

        if (telError) throw telError;
        setTelegramSettings(telegram);
      } catch (err: any) {
        setError(err.message ?? "Failed to load overview data");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  return (
    <section>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>
        Admin overview
      </h2>
      {loading && <p>Loading...</p>}
      {error && (
        <p style={{ color: "#f87171", marginBottom: "1rem" }}>
          {error}
        </p>
      )}
      {!loading && !error && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#020617",
              borderRadius: "0.75rem",
              border: "1px solid #1f2933",
              padding: "1rem",
            }}
          >
            <h3 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>
              Active products
            </h3>
            <p style={{ fontSize: "1.5rem", fontWeight: 600 }}>
              {productCount ?? "-"}
            </p>
          </div>
          <div
            style={{
              backgroundColor: "#020617",
              borderRadius: "0.75rem",
              border: "1px solid #1f2933",
              padding: "1rem",
            }}
          >
            <h3 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>
              Telegram admin group ID(s)
            </h3>
            <p style={{ fontSize: "0.95rem", whiteSpace: "pre-wrap" }}>
              {telegramSettings
                ? (telegramSettings.description as string | null) ??
                  (telegramSettings.admin_group_id != null
                    ? telegramSettings.admin_group_id.toString()
                    : "Not set")
                : "Not set"}
            </p>
          </div>
        </div>
      )}
      <p style={{ marginTop: "1.5rem", fontSize: "0.9rem", color: "#9ca3af" }}>
        Use the navigation links above to manage products and Telegram settings.
      </p>
    </section>
  );
}

