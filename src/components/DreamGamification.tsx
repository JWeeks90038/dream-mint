import React from "react";

interface DreamNFT {
  tokenId: number;
  description?: string;
  date?: string;
  mood?: string;
  category?: string;
  keywords?: string;
  parents?: [number, number]; // for remixed dreams
}

function getStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = dates.map(d => new Date(d)).sort((a, b) => b.getTime() - a.getTime());
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = (sorted[i - 1].getTime() - sorted[i].getTime()) / (1000 * 60 * 60 * 24);
    if (diff <= 1.1 && diff >= 0.9) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function getMostFrequent(arr: (string | undefined)[]): string | null {
  const freq: Record<string, number> = {};
  arr.forEach(item => {
    if (item) freq[item] = (freq[item] || 0) + 1;
  });
  let max = 0, result = null;
  for (const k in freq) {
    if (freq[k] > max) {
      max = freq[k];
      result = k;
    }
  }
  return result;
}

// Lucid Dreamer: if any dream's category or keywords include 'lucid'
function isLucidDreamer(nfts: DreamNFT[]): boolean {
  return nfts.some(nft =>
    (nft.category && nft.category.toLowerCase().includes('lucid')) ||
    (nft.keywords && nft.keywords.toLowerCase().includes('lucid')) ||
    (nft.description && nft.description.toLowerCase().includes('lucid'))
  );
}

const DreamGamification: React.FC<{ nfts: DreamNFT[] }> = ({ nfts }) => {
  const dates = nfts.map(nft => nft.date).filter(Boolean) as string[];
  const streak = getStreak(dates);
  const moods = nfts.map(nft => nft.mood).filter(Boolean) as string[];
  const categories = nfts.map(nft => nft.category).filter(Boolean) as string[];
  const keywords = nfts.flatMap(nft => (nft.keywords ? nft.keywords.split(',').map(k => k.trim()) : []));
  const topMood = getMostFrequent(moods);
  const topCategory = getMostFrequent(categories);
  const topKeyword = getMostFrequent(keywords);
  const isRemixer = nfts.some(nft => Array.isArray(nft.parents) && nft.parents.length === 2);
  const lucidDreamer = isLucidDreamer(nfts);

  return (
    <div className="dream-gamification" style={{ marginTop: 32, background: '#fff6', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px #0001' }}>
      <h2>Dream Streaks & Badges</h2>
      <p>Current streak: <b>{streak}</b> {streak === 1 ? 'day' : 'days'}</p>
      {streak >= 3 && <p>🔥 <b>Streak Master!</b> Keep it up!</p>}
      <div style={{ marginTop: 16 }}>
        <h3>Badges</h3>
        {topMood && <span style={{ marginRight: 12, background: '#e0c3fc', borderRadius: 8, padding: '4px 12px' }}>🌈 Mood: {topMood}</span>}
        {topCategory && <span style={{ marginRight: 12, background: '#fcb69f', borderRadius: 8, padding: '4px 12px' }}>🗂 Category: {topCategory}</span>}
        {topKeyword && <span style={{ background: '#a1c4fd', borderRadius: 8, padding: '4px 12px' }}>🔑 Keyword: {topKeyword}</span>}
        {isRemixer && <span style={{ background: '#ffe082', borderRadius: 8, padding: '4px 12px', marginLeft: 12 }}>🧬 Remixer</span>}
        {lucidDreamer && <span style={{ background: '#b2f7ef', borderRadius: 8, padding: '4px 12px', marginLeft: 12 }}>🌙 Lucid Dreamer</span>}
        {(!topMood && !topCategory && !topKeyword && !isRemixer && !lucidDreamer) && <span>No badges yet. Add moods, categories, keywords, remix, or log lucid dreams!</span>}
      </div>
    </div>
  );
};

export default DreamGamification;
