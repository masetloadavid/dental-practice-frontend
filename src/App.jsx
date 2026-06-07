import React from "react";
import { createRoot } from "react-dom/client";

function App() {
  return (
    <div style={{ padding: "30px", fontFamily: "Arial" }}>
      <h1>Dental Practice System</h1>
      <p>React frontend is working.</p>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
