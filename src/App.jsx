import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import DentalPracticeSystem from "./DentalPracticeSystem";
import Login from "./Login";

function App() {
  const [user, setUser] = useState(() => {
  const savedUser = sessionStorage.getItem("dental_user");

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser);
  } catch {
    sessionStorage.removeItem("dental_user");
    sessionStorage.removeItem("dental_auth_token");
    return null;
  }
});

  function handleLogin(loggedInUser) {
    setUser(loggedInUser);
  }

  function handleLogout() {
  sessionStorage.removeItem("dental_auth_token");
  sessionStorage.removeItem("dental_user");
  setUser(null);
}

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return <DentalPracticeSystem user={user} onLogout={handleLogout} />;
}

createRoot(document.getElementById("root")).render(
  <App />
);
