import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import "./index.css";
import "./App.css";
import Dashboard from "./Dashboard";
import Datasets from "./Datasets";
import ImagesOnly from "./ImagesOnly";
import Robotics from "./Robotics";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function App() {
  const [stats, setStats] = useState({
    total_datasets: 0,
    storage_used: 0,
    api_calls_today: 0,
    active_users: 0,
    recent_uploads: [],
    popular_searches: [],
  });

  const fetchStats = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/stats`);
      if (!res.ok) return;
      const data = await res.json();
      setStats({
        total_datasets: data.total_datasets || 0,
        storage_used: data.storage_used || 0,
        api_calls_today: data.api_calls_today || 0,
        active_users: data.active_users || 0,
        recent_uploads: data.recent_uploads || [],
        popular_searches: data.popular_searches || [],
      });
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <header className="header">
        <h1>📊 DataraAI</h1>
        <nav>
          <Link className="dashboard-btn" to="/">Dashboard</Link>
          <Link className="dashboard-btn" to="/datasets">Datasets</Link>
          <Link className="dashboard-btn" to="/robotics">AI Robotics</Link>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<Dashboard stats={stats} />} />
        <Route path="/datasets" element={<Datasets />} />
        <Route path="/images-only" element={<ImagesOnly />} />
        <Route path="/robotics" element={<Robotics />} />
      </Routes>
    </Router>
  );
}
