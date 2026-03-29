import html2canvas from "html2canvas";
import { useState, useEffect, useRef } from "react";
import { getPlayer } from "./services/api";

// ─── Utilities ────────────────────────────────────────────────────────────────
const fmt = (n) => (typeof n === "number" ? n.toLocaleString() : n);

const compare = (a, b, metric) => {
  const v = { a: a[metric], b: b[metric] };
  if (typeof v.a === "string") {
  if (v.a === v.b) return { a: "neutral", b: "neutral" };

  // Custom logic for championship
  if (metric === "championship") {
    return v.a === "Qualified"
      ? { a: "better", b: "worse" }
      : { a: "worse", b: "better" };
  }

  return { a: "neutral", b: "neutral" };
}
  if (typeof v.a !== "number") return { a: "neutral", b: "neutral" };
  if (v.a > v.b) return { a: "better", b: "worse" };
  if (v.a < v.b) return { a: "worse", b: "better" };
  return { a: "neutral", b: "neutral" };
};

const PLAYING_METRICS = [
  { key: "championship", label: "Championship", icon: "🏆" },
  { key: "trophies", label: "Total Trophies", icon: "◈" },
  { key: "top20Avg", label: "Top 20 Avg", icon: "◉" },
  { key: "bestBrawlerTrophies", label: "Best Brawler", icon: "◆" },
  { key: "prestigeLevel", label: "Total Prestige", icon: "◇" },
  { key: "prestige1", label: "Prestige I", icon: "Ⅰ" },
  { key: "prestige2", label: "Prestige II", icon: "Ⅱ" },
  { key: "prestige3", label: "Prestige III", icon: "Ⅲ" },
  { key: "wins3v3", label: "3v3 Wins", icon: "▣" },
  { key: "duoWins", label: "2v2 Wins", icon: "▥" },
  { key: "soloWins", label: "1v1 Wins", icon: "▤" },
];

const PROFILE_METRICS = [
  { key: "totalBrawlers", label: "Brawlers Owned", icon: "⬢" },
  { key: "power11Count", label: "Power 11", icon: "◐" },
  { key: "hyperCharges", label: "Hypercharges", icon: "🔥" },
  { key: "buffies", label: "Buffies Owned", icon: "✦" },
  { key: "starPowers", label: "Star Powers", icon: "★" },
  { key: "gadgets", label: "Gadgets", icon: "◑" },
];

// ─── Responsive hook ──────────────────────────────────────────────────────────
function useBreakpoint() {
  const [bp, setBp] = useState("desktop");
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 480)       setBp("mobile");
      else if (w < 768)  setBp("mobileLg");
      else if (w < 1024) setBp("tablet");
      else               setBp("desktop");
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return bp;
}

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

