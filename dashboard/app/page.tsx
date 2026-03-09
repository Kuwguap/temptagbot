"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Product = {
  id: string;
  code: string;
  label: string;
  price_cents: number;
  active: boolean;
  sort_order: number;
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "#0f172a",
  borderRadius: "0.75rem",
  border: "1px solid #1e293b",
  padding: "1.25rem",
};

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data, error: e } = await supabase
          .from("products")
          .select("*")
          .eq("active", true)
          .order("sort_order", { ascending: true });
        if (e) throw e;
        setProducts((data as Product[]) ?? []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load products");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: "#f87171" }}>{error}</p>;

  return (
    <section>
      <h2 style={{ fontSize: "1.6rem", fontWeight: 600, marginBottom: "0.75rem" }}>
        TempTagBot – Temp Tags & Insurance
      </h2>
      <p style={{ fontSize: "0.95rem", color: "#94a3b8", marginBottom: "1.5rem" }}>
        Choose a package, pay with Stripe, then enter your vehicle and contact details (same flow as in Telegram).
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1rem",
        }}
      >
        {products.map((p) => (
          <div key={p.id} style={cardStyle}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>{p.label}</h3>
            <p style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
              ${(p.price_cents / 100).toFixed(0)}
            </p>
            <a
              href={`/api/checkout?code=${encodeURIComponent(p.code)}`}
              style={{
                display: "inline-block",
                padding: "0.5rem 1rem",
                borderRadius: "999px",
                border: "1px solid #3b82f6",
                backgroundColor: "#1d4ed8",
                color: "#e5e7eb",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              PAY NOW
            </a>
          </div>
        ))}
      </div>
      <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "1.5rem" }}>
        After payment you’ll enter VIN, address, color, phone, and insurance. We use AI to validate your details (same as the bot).
      </p>
    </section>
  );
}
