import React from "react";

const Datasets = () => {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">FiftyOne Dataset Viewer</h1>
      <iframe
        src="http://YOUR_FLASK_HOST:5151"
        width="100%"
        height="800px"
        style={{ border: "none" }}
        title="FiftyOne Viewer"
      />
    </div>
  );
};

export default Datasets;