function PlayerCard({ player, side, visible,bp }) {
  const color = side === "a" ? "#3b82f6" : "#f59e0b";
   const isMobile = bp === "mobile" || bp === "mobileLg";
  const initials = player.name.slice(0, 2);

  const iconUrl = `https://cdn.brawlify.com/profile-icons/regular/${player.iconId}.png`;

  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: "rgba(255,255,255,0.03)",
      border: `1px solid ${color}22`,
      borderRadius: 14,
      padding: isMobile ? "16px 14px" : "24px 20px",
      display: "flex", alignItems: "center",
      gap: isMobile ? 12 : 18,
      backdropFilter: "blur(12px)",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(14px)",
      transition: "all 0.5s cubic-bezier(0.4,0,0.2,1)",
      boxShadow: `0 0 32px ${color}08, inset 0 1px 0 ${color}14`,
    }}>

      {/*Avatar*/}
      <div style={{
        width: isMobile ? 40 : 52, height: isMobile ? 40 : 52,
        borderRadius: isMobile ? 10 : 13, flexShrink: 0,
        background: `linear-gradient(135deg,${color}28,${color}0c)`,
        border: `1px solid ${color}38`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: isMobile ? 14 : 18, fontWeight: 800, color,
        fontFamily: "'Orbitron', monospace",
      }}>
        <img 
          src={iconUrl} 
          alt="Profile Icon"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => { e.target.src = "https://cdn.brawlify.com/profile-icons/regular/28000000.png"; }}
        />
      </div>

      {/* Name block */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: isMobile ? 8 : 10, color: color + "99",
          letterSpacing: isMobile ? 2 : 3, textTransform: "uppercase",
          marginBottom: 3, fontFamily: "'Orbitron', monospace",
        }}>
          {side === "a" ? "Player A" : "Player B"}
        </div>
        <div style={{
          fontSize: isMobile ? 14 : 17, fontWeight: 700, color: "#f1f5f9",
          fontFamily: "'Rajdhani', sans-serif",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {player.name}
        </div>
        {!isMobile && (
          <div style={{ fontSize: 11, color: "#475569", fontFamily: "'Share Tech Mono', monospace", marginTop: 2 }}>
            {player.tag}
          </div>
        )}
      </div>

      {/* Trophy count */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{
          fontSize: isMobile ? 16 : 22, fontWeight: 900, color,
          fontFamily: "'Orbitron', monospace", lineHeight: 1,
        }}>
          {fmt(player.trophies)}
        </div>
        <div style={{ fontSize: 9, color: "#475569", letterSpacing: 2, textTransform: "uppercase", marginTop: 3 }}>
          trophies
        </div>
      </div>
    </div>
  );
}

