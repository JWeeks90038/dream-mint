import React from "react";

interface DreamVisualizerProps {
  imageUrl: string | null;
  loading: boolean;
  error?: string | null;
}

const DreamVisualizer: React.FC<DreamVisualizerProps> = ({ imageUrl, loading, error }) => {
  return (
    <div className="dream-visualizer" style={{ marginTop: 24 }}>
      <h2>AI Dream Visualizer</h2>
      {loading && <p>Generating your dream image...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {imageUrl && !loading && (
        <img
          src={imageUrl}
          alt="AI Dream Visual"
          style={{ maxWidth: '100%', borderRadius: 12, boxShadow: '0 2px 12px #0002' }}
        />
      )}
      {!imageUrl && !loading && !error && <p>No image generated yet.</p>}
    </div>
  );
};

export default DreamVisualizer;
