import React from "react";

export const metadata = {
  title: "TempTagBot",
  description: "TempTagBot – online temp tag and insurance checkout",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          backgroundColor: "#020617",
          color: "#e5e7eb",
        }}
      >
        <div
          style={{
            maxWidth: "960px",
            margin: "0 auto",
            padding: "1.5rem",
          }}
        >
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
            }}
          >
            <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>TempTagBot Admin</h1>
            <nav style={{ display: "flex", gap: "1rem", fontSize: "0.95rem" }}>
              <a href="/" style={{ color: "#e5e7eb", textDecoration: "none" }}>
                Website
              </a>
              <a href="/admin" style={{ color: "#e5e7eb", textDecoration: "none" }}>
                Admin
              </a>
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
