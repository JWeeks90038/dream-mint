import React, { useState } from "react";

interface DreamNFT {
  tokenId: number;
  image: string;
  description: string;
}

interface DreamRemixerProps {
  nfts: DreamNFT[];
  onRemix: (parent1: number, parent2: number, newDream: string) => void;
  remixing: boolean;
}

const DreamRemixer: React.FC<DreamRemixerProps> = ({ nfts, onRemix, remixing }) => {
  const [selected, setSelected] = useState<number[]>([]);
  const [newDream, setNewDream] = useState("");

  const toggleSelect = (tokenId: number) => {
    setSelected(sel =>
      sel.includes(tokenId)
        ? sel.filter(id => id !== tokenId)
        : sel.length < 2
        ? [...sel, tokenId]
        : sel
    );
  };

  const canRemix = selected.length === 2 && newDream.trim().length > 0;

  return (
    <div className="dream-remixer">
      <h2>Remix Your Dreams</h2>
      <div className="remix-nft-list">
        {nfts.map(nft => (
          <div
            key={nft.tokenId}
            className={`remix-nft-card${selected.includes(nft.tokenId) ? ' selected' : ''}`}
            onClick={() => toggleSelect(nft.tokenId)}
          >
            <img src={nft.image} alt={`Dream #${nft.tokenId}`} style={{ width: 80, borderRadius: 8 }} />
            <div style={{ fontSize: 12, marginTop: 4 }}>#{nft.tokenId}</div>
          </div>
        ))}
      </div>
      <textarea
        value={newDream}
        onChange={e => setNewDream(e.target.value)}
        placeholder="Describe your remixed dream..."
        rows={4}
        style={{ width: '100%', marginTop: 16, borderRadius: 8, padding: 8, border: '1px solid #bdbdbd' }}
      />
      <button
        className="dream-action-btn"
        onClick={() => onRemix(selected[0], selected[1], newDream)}
        disabled={!canRemix || remixing}
        style={{ marginTop: 12 }}
      >
        {remixing ? 'Remixing...' : 'Remix & Mint Dream'}
      </button>
    </div>
  );
};

export default DreamRemixer;
