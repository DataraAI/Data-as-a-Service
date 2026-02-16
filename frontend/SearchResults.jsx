import React, { useState } from "react";
import axios from "axios";

export default function SearchComponent() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(""); 
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setStatus("");

    try {
      const res = await axios.post("http://localhost:5050/search", { query });
      if (res.data.status === "launching") {
        setStatus("FiftyOne is starting, retrying in 3s...");
        // Retry automatically after delay
        setTimeout(handleSearch, 3000);
      } else if (res.data.status === "ok") {
        setStatus(`Showing results for: "${res.data.query}"`);
        setResults(res.data.query ? res.data.query : []);
      }
    } catch (err) {
      console.error(err);
      setStatus("Search failed. Check backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setQuery("");
    setStatus("Resetting search...");
    try {
      const res = await axios.post("http://localhost:5050/search", { query: "" });
      if (res.data.status === "ok") {
        setResults([]);
        setStatus("Showing full dataset.");
      }
    } catch (err) {
      console.error(err);
      setStatus("Reset failed.");
    }
  };

  return (
    <div style={{ margin: "1rem" }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search filenames or labels"
        style={{ padding: "0.5rem", width: "250px" }}
      />
      <button onClick={handleSearch} style={{ marginLeft: "0.5rem", padding: "0.5rem" }}>
        Search
      </button>
      <button onClick={handleReset} style={{ marginLeft: "0.5rem", padding: "0.5rem" }}>
        Reset
      </button>
      <div style={{ marginTop: "1rem" }}>
        {loading && <p>Loading...</p>}
        {status && <p>{status}</p>}
        {results.length > 0 && (
          <ul>
            {results.map((item, idx) => (
              <li key={idx}>{item.filepath || JSON.stringify(item)}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