// ─── Metric row (desktop/tablet) ──────────────────────────────────────────────
function MetricRowWide({ metric, playerA, playerB, visible, delay, isSmall}) {
  const result = compare(playerA, playerB, metric.key);
  const valA = playerA[metric.key];
  const valB = playerB[metric.key];

  const displayA =
  metric.key === "bestBrawlerTrophies"
    ? `${playerA.bestBrawler} (${playerA.bestBrawlerTrophies})`
    : fmt(valA);

const displayB =
  metric.key === "bestBrawlerTrophies"
    ? `${playerB.bestBrawler} (${playerB.bestBrawlerTrophies})`
    : fmt(valB);

  const isNum = typeof valA === "number";
  const maxVal = isNum ? Math.max(valA, valB, 1) : 1;

  const colorFor = (side) => {
    const r = side === "a" ? result.a : result.b;
    return r === "better" ? "#4ade80" : r === "worse" ? "#f87171" : "#64748b";
  };
  const arrow = (side) => {
    const r = side === "a" ? result.a : result.b;
    if (r === "better") return <span style={{ color: "#4ade80", fontSize: 9, marginLeft: 5, fontFamily: "'Orbitron', monospace" }}>▲</span>;
    if (r === "worse")  return <span style={{ color: "#f87171", fontSize: 9, marginLeft: 5, fontFamily: "'Orbitron', monospace" }}>▼</span>;
    return null;
  };


  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 160px 1fr",
      alignItems: "center", gap: 0,
      padding: "0 2px",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateX(0)" : "translateX(-20px)",
      transition: `opacity 0.4s ease ${delay}ms, transform 0.4s ease ${delay}ms`,
    }}>
      {/* Player A */}
      <div style={{ padding: isSmall ? "12px 14px" : "16px 24px", textAlign: "right" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
          <span style={{
            fontSize: 15, fontWeight: result.a === "better" ? 700 : 500,
            color: colorFor("a"),
            fontFamily: isNum ? "'Share Tech Mono', monospace" : "'Rajdhani', sans-serif",
            textShadow: result.a === "better" ? `0 0 12px ${colorFor("a")}66` : "none",
            transition: "all 0.3s",
          }}>
            {displayA}
          </span>
          {arrow("a")}
        </div>
        {isNum && <StatBar value={valA} max={maxVal} color={result.a === "better" ? "#3b82f6" : "#1e3a5f"} />}
      </div>

      {/* Metric Label */}
      <div style={{
        padding: "13px 12px", textAlign: "center",
        borderLeft: "1px solid rgba(255,255,255,0.04)",
        borderRight: "1px solid rgba(255,255,255,0.04)",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
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
      <div style={{ padding: isSmall ? "12px 14px" : "16px 24px", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {arrow("b")}
          <span style={{
            fontSize: 15, fontWeight: result.b === "better" ? 700 : 500,
            color: colorFor("b"),
            fontFamily: isNum ? "'Share Tech Mono', monospace" : "'Rajdhani', sans-serif",
            textShadow: result.b === "better" ? `0 0 12px ${colorFor("b")}66` : "none",
            transition: "all 0.3s",
          }}>
            {displayB}
          </span>
        </div>
        {isNum && <StatBar value={valB} max={maxVal} color={result.b === "better" ? "#f59e0b" : "#3d2e00"} />}
      </div>
    </div>
  );
}

// ─── Metric row (mobile — stacked card) ──────────────────────────────────────
function MetricRowMobile({ metric, playerA, playerB, visible, delay }) {
  const result = compare(playerA, playerB, metric.key);
  const valA = playerA[metric.key];
  const valB = playerB[metric.key];

  const displayA =
  metric.key === "bestBrawlerTrophies"
    ? `${playerA.bestBrawler} (${playerA.bestBrawlerTrophies})`
    : fmt(valA);

const displayB =
  metric.key === "bestBrawlerTrophies"
    ? `${playerB.bestBrawler} (${playerB.bestBrawlerTrophies})`
    : fmt(valB);

  const isNum = typeof valA === "number";
  const maxVal = isNum ? Math.max(valA, valB, 1) : 1;

  const colorFor = (side) => {
    const r = side === "a" ? result.a : result.b;
    return r === "better" ? "#4ade80" : r === "worse" ? "#f87171" : "#64748b";
  };
  const arrow = (side) => {
    const r = side === "a" ? result.a : result.b;
    if (r === "better") return <span style={{ color: "#4ade80", fontSize: 8, fontFamily: "'Orbitron',monospace" }}> ▲</span>;
    if (r === "worse")  return <span style={{ color: "#f87171", fontSize: 8, fontFamily: "'Orbitron',monospace" }}> ▼</span>;
    return null;
  };

   return (
    <div style={{
      padding: "12px 14px",
      opacity: visible ? 1 : 0,
      transform: visible ? "none" : "translateY(8px)",
      transition: `opacity 0.35s ease ${delay}ms, transform 0.35s ease ${delay}ms`,
    }}>
      {/* Metric label */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
      }}>
        <span style={{ fontSize: 10, color: "#475569", fontFamily: "'Orbitron',monospace" }}>{metric.icon}</span>
        <span style={{ fontSize: 9, color: "#64748b", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Share Tech Mono',monospace" }}>{metric.label}</span>
      </div>

      {/* Both values side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {/* A */}
        <div style={{
          background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.12)",
          borderRadius: 8, padding: "8px 10px",
        }}>
          <div style={{ fontSize: 8, color: "#3b82f6", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Orbitron',monospace", marginBottom: 4, opacity: 0.7 }}>{playerA.name}</div>
          <div style={{
            fontSize: 13, fontWeight: result.a === "better" ? 700 : 500,
            color: colorFor("a"), fontFamily: isNum ? "'Share Tech Mono',monospace" : "'Rajdhani',sans-serif",
            textShadow: result.a === "better" ? `0 0 8px ${colorFor("a")}55` : "none",
          }}>
            {displayA}{arrow("a")}
          </div>
          {isNum && <StatBar value={valA} max={maxVal} color={result.a === "better" ? "#3b82f6" : "#1e3a5f"} />}
        </div>

        {/* B */}
        <div style={{
          background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)",
          borderRadius: 8, padding: "8px 10px",
        }}>
          <div style={{ fontSize: 8, color: "#f59e0b", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Orbitron',monospace", marginBottom: 4, opacity: 0.7 }}>{playerB.name}</div>
          <div style={{
            fontSize: 13, fontWeight: result.b === "better" ? 700 : 500,
            color: colorFor("b"), fontFamily: isNum ? "'Share Tech Mono',monospace" : "'Rajdhani',sans-serif",
            textShadow: result.b === "better" ? `0 0 8px ${colorFor("b")}55` : "none",
          }}>
            {displayB}{arrow("b")}
          </div>
          {isNum && <StatBar value={valB} max={maxVal} color={result.b === "better" ? "#f59e0b" : "#3d2e00"} />}
        </div>
      </div>
    </div>
  );
}

const ALL_METRICS = [...PLAYING_METRICS, ...PROFILE_METRICS];

function WinnerBadge({ playerA, playerB, visible, bp }) {
  const isMobile = bp === "mobile" || bp === "mobileLg";
 const scoreA = ALL_METRICS.filter(
  m => typeof playerA[m.key] === "number" && playerA[m.key] > playerB[m.key]
).length;

const scoreB = ALL_METRICS.filter(
  m => typeof playerB[m.key] === "number" && playerB[m.key] > playerA[m.key]
).length;
  const winner = scoreA > scoreB ? playerA.name : scoreB > scoreA ? playerB.name : null;
  const side = scoreA > scoreB ? "a" : scoreB > scoreA ? "b" : null;
  const color = side === "a" ? "#3b82f6" : side === "b" ? "#f59e0b" : "#94a3b8";

  return (
    <div style={{
      marginTop: 24, display: "flex", justifyContent: "center",
      opacity: visible ? 1 : 0,
      transition: "opacity 0.5s ease 0.7s",
    }}>
      <div style={{
        background: `linear-gradient(135deg,${color}14,${color}06)`,
        border: `1px solid ${color}2e`,
        borderRadius: 12, padding: isMobile ? "14px 28px" : "16px 44px",
        textAlign: "center", backdropFilter: "blur(12px)",
        boxShadow: `0 0 32px ${color}12`,
      }}>
        <div style={{ fontSize: 9, color: "#475569", letterSpacing: 3, textTransform: "uppercase", marginBottom: 6, fontFamily: "'Orbitron',monospace" }}>
          Analysis Complete
        </div>
        {winner ? (
          <>
            <div style={{
              fontSize: isMobile ? 15 : 18, fontWeight: 800, color,
              fontFamily: "'Orbitron',monospace", letterSpacing: 1,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              maxWidth: isMobile ? 200 : "none",
            }}>
              {winner}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, fontFamily: "'Share Tech Mono',monospace" }}>
             wins {Math.max(scoreA, scoreB)} / {
  ALL_METRICS.filter(m => typeof playerA[m.key] === "number").length
} metrics
            </div>
          </>
        ) : (
          <div style={{ fontSize: 16, fontWeight: 700, color: "#64748b", fontFamily: "'Orbitron',monospace" }}>DRAW</div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tagA, setTagA] = useState("");
  const [tagB, setTagB] = useState("");
  const [playerA, setPlayerA] = useState(null);
  const [playerB, setPlayerB] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  const [focA, setFocA] = useState(false);
  const [focB, setFocB] = useState(false);
  const [hoverBtn, setHoverBtn] = useState(false);
  const resultRef = useRef(null);
  const bp = useBreakpoint();

const isMobile = bp === "mobile";
const isMobileLg = bp === "mobileLg";
const isTablet = bp === "tablet";
const isSmall = isMobile || isMobileLg;

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;800;900&family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  const handleCompare = async () => {
    // 1. Basic validation
    if (!tagA.trim() || !tagB.trim()) {
      setError("Please enter both player tags.");
      return;
    }

    // 2. Reset states for a new search
    setLoading(true);
    setError("");
    setVisible(false); // Reset animation so it can trigger again

    try {
      const cleanTagA = tagA.replace("#", "");
      const cleanTagB = tagB.replace("#", "");

      // 3. Fetch data
      const [a, b] = await Promise.all([
        getPlayer(cleanTagA),
        getPlayer(cleanTagB)
      ]);

      // 4. Data Transformation with safety guards
      const transformPlayer = (p) => {
  if (!p || !p.brawlers) throw new Error("Invalid player data received");

  const brawlers = p.brawlers || [];

  // ✅ BEST BRAWLER (FIXED)
  const best = brawlers.length > 0
    ? brawlers.reduce((best, curr) =>
        curr.trophies > best.trophies ? curr : best
      )
    : null;

  return {
    name: p.name,
    tag: p.tag,
    iconId: p.icon?.id || 28000000,
    trophies: p.trophies,

    top20Avg: (() => {
      const sorted = [...brawlers].sort((a, b) => b.trophies - a.trophies);
      const top = sorted.slice(0, 20);
      return top.length > 0
        ? Math.floor(top.reduce((s, b) => s + b.trophies, 0) / top.length)
        : 0;
    })(),

    // ✅ FIXED BEST BRAWLER
    bestBrawler: best ? best.name : "N/A",
    bestBrawlerTrophies: best ? best.trophies : 0,

    prestigeLevel: p.totalPrestigeLevel || 0,
    wins3v3: p["3vs3Victories"] || 0,
    soloWins: p.soloVictories || 0,
    duoWins: p.duoVictories || 0,

    totalBrawlers: brawlers.length,

    championship: p.isQualifiedFromChampionshipChallenge ? "Qualified" : "No",

    power11Count: brawlers.filter(b => b.power === 11).length,

    gadgets: brawlers.reduce((s, b) => s + (b.gadgets?.length || 0), 0),
    starPowers: brawlers.reduce((s, b) => s + (b.starPowers?.length || 0), 0),

    hyperCharges: brawlers.reduce((total, b) => {
      if (Array.isArray(b.hyperCharges)) {
        return total + b.hyperCharges.length;
      }
      return total;
    }, 0),

    prestige1: brawlers.filter(b => b.prestigeLevel === 1).length,
    prestige2: brawlers.filter(b => b.prestigeLevel === 2).length,
    prestige3: brawlers.filter(b => b.prestigeLevel === 3).length,

    buffies: brawlers.reduce((total, b) => {
      let count = 0;
      if (b.buffies?.gadget) count++;
      if (b.buffies?.starPower) count++;
      if (b.buffies?.hyperCharge) count++;
      return total + count;
    }, 0),
  };
};

      const playerAlpha = transformPlayer(a);
      const playerBeta = transformPlayer(b);

      setPlayerA(playerAlpha);
      setPlayerB(playerBeta);

      // 5. Trigger Entrance Animation
      // A small timeout ensures the elements exist in DOM before changing opacity
      setTimeout(() => {
        setVisible(true);
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);

    } catch (err) {
      setError("Failed to fetch player data. Please check the tags.");
      console.error("Comparison Error:", err);
    } finally {
      // 6. Stop loading spinner
      setLoading(false);
    }
  };
  const inputStyle = (focused) => ({
    width: "100%",
    background: focused ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
    border: `1px solid ${focused ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.08)"}`,
    borderRadius: 10, padding: isSmall ? "12px 14px" : "13px 18px",
    fontSize: isSmall ? 13 : 14,
    color: "#e2e8f0", fontFamily: "'Share Tech Mono', monospace",
    outline: "none", transition: "all 0.2s ease", letterSpacing: 1,
    boxShadow: focused ? "0 0 0 3px rgba(59,130,246,0.1)" : "none",
  });

  const downloadBriefing = async () => {
  const element = document.getElementById("capture-area");
  if (!element) return;

  // We temporarily disable transitions for a cleaner snapshot
  element.style.transition = "none";

  const canvas = await html2canvas(element, {
    backgroundColor: "#060a14", // Matches your app bg
    scale: 2, // Higher quality/resolution
    logging: false,
    useCORS: true, // Crucial for loading Brawlify CDN images
    allowTaint: true,
  });

  const image = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = image;
  link.download = `Brawl-Briefing-${playerA.tag}-${playerB.tag}.png`;
  link.click();
};

function MetricsSection({ title, metrics, playerA, playerB, visible, isSmall }) {
  return (
    <div style={{ marginTop: 20 }}>
      
      {/* Section Title */}
      <div style={{
        fontSize: 10,
        color: "#94a3b8",
        letterSpacing: 3,
        textTransform: "uppercase",
        marginBottom: 10,
        fontFamily: "'Orbitron', monospace",
        textAlign: "center"
      }}>
        {title}
      </div>

      {/* Rows */}
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        overflow: "hidden",
      }}>
        {metrics.map((metric, i) => (
          <div key={metric.key} style={{
            borderBottom: i < metrics.length - 1 ? "1px solid rgba(255,255,255,0.035)" : "none",
          }}>
            {isSmall ? (
              <MetricRowMobile
                metric={metric}
                playerA={playerA}
                playerB={playerB}
                visible={visible}
                delay={i * 50}
                isSmall={isSmall}
              />
            ) : (
              <MetricRowWide
                metric={metric}
                playerA={playerA}
                playerB={playerB}
                visible={visible}
                delay={i * 55}
                isSmall={isSmall}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

  return (
    <div style={{
      minHeight: "100vh", background: "#060a14",
      color: "#e2e8f0", fontFamily: "'Rajdhani', sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        ::placeholder{color:#334155;font-family:'Share Tech Mono',monospace;font-size:12px;}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-track{background:#0a0f1e;}
        ::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:3px;}
        @keyframes pulse-ring{0%,100%{opacity:.4}50%{opacity:.9}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      <Scanline />
      <GridBg />
      <GlowOrb color="radial-gradient(circle,#1d4ed8,transparent)" x="15%" y="20%" size={isSmall ? 300 : 600} />
      <GlowOrb color="radial-gradient(circle,#b45309,transparent)"  x="85%" y="70%" size={isSmall ? 260 : 500} />

      <div style={{
        position: "relative", zIndex: 10,
        maxWidth: isTablet ? 900 : isSmall ? "100%" : 1100,
width: "100%", margin: "0 auto",
        padding: isSmall ? "0 16px 60px" : isTablet ? "0 20px 70px" : "0 24px 80px",
      }}>

        {/* ── Header ── */}
        <div style={{
          paddingTop: isSmall ? 44 : 64,
          paddingBottom: isSmall ? 32 : 48,
          textAlign: "center",
          animation: "fadeUp 0.8s ease both",
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: 6, padding: "5px 14px", marginBottom: isSmall ? 18 : 24,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#f59e0b", boxShadow: "0 0 8px #f59e0b", animation: "pulse-ring 2s infinite" }} />
            <span style={{ fontSize: 10, color: "#f59e0b", letterSpacing: 3, textTransform: "uppercase", fontFamily: "'Orbitron',monospace" }}>
              STATS BRAWLIFIED
            </span>
          </div>

          <h1 style={{
            fontSize: isMobile ? 26 : isMobileLg ? 32 : isTablet ? 40 : 48,
            fontWeight: 900, fontFamily: "'Orbitron',monospace",
            lineHeight: 1.15, marginBottom: isSmall ? 10 : 12,
            background: "linear-gradient(135deg,#f1f5f9 30%,#94a3b8)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            BRAWL STARS
            <br />
            <span style={{
              background: "linear-gradient(90deg,#f59e0b,#fbbf24)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>COMPARATOR</span>
          </h1>

          <p style={{
            fontSize: isSmall ? 10 : 13, color: "#475569",
            letterSpacing: isSmall ? 1.5 : 2, textTransform: "uppercase",
            fontFamily: "'Share Tech Mono',monospace",
          }}>
            Compare performance. Find the stronger player.
          </p>
        </div>


        {/* ── Input Section ── */}
        <div style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 16, padding: isSmall ? "20px 16px" : "28px 28px",
          backdropFilter: "blur(20px)",
          marginBottom: 24,
          animation: "fadeUp 0.8s ease 0.12s both",
          boxShadow: "0 0 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}>
          <div style={{
            fontSize: 9, color: "#334155", letterSpacing: 3,
            textTransform: "uppercase", marginBottom: isSmall ? 14 : 18,
            fontFamily: "'Orbitron',monospace",
          }}>Player Tags</div>

          {isSmall ? (
            // ── Mobile: stacked ──
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 9, color: "#3b82f6", letterSpacing: 2, marginBottom: 7, fontFamily: "'Orbitron',monospace", textTransform: "uppercase" }}>◈ PLAYER A</div>
                <input value={tagA} onChange={e => setTagA(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCompare()}
                  onFocus={() => setFocA(true)} onBlur={() => setFocA(false)}
                  placeholder="#PLAYER1TAG" style={inputStyle(focA)} />
              </div>

              {/* VS divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
                <div style={{
                  width: 36, height: 36, border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800, color: "#334155",
                  fontFamily: "'Orbitron',monospace", letterSpacing: 1,
                  background: "rgba(255,255,255,0.02)", flexShrink: 0,
                }}>VS</div>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }} />
              </div>

              <div>
                <div style={{ fontSize: 9, color: "#f59e0b", letterSpacing: 2, marginBottom: 7, fontFamily: "'Orbitron',monospace", textTransform: "uppercase" }}>◈ PLAYER B</div>
                <input value={tagB} onChange={e => setTagB(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCompare()}
                  onFocus={() => setFocB(true)} onBlur={() => setFocB(false)}
                  placeholder="#PLAYER2TAG" style={inputStyle(focB)} />
              </div>
            </div>
          ) : (
            // ── Tablet / Desktop: side-by-side ──
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: "#3b82f6", letterSpacing: 2, marginBottom: 7, fontFamily: "'Orbitron',monospace", textTransform: "uppercase" }}>◈ PLAYER A</div>
                <input value={tagA} onChange={e => setTagA(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCompare()}
                  onFocus={() => setFocA(true)} onBlur={() => setFocA(false)}
                  placeholder="#PLAYER1TAG" style={inputStyle(focA)} />
              </div>

              <div style={{
                flexShrink: 0, width: 40, height: 40, marginBottom: 1,
                border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 800, color: "#334155",
                fontFamily: "'Orbitron',monospace", background: "rgba(255,255,255,0.02)",
              }}>VS</div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 9, color: "#f59e0b", letterSpacing: 2, marginBottom: 7, fontFamily: "'Orbitron',monospace", textTransform: "uppercase" }}>◈ PLAYER B</div>
                <input value={tagB} onChange={e => setTagB(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCompare()}
                  onFocus={() => setFocB(true)} onBlur={() => setFocB(false)}
                  placeholder="#PLAYER2TAG" style={inputStyle(focB)} />
              </div>
            </div>
          )}

          {error && (
            <div style={{ marginTop: 10, fontSize: 11, color: "#f87171", fontFamily: "'Share Tech Mono',monospace", letterSpacing: 1 }}>
              ✕ {error}
            </div>
          )}

          {/* Compare button */}
         <div style={{ marginTop: 20, display: "flex", justifyContent: isSmall ? "stretch" : "flex-end" }}>
            <button onClick={handleCompare} disabled={loading}
              style={{
                width: isSmall ? "100%" : "auto",
                background: loading ? "rgba(245,158,11,0.14)" : "linear-gradient(135deg,#b45309,#d97706)",
                border: "1px solid rgba(245,158,11,0.3)",
                borderRadius: 10, padding: isSmall ? "13px 0" : "13px 40px",
                fontSize: 12, fontWeight: 700,
                color: loading ? "#92400e" : "#0a0f1e",
                fontFamily: "'Orbitron',monospace", letterSpacing: 2,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              }}
              onMouseEnter={e => {
                if (!loading) {
                  e.currentTarget.style.background = "linear-gradient(135deg,#d97706,#f59e0b)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 28px rgba(245,158,11,0.22)";
                }
              }}
              onMouseLeave={e => {
                if (!loading) {
                  e.currentTarget.style.background = "linear-gradient(135deg,#b45309,#d97706)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 13, height: 13, border: "2px solid #92400e", borderTopColor: "#f59e0b", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  ANALYZING
                </>
              ) : <>◈ COMPARE</>}
            </button>
          </div>
        </div>


        {/* ── Results ── */}
        {playerA && playerB && (
          <div
  id="capture-area"
  ref={resultRef}
  style={{
    padding: isMobile ? "12px" : "24px",
    maxWidth: 1100,
    margin: "0 auto",
  }}
> 
            {/* Player cards — stacked on mobile */}
            <div style={{
              display: "flex",
              flexDirection: isSmall ? "column" : "row",
              gap: 14, marginBottom: 18,
            }}>
              <PlayerCard player={playerA} side="a" visible={visible} bp={bp} />
              <PlayerCard player={playerB} side="b" visible={visible} bp={bp} />
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
              {!isSmall ? (
                <div style={{
                  display: "grid", gridTemplateColumns: isTablet ? "1fr 120px 1fr" : "1fr 160px 1fr",
                  background: "rgba(255,255,255,0.025)",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}>
                  <div style={{ padding: "11px 18px", textAlign: "right" }}>
                    <span style={{ fontSize: 11, color: "#3b82f6", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Orbitron',monospace" }}>{playerA.name}</span>
                  </div>
                  <div style={{ padding: "11px 12px", textAlign: "center", borderLeft: "1px solid rgba(255,255,255,0.04)", borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: 9, color: "#91a0b6", letterSpacing: 3, textTransform: "uppercase", fontFamily: "'Share Tech Mono',monospace" }}>Metric</span>
                  </div>
                  <div style={{ padding: "11px 18px" }}>
                    <span style={{ fontSize: 11, color: "#f59e0b", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'Orbitron',monospace" }}>{playerB.name}</span>
                  </div>
                </div>
              ) : (
                /* Mobile header — show both names */
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.025)",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}>
                  <span style={{ fontSize: 10, color: "#3b82f6", letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'Orbitron',monospace" }}>{playerA.name}</span>
                  <span style={{ fontSize: 8, color: "#334155", letterSpacing: 2, fontFamily: "'Share Tech Mono',monospace" }}>VS</span>
                  <span style={{ fontSize: 10, color: "#f59e0b", letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'Orbitron',monospace" }}>{playerB.name}</span>
                </div>
              )}


              {/* Rows */}
              <MetricsSection
  title="🎮 Playing Performance"
  metrics={PLAYING_METRICS}
  playerA={playerA}
  playerB={playerB}
  visible={visible}
  isSmall={isSmall}
/>

<MetricsSection
  title="💎 Profile Strength"
  metrics={PROFILE_METRICS}
  playerA={playerA}
  playerB={playerB}
  visible={visible}
  isSmall={isSmall}
/>
            </div>

            {/* Winner badge */}
            <WinnerBadge playerA={playerA} playerB={playerB} visible={visible} bp={bp}/>
          </div>
        )}

      {playerA && playerB && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 20 }}>
  <button
    onClick={downloadBriefing}
    style={{
      background: "transparent",
      border: "1px solid rgba(255,255,255,0.2)",
      borderRadius: 8,
      padding: "10px 20px",
      color: "#94a3b8",
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: 12,
      cursor: "pointer",
      letterSpacing: 2,
      transition: "all 0.3s"
    }}
    onMouseEnter={(e) => e.currentTarget.style.borderColor = "#3b82f6"}
    onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"}
  >
    [DOWNLOAD_TACTICAL_BRIEFING.PNG]
  </button>
</div>
      )}
        {/* Footer */}
       <div style={{ marginTop: 56, textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "#1e293b", letterSpacing: 3, textTransform: "uppercase", fontFamily: "'Orbitron',monospace" }}>
            Brawl Stars Comparator · Analytics Platform
          </div>
        </div>
      </div>
    </div>
  );
}
