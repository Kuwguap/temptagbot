"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Product = {
  id: string;
  code: string;
  label: string;
  price_cents: number;
  active: boolean;
  sort_order: number;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: supaError } = await supabase
          .from("products")
          .select("*")
          .order("sort_order", { ascending: true });

        if (supaError) throw supaError;
        setProducts(data ?? []);
      } catch (err: any) {
        setError(err.message ?? "Failed to load products");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  async function updateProductField(
    id: string,
    field: keyof Pick<Product, "label" | "price_cents" | "sort_order" | "active">,
    value: string | number | boolean
  ) {
    try {
      setError(null);
      const payload: Partial<Product> = { [field]: value } as any;
      const { error: supaError } = await supabase
        .from("products")
        .update(payload)
        .eq("id", id);

      if (supaError) throw supaError;

      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...payload } : p))
      );
    } catch (err: any) {
      setError(err.message ?? "Failed to update product");
    }
  }

  async function addProduct() {
    try {
      setError(null);
      const { data, error: supaError } = await supabase
        .from("products")
        .insert([
          {
            code: "NEW_PRODUCT",
            label: "New product",
            price_cents: 0,
            sort_order: products.length + 1,
            active: true,
          },
        ])
        .select()
        .single();

      if (supaError) throw supaError;
      if (data) setProducts((prev) => [...prev, data]);
    } catch (err: any) {
      setError(err.message ?? "Failed to add product");
    }
  }

  return (
    <section>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Products</h2>
        <button
          onClick={() => void addProduct()}
          style={{
            padding: "0.4rem 0.9rem",
            borderRadius: "999px",
            border: "1px solid #3b82f6",
            backgroundColor: "#1d4ed8",
            color: "#e5e7eb",
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          + Add product
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {error && (
        <p style={{ color: "#f87171", marginBottom: "1rem" }}>
          {error}
        </p>
      )}

      {!loading && !products.length && <p>No products configured yet.</p>}

      {!loading && products.length > 0 && (
        <div
          style={{
            borderRadius: "0.75rem",
            border: "1px solid #1f2933",
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.9rem",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#020617" }}>
                <th style={{ textAlign: "left", padding: "0.6rem" }}>Code</th>
                <th style={{ textAlign: "left", padding: "0.6rem" }}>Label</th>
                <th style={{ textAlign: "left", padding: "0.6rem" }}>Price ($)</th>
                <th style={{ textAlign: "left", padding: "0.6rem" }}>Sort</th>
                <th style={{ textAlign: "left", padding: "0.6rem" }}>Active</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => (
                <tr
                  key={p.id}
                  style={{
                    borderTop: "1px solid #1f2933",
                    backgroundColor: idx % 2 === 0 ? "#020617" : "#030712",
                  }}
                >
                  <td style={{ padding: "0.6rem", fontFamily: "monospace" }}>
                    {p.code}
                  </td>
                  <td style={{ padding: "0.6rem" }}>
                    <input
                      value={p.label}
                      onChange={(e) =>
                        void updateProductField(p.id, "label", e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "0.25rem 0.4rem",
                        borderRadius: "0.4rem",
                        border: "1px solid #1f2933",
                        backgroundColor: "#020617",
                        color: "#e5e7eb",
                      }}
                    />
                  </td>
                  <td style={{ padding: "0.6rem" }}>
                    <input
                      type="number"
                      min={0}
                      value={(p.price_cents / 100).toFixed(2)}
                      onChange={(e) =>
                        void updateProductField(
                          p.id,
                          "price_cents",
                          Math.round(Number(e.target.value || 0) * 100)
                        )
                      }
                      style={{
                        width: "100%",
                        padding: "0.25rem 0.4rem",
                        borderRadius: "0.4rem",
                        border: "1px solid #1f2933",
                        backgroundColor: "#020617",
                        color: "#e5e7eb",
                      }}
                    />
                  </td>
                  <td style={{ padding: "0.6rem", width: "5rem" }}>
                    <input
                      type="number"
                      value={p.sort_order}
                      onChange={(e) =>
                        void updateProductField(
                          p.id,
                          "sort_order",
                          Number(e.target.value || 0)
                        )
                      }
                      style={{
                        width: "100%",
                        padding: "0.25rem 0.4rem",
                        borderRadius: "0.4rem",
                        border: "1px solid #1f2933",
                        backgroundColor: "#020617",
                        color: "#e5e7eb",
                      }}
                    />
                  </td>
                  <td style={{ padding: "0.6rem" }}>
                    <input
                      type="checkbox"
                      checked={p.active}
                      onChange={(e) =>
                        void updateProductField(p.id, "active", e.target.checked)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
