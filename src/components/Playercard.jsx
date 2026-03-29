const PlayerCard = ({ player }) => {

    const nameColor = player.nameColor ? `#${player.nameColor.slice(4)}` : "#ffffff";
    const iconUrl = `https://cdn.brawlify.com/profile-icons/regular/${player.icon.id}.png`;


  const getTop20Avg = () => {
    const sorted = [...player.brawlers].sort((a, b) => b.trophies - a.trophies);
    return Math.floor(sorted.slice(0, 20).reduce((acc, b) => acc + b.trophies, 0) / 20);
  };

  const bestBrawler = player.brawlers.reduce((best, curr) =>
    curr.trophies > best.trophies ? curr : best
  );

  const stats = {
    gadgets: player.brawlers.reduce((sum, b) => sum + (b.gadgets?.length || 0), 0),
    starPowers: player.brawlers.reduce((sum, b) => sum + (b.starPowers?.length || 0), 0),
    p11: player.brawlers.filter(b => b.power === 11).length
  };

  return (
    <div className="player-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "15px" }}>
        <img 
          src={iconUrl} 
          alt="icon" 
          style={{ width: "40px", height: "40px", borderRadius: "8px", border: "2px solid #444" }}
          onError={(e) => { e.target.src = "https://cdn.brawlify.com/profile-icons/regular/28000000.png" }} // Fallback icon
        />
        <h2 style={{ color: nameColor, margin: 0, textShadow: "2px 2px 2px rgba(0,0,0,0.8)" }}>
          {player.name}
        </h2>
      </div>
      <p><b>Total Trophies:</b> {player.trophies}</p>
      <p><b>Top 20 Avg:</b> {getTop20Avg()}</p>
      <p><b>Best Brawler:</b> {bestBrawler.name} ({bestBrawler.trophies})</p>
      <p>3v3 Wins: {player["3vs3Victories"]}</p>
      <p>Power 11s: {stats.p11}</p>
      <p>Gadgets: {stats.gadgets} | Star Powers: {stats.starPowers}</p>
    </div>
  );
};

export default PlayerCard;