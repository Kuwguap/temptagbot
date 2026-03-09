"use client";

import React, { useEffect, useState } from "react";

const cardStyle: React.CSSProperties = {
  backgroundColor: "#0f172a",
  borderRadius: "0.75rem",
  border: "1px solid #1e293b",
  padding: "1.25rem",
  marginBottom: "1rem",
};

export default function SuccessPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [productCode, setProductCode] = useState<string>("");
  const [rawText, setRawText] = useState("");
  const [vin, setVin] = useState("");
  const [address, setAddress] = useState("");
  const [color, setColor] = useState("");
  const [phone, setPhone] = useState("");
  const [insurance, setInsurance] = useState("");
  const [validated, setValidated] = useState(false);
  const [validateErrors, setValidateErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const sid = params.get("session_id");
    setSessionId(sid);
    if (sid) {
      fetch(`/api/session?session_id=${encodeURIComponent(sid)}`)
        .then((r) => r.json())
        .then((d) => setProductCode(d.productCode ?? ""))
        .catch(() => setError("Could not load session"));
    } else {
      setError("Missing session_id");
    }
  }, []);

  const handleValidate = async () => {
    setLoading(true);
    setValidateErrors([]);
    setError(null);
    try {
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: rawText || undefined,
          productCode,
          vin: vin || undefined,
          address: address || undefined,
          color: color || undefined,
          phone: phone || undefined,
          insurance: insurance || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok && data.extracted) {
        if (data.extracted.vin) setVin(data.extracted.vin);
        if (data.extracted.address) setAddress(data.extracted.address);
        if (data.extracted.color) setColor(data.extracted.color);
        if (data.extracted.phone) setPhone(data.extracted.phone);
        if (data.extracted.insurance !== undefined) setInsurance(data.extracted.insurance);
        setValidated(true);
        setValidateErrors([]);
      } else {
        setValidateErrors(data.errors ?? ["Validation failed"]);
      }
    } catch (e) {
      setError("Validation request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          productCode,
          vin,
          address,
          color,
          phone,
          insuranceInfo: insurance,
        }),
      });
      const data = await res.json();
      if (data.orderNumber) {
        setOrderNumber(data.orderNumber);
      } else {
        setError(data.error ?? "Could not create order");
      }
    } catch (e) {
      setError("Order request failed");
    } finally {
      setLoading(false);
    }
  };

  if (orderNumber) {
    return (
      <section style={{ maxWidth: "560px" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>Order complete</h2>
        <p style={{ color: "#94a3b8", marginBottom: "1rem" }}>
          Your order number is <strong>{orderNumber}</strong>. We’ll process it shortly.
        </p>
      </section>
    );
  }

  if (error && !sessionId) {
    return (
      <section>
        <p style={{ color: "#f87171" }}>{error}</p>
      </section>
    );
  }

  return (
    <section style={{ maxWidth: "560px" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>Payment received</h2>
      <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
        Enter your vehicle and contact details below. You can paste one message and click Validate, or fill the fields manually.
      </p>

      <div style={cardStyle}>
        <label style={{ display: "block", fontSize: "0.9rem", marginBottom: "0.35rem" }}>Paste details (optional)</label>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="e.g. VIN 1HGBH41JXMN109186, 123 Main St, Blue, 555-123-4567, State Farm"
          rows={3}
          style={{
            width: "100%",
            padding: "0.5rem",
            borderRadius: "0.5rem",
            border: "1px solid #1e293b",
            backgroundColor: "#020617",
            color: "#e2e8f0",
            fontSize: "0.95rem",
          }}
        />
        <button
          type="button"
          onClick={handleValidate}
          disabled={loading}
          style={{
            marginTop: "0.75rem",
            padding: "0.5rem 1rem",
            borderRadius: "999px",
            border: "1px solid #3b82f6",
            backgroundColor: "#1d4ed8",
            color: "#e5e7eb",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Validating…" : "Validate with AI"}
        </button>
      </div>

      <div style={cardStyle}>
        <label style={{ display: "block", fontSize: "0.9rem", marginBottom: "0.35rem" }}>VIN (17 characters)</label>
        <input
          value={vin}
          onChange={(e) => setVin(e.target.value)}
          maxLength={17}
          style={{ width: "100%", padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid #1e293b", backgroundColor: "#020617", color: "#e2e8f0" }}
        />
        <label style={{ display: "block", fontSize: "0.9rem", marginBottom: "0.35rem", marginTop: "0.75rem" }}>Address</label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={{ width: "100%", padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid #1e293b", backgroundColor: "#020617", color: "#e2e8f0" }}
        />
        <label style={{ display: "block", fontSize: "0.9rem", marginBottom: "0.35rem", marginTop: "0.75rem" }}>Vehicle color</label>
        <input
          value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{ width: "100%", padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid #1e293b", backgroundColor: "#020617", color: "#e2e8f0" }}
        />
        <label style={{ display: "block", fontSize: "0.9rem", marginBottom: "0.35rem", marginTop: "0.75rem" }}>Phone</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ width: "100%", padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid #1e293b", backgroundColor: "#020617", color: "#e2e8f0" }}
        />
        <label style={{ display: "block", fontSize: "0.9rem", marginBottom: "0.35rem", marginTop: "0.75rem" }}>Insurance (required for Temp Tag Only)</label>
        <input
          value={insurance}
          onChange={(e) => setInsurance(e.target.value)}
          placeholder="e.g. State Farm, policy #..."
          style={{ width: "100%", padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid #1e293b", backgroundColor: "#020617", color: "#e2e8f0" }}
        />
      </div>

      {validateErrors.length > 0 && (
        <ul style={{ color: "#f87171", marginBottom: "1rem", paddingLeft: "1.25rem" }}>
          {validateErrors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      {error && <p style={{ color: "#f87171", marginBottom: "1rem" }}>{error}</p>}

      <button
        type="button"
        onClick={handleComplete}
        disabled={loading || !vin || !address || !color || !phone}
        style={{
          padding: "0.5rem 1.25rem",
          borderRadius: "999px",
          border: "1px solid #22c55e",
          backgroundColor: "#15803d",
          color: "#e5e7eb",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Submitting…" : "Complete order"}
      </button>
    </section>
  );
}
