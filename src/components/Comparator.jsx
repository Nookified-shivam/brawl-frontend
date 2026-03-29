import { useState, useEffect, useRef } from "react";
import { getPlayer } from "./services/api";

// ─── Utilities ────────────────────────────────────────────────────────────────
const fmt = (n) => (typeof n === "number" ? n.toLocaleString() : n);

const compare = (a, b, metric) => {
  const v = { a: a[metric], b: b[metric] };
  if (typeof v.a !== "number") return { a: "neutral", b: "neutral" };
  if (v.a > v.b) return { a: "better", b: "worse" };
  if (v.a < v.b) return { a: "worse", b: "better" };
  return { a: "neutral", b: "neutral" };
};

const METRICS = [
  { key: "trophies", label: "Total Trophies", icon: "◈" },
  { key: "top20Avg", label: "Top 20 Average", icon: "◉" },
  { key: "bestBrawler", label: "Best Brawler", icon: "◆" },
  { key: "prestigeLevel", label: "Prestige Level", icon: "◇" },
  { key: "wins3v3", label: "3v3 Wins", icon: "▣" },
  { key: "soloWins", label: "Solo Wins", icon: "▤" },
  { key: "power11Count", label: "Power 11 Count", icon: "◐" },
  { key: "gadgets", label: "Gadgets", icon: "◑" },
  { key: "starPowers", label: "Star Powers", icon: "★" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Scanline() {
  return (
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999,
      backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
    }} />
  );
}

function GridBg() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
      backgroundImage: `
        linear-gradient(rgba(30,60,120,0.07) 1px, transparent 1px),
        linear-gradient(90deg, rgba(30,60,120,0.07) 1px, transparent 1px)
      `,
      backgroundSize: "48px 48px",
    }} />
  );
}

function GlowOrb({ color, x, y, size = 400 }) {
  return (
    <div style={{
      position: "fixed", left: x, top: y, width: size, height: size,
      borderRadius: "50%", pointerEvents: "none", zIndex: 0,
      background: color,
      filter: "blur(120px)",
      opacity: 0.18,
      transform: "translate(-50%, -50%)",
    }} />
  );
}

function StatBar({ value, max, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{
      height: 3, background: "rgba(255,255,255,0.06)",
      borderRadius: 2, marginTop: 6, overflow: "hidden",
    }}>
      <div style={{
        width: `${pct}%`, height: "100%",
        background: color, borderRadius: 2,
        transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: `0 0 8px ${color}`,
      }} />
    </div>
  );
}

function PlayerCard({ player, side, visible }) {
  const color = side === "a" ? "#3b82f6" : "#f59e0b";
  const initials = player.name.slice(0, 2);

  return (
    <div style={{
      flex: 1,
      background: "rgba(255,255,255,0.03)",
      border: `1px solid ${color}22`,
      borderRadius: 16,
      padding: "28px 24px",
      display: "flex", alignItems: "center", gap: 20,
      backdropFilter: "blur(12px)",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(16px)",
      transition: "all 0.5s cubic-bezier(0.4,0,0.2,1)",
      boxShadow: `0 0 40px ${color}0a, inset 0 1px 0 ${color}15`,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: `linear-gradient(135deg, ${color}30, ${color}10)`,
        border: `1px solid ${color}40`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, fontWeight: 700, color,
        fontFamily: "'Orbitron', monospace",
        letterSpacing: 1,
        flexShrink: 0,
      }}>
        {initials}
      </div>
      <div>
        <div style={{ fontSize: 11, color: color + "aa", letterSpacing: 3, textTransform: "uppercase", marginBottom: 4, fontFamily: "'Orbitron', monospace" }}>
          {side === "a" ? "Player Alpha" : "Player Beta"}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", letterSpacing: 0.5, fontFamily: "'Rajdhani', sans-serif" }}>
          {player.name}
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, fontFamily: "'Share Tech Mono', monospace" }}>
          {player.tag}
        </div>
      </div>
      <div style={{ marginLeft: "auto", textAlign: "right" }}>
        <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "'Orbitron', monospace" }}>
          {fmt(player.trophies)}
        </div>
        <div style={{ fontSize: 11, color: "#475569", letterSpacing: 2, textTransform: "uppercase" }}>trophies</div>
      </div>
    </div>
  );
}

