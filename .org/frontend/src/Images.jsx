// src/Images.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const Images = () => {
  const navigate = useNavigate();
  const [images, setImages] = useState([]);

  useEffect(() => {
    axios.get(`${BACKEND_URL}/images`).then(res => setImages(res.data));
  }, []);

  return (
    <div className="p-4">
      <header style={{ marginBottom: "1rem" }}>
        <h1 style={{ cursor: "pointer" }} onClick={() => navigate("/")}>
          📊 DataraAI Dashboard
        </h1>
      </header>

      <h2>Image Gallery</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {images.map((img, idx) => (
          <img
            key={idx}
            src={`${BACKEND_URL}/dataset/${img}`}
            style={{ width: "200px", height: "auto", border: "1px solid #ccc", padding: "2px" }}
            alt={img}
          />
        ))}
      </div>
    </div>
  );
};

export default Images;
