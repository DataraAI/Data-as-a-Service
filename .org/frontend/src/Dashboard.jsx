import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Dashboard.css";

const Dashboard = ({ stats }) => {
  const navigate = useNavigate();
  const [localStats, setLocalStats] = useState(stats || {});

  const fetchStats = async () => {
    try {
      const res = await axios.get("/stats");
      setLocalStats(res.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-container">
      <h1>Dashboard</h1>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card stat-purple">
          <h2>Total Datasets</h2>
          <p>{localStats.total_datasets}</p>
        </div>
        <div className="stat-card stat-red">
          <h2>Storage Used</h2>
          <p>{localStats.storage_used}</p>
        </div>
        <div className="stat-card stat-cyan">
          <h2>API Calls Today</h2>
          <p>{localStats.api_calls_today}</p>
        </div>
        <div className="stat-card stat-green">
          <h2>Active Users</h2>
          <p>{localStats.active_users}</p>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="buttons">
        <button className="btn-blue" onClick={() => navigate("/datasets")}>
          View Dataset with Annotations
        </button>
        <button className="btn-green" onClick={() => navigate("/images-only")}>
          View Dataset (Images Only)
        </button>
        <button 
          className="btn-robotics" 
          onClick={() => navigate("/robotics")}
          title="Access the AI-powered robotics system with trained models"
        >
          🤖 View AI Robotics System
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
