// src/ImageGallery.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function ImageGallery() {
  const [images, setImages] = useState([]);
  const navigate = useNavigate();

  const fetchImages = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/images`);
      setImages(res.data);
    } catch (err) {
      console.error("Failed to fetch images:", err);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

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

      <h2 className="text-xl font-bold mt-4 mb-4">Image Gallery</h2>
      <div className="grid grid-cols-4 gap-4">
        {images.map((img) => (
          <div key={img} className="border p-1 rounded shadow">
            <img
              src={`${BACKEND_URL}/dataset/${img}`}
              alt={img}
              className="w-full h-32 object-cover"
            />
            <p className="text-sm text-center">{img}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
