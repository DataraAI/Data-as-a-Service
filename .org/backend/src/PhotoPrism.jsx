import React, { useEffect, useState } from "react";
import axios from "axios";

const PHOTOPRISM_API = "http://localhost:2342/api/v1";
const BACKEND_API = "http://localhost:5050"; // Your Flask app

const PhotoPrismGallery = () => {
  const [photos, setPhotos] = useState([]);
  const [filter, setFilter] = useState("all");
  const [stats, setStats] = useState({popular_labels: []});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPhotos();
    fetchStats();
  }, []);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${PHOTOPRISM_API}/photos`, {
        headers: { Authorization: `Bearer YOUR_TOKEN_HERE` },
        params: { order: "created DESC", limit: 100 }
      });
      const mappedPhotos = res.data?.photos?.map(photo => {
        const label = photo.name.includes("Good") ? "Good" : "Bad";
        return {...photo, label};
      }) || [];
      setPhotos(mappedPhotos);
    } catch (err) {
      console.error("Failed to fetch photos:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${BACKEND_API}/stats`);
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const filteredPhotos = photos.filter(p => filter === "all" || p.label === filter);

  return (
    <div>
      <h2>Photo Gallery</h2>

      <div style={{ marginBottom: "1rem" }}>
        <button onClick={() => setFilter("all")}>All</button>
        <button onClick={() => setFilter("Good")}>Good</button>
        <button onClick={() => setFilter("Bad")}>Bad</button>
        <button onClick={fetchPhotos}>Refresh</button>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <strong>Stats:</strong>
        {stats.popular_labels.map(label => (
          <span key={label.label} style={{ marginLeft: "10px" }}>
            {label.label}: {label.count}
          </span>
        ))}
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "10px" }}>
          {filteredPhotos.map(photo => (
            <div key={photo.id} style={{ border: "1px solid #ccc", padding: "5px" }}>
              <img
                src={`http://localhost:2342/originals/${photo.name}`}
                alt={photo.name}
                style={{ width: "100%", height: "auto" }}
              />
              <p style={{ textAlign: "center", margin: "5px 0" }}>{photo.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoPrismGallery;
