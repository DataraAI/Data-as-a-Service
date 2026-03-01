import React, { useState, useEffect } from "react";
import axios from "axios";

const Datasets = () => {
  const [stats, setStats] = useState({});

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
      <h1 className="text-2xl font-bold mb-4">Datasets</h1>

      {/* Stats Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Stats</h2>
        <ul className="list-disc pl-6">
          <li>Total Datasets: {stats.total_datasets}</li>
          <li>Active Users: {stats.active_users}</li>
          <li>API Calls Today: {stats.api_calls_today}</li>
          <li>Storage Used: {stats.storage_used}</li>
        </ul>
      </div>

      {/* FiftyOne Viewer */}
      <div>
        <h2 className="text-xl font-semibold mb-2">FiftyOne Viewer</h2>
        <iframe
          src="http://127.0.0.1:5151"
          width="100%"
          height="800px"
          style={{ border: "none" }}
          title="FiftyOne Viewer"
        />
      </div>
    </div>
  );
};

export default Datasets;
