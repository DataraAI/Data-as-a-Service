// src/Annotations.jsx
import React from "react";
const FIFTYONE_URL = import.meta.env.VITE_FIFTYONE_URL;
import { useNavigate } from "react-router-dom";

export default function Annotations() {
  const navigate = useNavigate();

  return (
    <div className="p-4">
      <header className="header">
        <h1
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/")}
        >
          📊 DataraAI Dashboard
        </h1>
      </header>

      <h2 className="text-xl font-bold mt-4 mb-4">Annotations Viewer</h2>
      <iframe
        src={FIFTYONE_URL}
        width="100%"
        height="800px"
        style={{ border: "none" }}
        title="FiftyOne Viewer"
      />
    </div>
  );
}
