import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Dashboard = () => {
  const [stats, setStats] = useState({});
  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      const res = await axios.get("/stats");
      setStats(res.data);
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
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-4 bg-gray-100 rounded shadow">
          <h2 className="font-semibold">Total Datasets</h2>
          <p className="text-xl">{stats.total_datasets}</p>
        </div>
        <div className="p-4 bg-gray-100 rounded shadow">
          <h2 className="font-semibold">Active Users</h2>
          <p className="text-xl">{stats.active_users}</p>
        </div>
        <div className="p-4 bg-gray-100 rounded shadow">
          <h2 className="font-semibold">API Calls Today</h2>
          <p className="text-xl">{stats.api_calls_today}</p>
        </div>
        <div className="p-4 bg-gray-100 rounded shadow">
          <h2 className="font-semibold">Storage Used</h2>
          <p className="text-xl">{stats.storage_used}</p>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded"
          onClick={() => window.open("/dataset", "_blank")}
        >
          View Dataset
        </button>
        <button
          className="px-4 py-2 bg-green-500 text-white rounded"
          onClick={() => window.open("/dataset-annotations", "_blank")}
        >
          View Dataset with Annotations
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
