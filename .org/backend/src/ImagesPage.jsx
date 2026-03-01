// src/ImagesPage.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const ImagesPage = () => {
  const [images, setImages] = useState([]);

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
      <h1 className="text-2xl font-bold mb-4">Image Dataset</h1>
      <div className="grid grid-cols-4 gap-4">
        {images.map((img, idx) => (
          <div key={idx} className="border rounded overflow-hidden">
            <img
              src={`${BACKEND_URL}/dataset/${img}`}
              alt={img}
              style={{ width: "100%", height: "200px", objectFit: "cover" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImagesPage;
