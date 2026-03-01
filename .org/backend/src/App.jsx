// src/App.jsx
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Bell, Settings, User, FileText, Flame, Zap } from "lucide-react";
import "./index.css";
import "./app.css";
import Datasets from "./Datasets";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function Dashboard({ stats }) {
  return (
    <div className="dashboard-container">
      <section className="welcome-banner">
        <div>
          <h2>Welcome back, User</h2>
          <p>DataraAI Dashboard</p>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button className="dashboard-btn"><Bell size={16} /> Notifications</button>
          <button className="dashboard-btn"><Settings size={16} /> Settings</button>
          <button className="dashboard-btn"><User size={16} /> Profile</button>
        </div>
      </section>

      <div className="dashboard-grid">
        <div className="dashboard-card gradient-purple">
          <p>Total Datasets</p>
          <h3>{stats.total_datasets}</h3>
          <p>📈 Updates in real-time</p>
        </div>
        <div className="dashboard-card gradient-red">
          <p>Storage Used</p>
          <h3>{stats.storage_used} GB</h3>
          <p>📊 Real-time usage</p>
        </div>
        <div className="dashboard-card gradient-cyan">
          <p>API Calls Today</p>
          <h3>{stats.api_calls_today}</h3>
          <p>📈 Real-time count</p>
        </div>
        <div className="dashboard-card gradient-green">
          <p>Active Users</p>
          <h3>{stats.active_users}</h3>
          <p>🟢 Currently online</p>
        </div>

        <div className="right-panel">
          <h4>Recent Uploads & Popular Searches</h4>
          {stats.recent_uploads?.length > 0 ? (
            stats.recent_uploads.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FileText size={14} /> Latest: {f}
              </div>
            ))
          ) : (
            <p>No recent uploads</p>
          )}
          {stats.popular_searches?.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#f97316" }}>
              <Flame size={14} /> Popular: {stats.popular_searches.join(", ")}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#10b981" }}>
            <Zap size={14} /> System Status: All Services Online
          </div>
        </div>
      </div>
    </div>
  );
}

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
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<Dashboard stats={stats} />} />
        <Route path="/datasets" element={<Datasets />} />
      </Routes>
    </Router>
  );
}
