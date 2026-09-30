import React, { useState } from "react";

const API_URL =
  "https://dental-practice-backend-production.up.railway.app";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");

    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Login failed.");
      }

      // Save the login information for this browser session.
      sessionStorage.setItem("dental_auth_token", data.token);
      sessionStorage.setItem("dental_user", JSON.stringify(data.user));

      onLogin(data.user);
    } catch (err) {
      setError(err.message || "Unable to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoCircle}>L2S</div>

        <h1 style={styles.title}>Love2Smile Dental Suites</h1>

        <p style={styles.subtitle}>
          Dental Practice Management System
        </p>

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Username</label>

          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            autoComplete="username"
            style={styles.input}
            disabled={loading}
          />

          <label style={styles.label}>Password</label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            style={styles.input}
            disabled={loading}
          />

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={styles.footer}>
          Authorised Love2Smile Dental Suites staff only
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, #f5f8ff 0%, #ffffff 50%, #eef4ff 100%)",
    padding: "20px",
    boxSizing: "border-box",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
  },

  card: {
    width: "100%",
    maxWidth: "430px",
    background: "#ffffff",
    borderRadius: "18px",
    padding: "40px",
    boxSizing: "border-box",
    boxShadow: "0 15px 45px rgba(0, 0, 0, 0.12)",
    textAlign: "center",
  },

  logoCircle: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    margin: "0 auto 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#174ea6",
    color: "#ffffff",
    fontSize: "20px",
    fontWeight: "700",
    letterSpacing: "1px",
  },

  title: {
    margin: "0",
    color: "#17365d",
    fontSize: "25px",
    lineHeight: "1.25",
  },

  subtitle: {
    margin: "10px 0 30px",
    color: "#6b7280",
    fontSize: "14px",
  },

  label: {
    display: "block",
    textAlign: "left",
    marginBottom: "7px",
    marginTop: "17px",
    color: "#374151",
    fontSize: "14px",
    fontWeight: "600",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 14px",
    border: "1px solid #d1d5db",
    borderRadius: "9px",
    fontSize: "15px",
    outline: "none",
    background: "#ffffff",
  },

  error: {
    marginTop: "16px",
    padding: "11px 12px",
    borderRadius: "8px",
    background: "#fff1f2",
    color: "#b42318",
    fontSize: "14px",
    textAlign: "left",
  },

  button: {
    width: "100%",
    marginTop: "24px",
    padding: "14px",
    border: "none",
    borderRadius: "9px",
    background: "#174ea6",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
  },

  footer: {
    margin: "25px 0 0",
    color: "#9ca3af",
    fontSize: "12px",
  },
};