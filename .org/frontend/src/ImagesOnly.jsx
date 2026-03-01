import React, { useState, useEffect } from "react";
import axios from "axios";
import "./ImagesOnly.css"; // new CSS file for gallery styling

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const folders = [
  "train/images/good",
  "train/images/bad",
  "val/images/good",
  "val/images/bad"
];

const ImagesOnly = () => {
  const [images, setImages] = useState([]);

  useEffect(() => {
    const fetchImages = async () => {
      const allImages = [];
      await Promise.all(folders.map(async (folder) => {
        try {
          const res = await axios.get(`${BACKEND_URL}/list_images?folder=${folder}`);
          res.data.forEach(filename => {
            allImages.push(`${BACKEND_URL}/dataset/${folder}/${filename}`);
          });
        } catch (err) {
          console.error("Error fetching images from folder:", folder, err);
        }
      }));
      setImages(allImages);
    };

    fetchImages();
  }, []);

  return (
    <div className="images-container">
      <h1 className="images-title">Images Only</h1>
      <div className="images-grid">
        {images.map((src, idx) => (
          <div key={idx} className="image-card">
            <img src={src} alt={`img-${idx}`} className="image-item" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImagesOnly;