function MetricRow({ metric, playerA, playerB, visible, delay }) {
  const result = compare(playerA, playerB, metric.key);
  const valA = playerA[metric.key];
  const valB = playerB[metric.key];
  const isNumeric = typeof valA === "number";

  const maxVal = isNumeric ? Math.max(valA, valB, 1) : 1;

  const colorA = result.a === "better" ? "#4ade80" : result.a === "worse" ? "#f87171" : "#94a3b8";
  const colorB = result.b === "better" ? "#4ade80" : result.b === "worse" ? "#f87171" : "#94a3b8";
  const blueBar = "#3b82f6";
  const goldBar = "#f59e0b";

  const indicator = (side) => {
    const r = side === "a" ? result.a : result.b;
    if (r === "better") return <span style={{ color: "#4ade80", fontSize: 10, marginLeft: 6, fontFamily: "'Orbitron', monospace" }}>▲</span>;
    if (r === "worse") return <span style={{ color: "#f87171", fontSize: 10, marginLeft: 6, fontFamily: "'Orbitron', monospace" }}>▼</span>;
    return null;
  };

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr auto 1fr",
      alignItems: "center", gap: 0,
      padding: "0 2px",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateX(0)" : "translateX(-20px)",
      transition: `opacity 0.4s ease ${delay}ms, transform 0.4s ease ${delay}ms`,
    }}>
      {/* Player A */}
      <div style={{ padding: "14px 20px", textAlign: "right" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
          <span style={{
            fontSize: 15, fontWeight: result.a === "better" ? 700 : 500,
            color: colorA,
            fontFamily: isNumeric ? "'Share Tech Mono', monospace" : "'Rajdhani', sans-serif",
            textShadow: result.a === "better" ? `0 0 12px ${colorA}66` : "none",
            transition: "all 0.3s",
          }}>
            {fmt(valA)}
          </span>
          {indicator("a")}
        </div>
        {isNumeric && <StatBar value={valA} max={maxVal} color={result.a === "better" ? "#3b82f6" : "#1e3a5f"} />}
      </div>

      {/* Metric Label */}
      <div style={{
        padding: "14px 20px",
        textAlign: "center", minWidth: 180,
        borderLeft: "1px solid rgba(255,255,255,0.05)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: 14, color: "#475569", fontFamily: "'Orbitron', monospace" }}>
            {metric.icon}
          </span>
          <span style={{ fontSize: 12, color: "#64748b", letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'Share Tech Mono', monospace" }}>
            {metric.label}
          </span>
        </div>
      </div>

      {/* Player B */}
      <div style={{ padding: "14px 20px", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {indicator("b")}
          <span style={{
            fontSize: 15, fontWeight: result.b === "better" ? 700 : 500,
            color: colorB,
            fontFamily: isNumeric ? "'Share Tech Mono', monospace" : "'Rajdhani', sans-serif",
            textShadow: result.b === "better" ? `0 0 12px ${colorB}66` : "none",
            transition: "all 0.3s",
          }}>
            {fmt(valB)}
          </span>
        </div>
        {isNumeric && <StatBar value={valB} max={maxVal} color={result.b === "better" ? "#f59e0b" : "#3d2e00"} />}
      </div>
    </div>
  );
}

function WinnerBadge({ playerA, playerB, visible }) {
  const scoreA = METRICS.filter(m => typeof playerA[m.key] === "number" && playerA[m.key] > playerB[m.key]).length;
  const scoreB = METRICS.filter(m => typeof playerB[m.key] === "number" && playerB[m.key] > playerA[m.key]).length;
  const winner = scoreA > scoreB ? playerA.name : scoreB > scoreA ? playerB.name : null;
  const side = scoreA > scoreB ? "a" : scoreB > scoreA ? "b" : null;
  const color = side === "a" ? "#3b82f6" : side === "b" ? "#f59e0b" : "#94a3b8";

  return (
    <div style={{
      marginTop: 32, display: "flex", justifyContent: "center",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.95)",
      transition: "all 0.6s cubic-bezier(0.4,0,0.2,1) 0.8s",
    }}>
      <div style={{
        background: `linear-gradient(135deg, ${color}18, ${color}08)`,
        border: `1px solid ${color}33`,
        borderRadius: 12, padding: "16px 40px",
        textAlign: "center",
        backdropFilter: "blur(12px)",
        boxShadow: `0 0 40px ${color}15`,
      }}>
        <div style={{ fontSize: 10, color: "#475569", letterSpacing: 3, textTransform: "uppercase", marginBottom: 6, fontFamily: "'Orbitron', monospace" }}>
          Analysis Complete
        </div>
        {winner ? (
          <>
            <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "'Orbitron', monospace", letterSpacing: 1 }}>
              {winner}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, fontFamily: "'Share Tech Mono', monospace" }}>
              wins {Math.max(scoreA, scoreB)} / {METRICS.filter(m => typeof playerA[m.key] === "number").length} metrics
            </div>
          </>
        ) : (
          <div style={{ fontSize: 16, fontWeight: 700, color: "#94a3b8", fontFamily: "'Orbitron', monospace" }}>
            DRAW
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function BrawlStarsComparator() {
  const [tagA, setTagA] = useState("");
  const [tagB, setTagB] = useState("");
  const [playerA, setPlayerA] = useState(null);
  const [playerB, setPlayerB] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  const [focusA, setFocusA] = useState(false);
  const [focusB, setFocusB] = useState(false);
  const [hoverBtn, setHoverBtn] = useState(false);
  const resultRef = useRef(null);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;800;900&family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  const handleCompare = async()=> { 
    try {
  const cleanTagA = tagA.replace("#", "");
  const cleanTagB = tagB.replace("#", "");

  const [a, b] = await Promise.all([
    getPlayer(cleanTagA),
    getPlayer(cleanTagB)
  ]);

  // 🔥 Transform API data to match UI format
  const transformPlayer = (p) => ({
    name: p.name,
    tag: p.tag,
    trophies: p.trophies,

    top20Avg: (() => {
      const sorted = [...p.brawlers].sort((a,b)=>b.trophies-a.trophies);
      const top = sorted.slice(0,20);
      return Math.floor(top.reduce((s,b)=>s+b.trophies,0)/top.length);
    })(),

    bestBrawler: p.brawlers.reduce((best, curr) =>
      curr.trophies > best.trophies ? curr : best
    ).name,

    prestigeLevel: p.totalPrestigeLevel,
    wins3v3: p["3vs3Victories"],
    soloWins: p.soloVictories,

    power11Count: p.brawlers.filter(b => b.power === 11).length,

    gadgets: p.brawlers.reduce((s,b)=>s+(b.gadgets?.length||0),0),
    starPowers: p.brawlers.reduce((s,b)=>s+(b.starPowers?.length||0),0),
  });

  setPlayerA(transformPlayer(a));
  setPlayerB(transformPlayer(b));

} catch (err) {
  setError("Failed to fetch player data");
  console.error(err);
}
  }
  const inputStyle = (focused) => ({
    flex: 1,
    background: focused ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
    border: `1px solid ${focused ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.08)"}`,
    borderRadius: 10,
    padding: "14px 18px",
    fontSize: 14,
    color: "#e2e8f0",
    fontFamily: "'Share Tech Mono', monospace",
    outline: "none",
    transition: "all 0.2s ease",
    letterSpacing: 1,
    boxShadow: focused ? "0 0 0 3px rgba(59,130,246,0.12), 0 0 20px rgba(59,130,246,0.08)" : "none",
    width: "100%",
  });
  
  return (
    <div style={{
      minHeight: "100vh",
      background: "#060a14",
      color: "#e2e8f0",
      fontFamily: "'Rajdhani', sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::placeholder { color: #334155; font-family: 'Share Tech Mono', monospace; font-size: 13px; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0a0f1e; }
        ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 3px; }
        @keyframes pulse-ring { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes rowFlash { from{background:rgba(245,158,11,0.08)} to{background:transparent} }
      `}</style>

      <Scanline />
      <GridBg />
      <GlowOrb color="radial-gradient(circle, #1d4ed8, transparent)" x="15%" y="20%" size={600} />
      <GlowOrb color="radial-gradient(circle, #b45309, transparent)" x="85%" y="70%" size={500} />
      <GlowOrb color="radial-gradient(circle, #0f172a, transparent)" x="50%" y="50%" size={800} />

      <div style={{ position: "relative", zIndex: 10, maxWidth: 960, margin: "0 auto", padding: "0 24px 80px" }}>

        {/* ── Header ── */}
        <div style={{
          paddingTop: 64, paddingBottom: 48, textAlign: "center",
          animation: "fadeUp 0.8s ease both",
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 12,
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: 6, padding: "5px 14px", marginBottom: 24,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", boxShadow: "0 0 8px #f59e0b", animation: "pulse-ring 2s infinite" }} />
            <span style={{ fontSize: 11, color: "#f59e0b", letterSpacing: 3, textTransform: "uppercase", fontFamily: "'Orbitron', monospace" }}>
              Analytics Platform
            </span>
          </div>

          <h1 style={{
            fontSize: "clamp(28px, 5vw, 48px)",
            fontWeight: 900,
            fontFamily: "'Orbitron', monospace",
            letterSpacing: -0.5,
            lineHeight: 1.1,
            marginBottom: 12,
            background: "linear-gradient(135deg, #f1f5f9 30%, #94a3b8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            BRAWL STARS
            <br />
            <span style={{
              background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>COMPARATOR</span>
          </h1>

          <p style={{ fontSize: 14, color: "#475569", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Share Tech Mono', monospace" }}>
            Compare performance. Find the stronger player.
          </p>
        </div>

        {/* ── Input Section ── */}
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 16, padding: 32,
          backdropFilter: "blur(20px)",
          marginBottom: 32,
          animation: "fadeUp 0.8s ease 0.15s both",
          boxShadow: "0 0 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}>
          <div style={{ fontSize: 11, color: "#334155", letterSpacing: 3, textTransform: "uppercase", marginBottom: 20, fontFamily: "'Orbitron', monospace" }}>
            Player Tags
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Input A */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#3b82f6", letterSpacing: 2, marginBottom: 8, fontFamily: "'Orbitron', monospace", textTransform: "uppercase" }}>
                ◈ Alpha
              </div>
              <input
                value={tagA}
                onChange={e => setTagA(e.target.value)}
                onFocus={() => setFocusA(true)}
                onBlur={() => setFocusA(false)}
                onKeyDown={e => e.key === "Enter" && handleCompare()}
                placeholder="#PLAYER1TAG"
                style={inputStyle(focusA)}
              />
            </div>

            {/* VS divider */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0, paddingTop: 20 }}>
              <div style={{ width: 1, height: 16, background: "linear-gradient(transparent, rgba(255,255,255,0.1))" }} />
              <div style={{
                width: 40, height: 40,
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800, color: "#334155",
                fontFamily: "'Orbitron', monospace",
                letterSpacing: 1,
                background: "rgba(255,255,255,0.02)",
              }}>VS</div>
              <div style={{ width: 1, height: 16, background: "linear-gradient(rgba(255,255,255,0.1), transparent)" }} />
            </div>

            {/* Input B */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: "#f59e0b", letterSpacing: 2, marginBottom: 8, fontFamily: "'Orbitron', monospace", textTransform: "uppercase" }}>
                ◈ Beta
              </div>
              <input
                value={tagB}
                onChange={e => setTagB(e.target.value)}
                onFocus={() => setFocusB(true)}
                onBlur={() => setFocusB(false)}
                onKeyDown={e => e.key === "Enter" && handleCompare()}
                placeholder="#PLAYER2TAG"
                style={inputStyle(focusB)}
              />
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 12, fontSize: 12, color: "#f87171", fontFamily: "'Share Tech Mono', monospace", letterSpacing: 1 }}>
              ✕ {error}
            </div>
          )}

          {/* Compare button */}
          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleCompare}
              disabled={loading}
              onMouseEnter={() => setHoverBtn(true)}
              onMouseLeave={() => setHoverBtn(false)}
              style={{
                background: loading ? "rgba(245,158,11,0.15)" : hoverBtn
                  ? "linear-gradient(135deg, #d97706, #f59e0b)"
                  : "linear-gradient(135deg, #b45309, #d97706)",
                border: "1px solid rgba(245,158,11,0.3)",
                borderRadius: 10,
                padding: "13px 40px",
                fontSize: 13,
                fontWeight: 700,
                color: loading ? "#92400e" : "#0a0f1e",
                fontFamily: "'Orbitron', monospace",
                letterSpacing: 2,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                transform: hoverBtn && !loading ? "translateY(-2px)" : "translateY(0)",
                boxShadow: hoverBtn && !loading ? "0 8px 30px rgba(245,158,11,0.25)" : "0 4px 12px rgba(0,0,0,0.3)",
                display: "flex", alignItems: "center", gap: 10,
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: 14, height: 14, border: "2px solid #92400e",
                    borderTopColor: "#f59e0b", borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }} />
                  ANALYZING
                </>
              ) : (
                <>◈ COMPARE</>
              )}
            </button>
          </div>
        </div>

        {/* ── Results ── */}
        {playerA && playerB && (
          <div ref={resultRef}>
            {/* Player cards */}
            <div style={{
              display: "flex", gap: 16, marginBottom: 24,
            }}>
              <PlayerCard player={playerA} side="a" visible={visible} />
              <PlayerCard player={playerB} side="b" visible={visible} />
            </div>

            {/* Comparison table */}
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 16,
              backdropFilter: "blur(20px)",
              overflow: "hidden",
              boxShadow: "0 0 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 0.5s ease 0.2s, transform 0.5s ease 0.2s",
            }}>
              {/* Table header */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr auto 1fr",
                background: "rgba(255,255,255,0.03)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ padding: "12px 20px", textAlign: "right" }}>
                  <span style={{ fontSize: 11, color: "#3b82f6", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Orbitron', monospace" }}>
                    {playerA.name}
                  </span>
                </div>
                <div style={{
                  padding: "12px 20px", minWidth: 180, textAlign: "center",
                  borderLeft: "1px solid rgba(255,255,255,0.05)",
                  borderRight: "1px solid rgba(255,255,255,0.05)",
                }}>
                  <span style={{ fontSize: 10, color: "#334155", letterSpacing: 3, textTransform: "uppercase", fontFamily: "'Orbitron', monospace" }}>
                    Metric
                  </span>
                </div>
                <div style={{ padding: "12px 20px", textAlign: "left" }}>
                  <span style={{ fontSize: 11, color: "#f59e0b", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Orbitron', monospace" }}>
                    {playerB.name}
                  </span>
                </div>
              </div>

              {/* Rows */}
              {METRICS.map((metric, i) => (
                <div key={metric.key} style={{
                  borderBottom: i < METRICS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  transition: "background 0.2s",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <MetricRow
                    metric={metric}
                    playerA={playerA}
                    playerB={playerB}
                    visible={visible}
                    delay={i * 60}
                  />
                </div>
              ))}
            </div>

            {/* Winner badge */}
            <WinnerBadge playerA={playerA} playerB={playerB} visible={visible} />
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 64, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#1e293b", letterSpacing: 3, textTransform: "uppercase", fontFamily: "'Orbitron', monospace" }}>
            Brawl Stars Comparator · Analytics Platform
          </div>
        </div>
      </div>
    </div>
  );
}
