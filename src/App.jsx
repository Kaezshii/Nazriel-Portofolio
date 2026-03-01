import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, useScroll, useTransform, useSpring, useMotionValue, AnimatePresence, useAnimation } from "framer-motion";

// ============================================================
// DEPTH CONTROLLER — Central scroll-driven system
// ============================================================
function useDepthController() {
  const { scrollYProgress } = useScroll();
  const rawDepth = useMotionValue(0);

  useEffect(() => {
    return scrollYProgress.onChange((v) => rawDepth.set(v));
  }, [scrollYProgress, rawDepth]);

  const depth = useSpring(rawDepth, { stiffness: 60, damping: 20 });

  const bgTop = useTransform(depth, [0, 0.2, 0.5, 0.8, 1], [
    "#87CEEB", "#1a4a6e", "#0a2a4a", "#051520", "#020a0f"
  ]);
  const bgBottom = useTransform(depth, [0, 0.2, 0.5, 0.8, 1], [
    "#1a6fa0", "#0d3a5c", "#061828", "#030e18", "#010508"
  ]);
  const brightness = useTransform(depth, [0, 0.5, 1], [1, 0.7, 0.4]);
  const particleDensity = useTransform(depth, [0, 0.5, 1], [0.3, 0.7, 1]);
  const islandOpacity = useTransform(depth, [0, 0.18, 0.28], [1, 0.4, 0]);
  const islandY = useTransform(depth, [0, 0.3], [0, -120]);

  return { depth, bgTop, bgBottom, brightness, particleDensity, islandOpacity, islandY, scrollYProgress };
}

// ============================================================
// PARTICLE SYSTEM
// ============================================================
const Particle = ({ depth, index }) => {
  const x = useMemo(() => Math.random() * 100, []);
  const delay = useMemo(() => Math.random() * 8, []);
  const size = useMemo(() => Math.random() * 3 + 1, []);
  const duration = useMemo(() => Math.random() * 12 + 8, []);
  const opacity = useTransform(depth, [0, 0.3, 1], [0.15, 0.4, 0.7]);

  return (
    <motion.div
      style={{
        position: "absolute",
        left: `${x}%`,
        bottom: 0,
        width: size,
        height: size,
        borderRadius: "50%",
        background: "rgba(120,200,255,0.6)",
        opacity,
        pointerEvents: "none",
      }}
      animate={{ y: [0, -window.innerHeight - 100] }}
      transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
    />
  );
};

const ParticleField = ({ depth, count = 40 }) => (
  <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1, overflow: "hidden" }}>
    {Array.from({ length: count }, (_, i) => <Particle key={i} depth={depth} index={i} />)}
  </div>
);

// ============================================================
// FISH ENTITIES
// ============================================================
const FishSilhouette = ({ size = 30, y, delay, depth, minDepth = 0, maxDepth = 1, direction = 1 }) => {
  const opacity = useTransform(depth, [minDepth - 0.05, minDepth + 0.05, maxDepth - 0.05, maxDepth], [0, 0.5, 0.5, 0]);
  const scale = useTransform(depth, [minDepth, maxDepth], [0.8, 1.2]);

  return (
    <motion.div
      style={{
        position: "fixed",
        top: `${y}%`,
        opacity,
        scale,
        pointerEvents: "none",
        zIndex: 2,
      }}
      animate={{ x: direction > 0 ? [-200, window.innerWidth + 200] : [window.innerWidth + 200, -200] }}
      transition={{ duration: 18 + delay * 4, delay: delay * 3, repeat: Infinity, ease: "linear" }}
    >
      <svg width={size} height={size * 0.55} viewBox="0 0 60 33" fill="none">
        <path
          d={direction > 0
            ? "M0 16 Q10 8 20 10 Q30 4 45 8 Q55 10 60 16 Q55 22 45 24 Q30 28 20 22 Q10 24 0 16Z M45 8 Q52 4 58 0 Q56 8 55 16 Q56 24 58 32 Q52 28 45 24Z"
            : "M60 16 Q50 8 40 10 Q30 4 15 8 Q5 10 0 16 Q5 22 15 24 Q30 28 40 22 Q50 24 60 16Z M15 8 Q8 4 2 0 Q4 8 5 16 Q4 24 2 32 Q8 28 15 24Z"
          }
          fill="rgba(10,60,100,0.7)"
        />
      </svg>
    </motion.div>
  );
};

const SharkSilhouette = ({ depth }) => {
  const opacity = useTransform(depth, [0.55, 0.65, 0.85, 0.95], [0, 0.18, 0.18, 0]);

  return (
    <motion.div
      style={{
        position: "fixed",
        bottom: "20%",
        opacity,
        pointerEvents: "none",
        zIndex: 2,
      }}
      animate={{ x: [-400, window.innerWidth + 400] }}
      transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
    >
      <svg width={220} height={80} viewBox="0 0 220 80" fill="none">
        <path d="M0 40 Q20 30 50 32 Q80 20 130 30 Q160 24 190 35 Q210 38 220 40 Q210 45 190 50 Q160 58 130 52 Q80 60 50 50 Q20 55 0 40Z" fill="rgba(5,25,45,0.5)" />
        <path d="M100 30 Q110 10 120 5 Q115 20 118 32" fill="rgba(5,25,45,0.5)" />
        <path d="M160 35 Q170 25 178 22 Q174 32 176 38" fill="rgba(5,25,45,0.4)" />
        <path d="M190 50 Q205 55 215 65 Q202 55 190 52" fill="rgba(5,25,45,0.4)" />
        <path d="M190 35 Q205 25 215 18 Q202 32 190 38" fill="rgba(5,25,45,0.4)" />
      </svg>
    </motion.div>
  );
};

// ============================================================
// LOADING SCREEN
// ============================================================
const LoadingScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("Initializing Experience…");
  const stages = [
    [20, "Loading depth systems…"],
    [45, "Calibrating ocean layers…"],
    [70, "Generating particle fields…"],
    [90, "Synchronizing animations…"],
    [100, "Diving in…"],
  ];

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setProgress(current);
      const found = stages.find(([p]) => p === current);
      if (found) setStage(found[1]);
      if (current >= 100) {
        clearInterval(interval);
        setTimeout(onComplete, 600);
      }
    }, 22);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "linear-gradient(180deg, #0a1628 0%, #051018 50%, #020810 100%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 32,
      }}
    >
      {/* Animated marine silhouettes in background */}
      {[1, -1, 1].map((dir, i) => (
        <motion.div key={i} style={{ position: "absolute", top: `${20 + i * 28}%`, opacity: 0.07 }}
          animate={{ x: dir > 0 ? [-300, window.innerWidth + 300] : [window.innerWidth + 300, -300] }}
          transition={{ duration: 20 + i * 5, repeat: Infinity, ease: "linear" }}>
          <svg width={80 + i * 30} height={36 + i * 10} viewBox="0 0 60 33" fill="none">
            <path d="M0 16 Q10 8 20 10 Q30 4 45 8 Q55 10 60 16 Q55 22 45 24 Q30 28 20 22 Q10 24 0 16Z M45 8 Q52 4 58 0 Q56 8 55 16 Q56 24 58 32 Q52 28 45 24Z" fill="white" />
          </svg>
        </motion.div>
      ))}

      {/* Floating particles */}
      {Array.from({ length: 25 }, (_, i) => (
        <motion.div key={`lp${i}`} style={{
          position: "absolute",
          left: `${Math.random() * 100}%`,
          bottom: 0,
          width: Math.random() * 3 + 1,
          height: Math.random() * 3 + 1,
          borderRadius: "50%",
          background: "rgba(100,180,255,0.5)",
        }}
          animate={{ y: [-window.innerHeight - 50, 0] }}
          transition={{ duration: Math.random() * 10 + 8, delay: Math.random() * 5, repeat: Infinity, ease: "linear" }}
        />
      ))}

      <div style={{ textAlign: "center", position: "relative", zIndex: 2 }}>
        {/* Logo mark */}
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{ marginBottom: 24 }}>
          <svg width={56} height={56} viewBox="0 0 56 56">
            <circle cx={28} cy={28} r={26} stroke="rgba(100,180,255,0.4)" strokeWidth={1.5} fill="none" />
            <circle cx={28} cy={28} r={18} stroke="rgba(100,180,255,0.6)" strokeWidth={1} fill="none" />
            <circle cx={28} cy={28} r={6} fill="rgba(100,180,255,0.8)" />
          </svg>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{
            fontFamily: "'Cormorant Garamond', 'Georgia', serif",
            fontSize: 13,
            letterSpacing: "0.35em",
            color: "rgba(150,210,255,0.85)",
            textTransform: "uppercase",
            fontWeight: 400,
            marginBottom: 8,
          }}>
          {stage}
        </motion.h1>

        {/* Progress bar */}
        <div style={{ width: 280, height: 1, background: "rgba(255,255,255,0.08)", margin: "20px auto 0", position: "relative" }}>
          <motion.div style={{
            position: "absolute", left: 0, top: 0, height: "100%",
            background: "linear-gradient(90deg, rgba(50,130,200,0.6), rgba(100,200,255,0.9))",
            width: `${progress}%`,
            transition: "width 0.1s linear",
          }} />
          <motion.div style={{
            position: "absolute", top: -3, height: 7, width: 7, borderRadius: "50%",
            background: "rgba(150,220,255,0.9)",
            left: `calc(${progress}% - 3.5px)`,
            boxShadow: "0 0 12px rgba(100,200,255,0.8)",
            transition: "left 0.1s linear",
          }} />
        </div>

        <motion.p
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            color: "rgba(100,160,220,0.5)",
            letterSpacing: "0.2em",
            marginTop: 16,
          }}>
          {progress}%
        </motion.p>
      </div>
    </motion.div>
  );
};

// ============================================================
// ISLAND + FISHING ROD (Hero Left)
// ============================================================
const IslandScene = ({ fishingLineEnd, islandOpacity, islandY }) => {
  return (
    <motion.div
      style={{
        position: "relative", width: "100%", height: "100%",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        opacity: islandOpacity,
        y: islandY,
        paddingBottom: "8%",
      }}>
      <svg viewBox="0 0 500 420" style={{ width: "100%", maxWidth: 500, height: "auto" }}>
        {/* Sky glow */}
        <defs>
          <radialGradient id="skyGlow" cx="50%" cy="80%" r="60%">
            <stop offset="0%" stopColor="rgba(135,200,240,0.3)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="sandGrad" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#d4a96a" />
            <stop offset="60%" stopColor="#b8864e" />
            <stop offset="100%" stopColor="#8a5e32" />
          </radialGradient>
          <filter id="sandTexture">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
            <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
            <feBlend in="SourceGraphic" in2="grayNoise" mode="overlay" result="blend" />
            <feComposite in="blend" in2="SourceGraphic" operator="in" />
          </filter>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a6fa0" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0d3a5c" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Water */}
        <ellipse cx={250} cy={390} rx={280} ry={35} fill="url(#waterGrad)" />

        {/* Island body */}
        <ellipse cx={200} cy={355} rx={155} ry={48} fill="url(#sandGrad)" filter="url(#sandTexture)" />
        <ellipse cx={200} cy={352} rx={155} ry={30} fill="#c9975e" opacity={0.5} />

        {/* Sand highlight */}
        <ellipse cx={185} cy={342} rx={90} ry={12} fill="#e8c08a" opacity={0.3} />

        {/* Coconut tree trunk */}
        <motion.g
          animate={{ rotateZ: [-1.5, 1.5, -1.5] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "160px 360px" }}>
          <path d="M160 360 Q158 320 162 280 Q164 250 165 215" stroke="#6b4226" strokeWidth={7} fill="none" strokeLinecap="round" />
          {/* Leaves */}
          <path d="M165 215 Q140 185 110 195 Q135 205 165 215Z" fill="#2d7a3e" opacity={0.9} />
          <path d="M165 215 Q145 190 155 160 Q158 188 165 215Z" fill="#3a9050" opacity={0.9} />
          <path d="M165 215 Q190 178 210 188 Q190 202 165 215Z" fill="#2d7a3e" opacity={0.9} />
          <path d="M165 215 Q195 200 215 215 Q192 212 165 215Z" fill="#3a9050" opacity={0.85} />
          <path d="M165 215 Q150 225 125 218 Q148 218 165 215Z" fill="#2d7a3e" opacity={0.85} />
          {/* Coconuts */}
          <circle cx={163} cy={222} r={5} fill="#8B4513" />
          <circle cx={172} cy={226} r={4} fill="#7a3c10" />
          <circle cx={155} cy={225} r={4.5} fill="#8B4513" />
        </motion.g>

        {/* Stickman */}
        <g transform="translate(235, 305)">
          {/* Head */}
          <circle cx={0} cy={0} r={8} fill="none" stroke="rgba(220,200,180,0.9)" strokeWidth={1.5} />
          {/* Face */}
          <circle cx={-2.5} cy={-1} r={1} fill="rgba(220,200,180,0.9)" />
          <circle cx={2.5} cy={-1} r={1} fill="rgba(220,200,180,0.9)" />
          <path d="M-3 3 Q0 5 3 3" stroke="rgba(220,200,180,0.9)" strokeWidth={1} fill="none" />
          {/* Body */}
          <line x1={0} y1={8} x2={0} y2={32} stroke="rgba(200,185,165,0.9)" strokeWidth={1.5} />
          {/* Legs */}
          <line x1={0} y1={32} x2={-8} y2={50} stroke="rgba(200,185,165,0.9)" strokeWidth={1.5} />
          <line x1={0} y1={32} x2={8} y2={50} stroke="rgba(200,185,165,0.9)" strokeWidth={1.5} />
          {/* Arm holding rod */}
          <line x1={0} y1={14} x2={18} y2={22} stroke="rgba(200,185,165,0.9)" strokeWidth={1.5} />
          {/* Other arm */}
          <line x1={0} y1={14} x2={-12} y2={20} stroke="rgba(200,185,165,0.9)" strokeWidth={1.5} />
          {/* Fishing rod */}
          <line x1={18} y1={22} x2={55} y2={-5} stroke="#8a6040" strokeWidth={2} strokeLinecap="round" />
        </g>

        {/* Fishing line — dynamic SVG path connecting rod tip to photo */}
        <FishingLine start={{ x: 290, y: 300 }} end={fishingLineEnd} />
      </svg>
    </motion.div>
  );
};

// Dynamic fishing line with tension simulation
const FishingLine = ({ start, end }) => {
  if (!end) return null;

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const tension = Math.min(dist / 300, 1);
  const sag = (1 - tension) * 40 + tension * 8;

  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2 + sag;

  const d = `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
  const lineColor = `rgba(200,180,140,${0.5 + tension * 0.35})`;

  return (
    <path
      d={d}
      stroke={lineColor}
      strokeWidth={tension > 0.7 ? 1.2 : 1.5}
      fill="none"
      strokeDasharray={tension > 0.85 ? "4 3" : "none"}
    />
  );
};

// ============================================================
// DRAGGABLE PHOTO with spring physics
// ============================================================
const DraggablePhoto = ({ onPositionChange, containerRef }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 200, damping: 22 });
  const springY = useSpring(y, { stiffness: 200, damping: 22 });
  const scale = useMotionValue(1);
  const isDragging = useRef(false);
  const photoRef = useRef(null);

  const BOUNDS = { x: 120, y: 80 };

  // Idle float
  const floatY = useMotionValue(0);
  useEffect(() => {
    let t = 0;
    const id = setInterval(() => {
      if (!isDragging.current) {
        t += 0.04;
        floatY.set(Math.sin(t) * 6);
      }
    }, 16);
    return () => clearInterval(id);
  }, []);

  const combinedY = useTransform([springY, floatY], ([sy, fy]) => (!isDragging.current ? fy : sy));

  const updateLineEnd = useCallback(() => {
    if (!photoRef.current || !containerRef?.current) return;
    const pRect = photoRef.current.getBoundingClientRect();
    const cRect = containerRef.current.getBoundingClientRect();
    onPositionChange({
      x: (pRect.left + pRect.width / 2 - cRect.left) / cRect.width * 500,
      y: (pRect.top + pRect.height / 2 - cRect.top) / cRect.height * 420,
    });
  }, [onPositionChange, containerRef]);

  useEffect(() => {
    const unsubX = springX.onChange(updateLineEnd);
    const unsubY = springY.onChange(updateLineEnd);
    updateLineEnd();
    return () => { unsubX(); unsubY(); };
  }, [springX, springY, updateLineEnd]);

  const handleDragStart = () => {
    isDragging.current = true;
    scale.set(1.08);
  };

  const handleDragEnd = () => {
    isDragging.current = false;
    x.set(0); y.set(0);
    scale.set(1);
  };

  return (
    <motion.div
      ref={photoRef}
      drag
      dragConstraints={{ left: -BOUNDS.x, right: BOUNDS.x, top: -BOUNDS.y, bottom: BOUNDS.y }}
      dragElastic={0.15}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDrag={updateLineEnd}
      style={{
        x: springX, y: combinedY, scale,
        cursor: "grab",
        touchAction: "none",
        userSelect: "none",
      }}
      whileTap={{ cursor: "grabbing" }}>
      <div style={{
        width: 140,
        height: 140,
        borderRadius: "50%",
        background: "linear-gradient(135deg, rgba(30,100,160,0.4), rgba(10,50,90,0.3))",
        border: "2px solid rgba(100,180,255,0.5)",
        boxShadow: "0 0 30px rgba(60,150,255,0.3), 0 0 60px rgba(30,100,200,0.15), inset 0 0 20px rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Placeholder portrait */}
        <svg width={90} height={90} viewBox="0 0 90 90" fill="none">
          <circle cx={45} cy={32} r={18} fill="rgba(150,210,255,0.4)" />
          <path d="M12 82 Q12 55 45 55 Q78 55 78 82" fill="rgba(150,210,255,0.35)" />
        </svg>
        {/* Glare overlay */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)",
          pointerEvents: "none",
        }} />
        {/* Drag hint */}
        <motion.div
          style={{
            position: "absolute", bottom: -28,
            fontSize: 10, letterSpacing: "0.15em",
            color: "rgba(120,190,255,0.6)",
            fontFamily: "'Space Mono', monospace",
            whiteSpace: "nowrap",
          }}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity }}>
          drag me
        </motion.div>
      </div>
    </motion.div>
  );
};

// ============================================================
// WAVES (Hero Right)
// ============================================================
const WaveLayer = ({ amplitude, speed, yOffset, opacity, color }) => {
  return (
    <motion.div
      style={{ position: "absolute", bottom: yOffset, left: 0, right: 0, height: 80, opacity }}
      animate={{ x: [0, -80, 0] }}
      transition={{ duration: speed, repeat: Infinity, ease: "easeInOut" }}>
      <svg viewBox="0 0 1200 80" preserveAspectRatio="none" style={{ width: "200%", height: "100%" }}>
        <path
          d={`M0 40 Q150 ${40 - amplitude} 300 40 Q450 ${40 + amplitude} 600 40 Q750 ${40 - amplitude} 900 40 Q1050 ${40 + amplitude} 1200 40 V80 H0Z`}
          fill={color}
        />
      </svg>
    </motion.div>
  );
};

// ============================================================
// LIGHT RAYS
// ============================================================
const LightRays = ({ depth }) => {
  const opacity = useTransform(depth, [0.15, 0.3, 0.6, 0.75], [0, 0.5, 0.5, 0]);

  return (
    <motion.div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", opacity }}>
      {[0, 1, 2, 3, 4].map(i => (
        <motion.div key={i}
          style={{
            position: "absolute",
            top: -50,
            left: `${10 + i * 18}%`,
            width: `${3 + i % 2 * 2}%`,
            height: "110%",
            background: "linear-gradient(180deg, rgba(100,190,255,0.12) 0%, transparent 100%)",
            transformOrigin: "top center",
            transform: `skewX(${-15 + i * 8}deg)`,
          }}
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 3 + i * 0.7, repeat: Infinity, delay: i * 0.5 }}
        />
      ))}
    </motion.div>
  );
};

// ============================================================
// BUBBLES
// ============================================================
const BubbleField = ({ count = 20 }) => (
  <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
    {Array.from({ length: count }, (_, i) => {
      const x = Math.random() * 100;
      const size = Math.random() * 8 + 3;
      const dur = Math.random() * 8 + 6;
      const delay = Math.random() * 10;
      return (
        <motion.div key={i} style={{
          position: "absolute",
          left: `${x}%`,
          bottom: -20,
          width: size,
          height: size,
          borderRadius: "50%",
          border: "1px solid rgba(150,220,255,0.4)",
          background: "rgba(100,180,255,0.05)",
        }}
          animate={{ y: [-500, 0], x: [0, Math.sin(i) * 30, 0] }}
          transition={{ duration: dur, delay, repeat: Infinity, ease: "easeOut" }}
        />
      );
    })}
  </div>
);

// ============================================================
// SKILL CARD
// ============================================================
const SkillCard = ({ title, icon, skills, delay }) => {
  const controls = useAnimation();
  const ref = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) controls.start({ opacity: 1, y: 0 });
    }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [controls]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={controls}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
      whileHover={{ y: -6, boxShadow: "0 20px 60px rgba(30,100,200,0.25)" }}
      style={{
        background: "rgba(10,40,70,0.55)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(80,160,240,0.18)",
        borderRadius: 16,
        padding: "28px 32px",
        position: "relative",
        overflow: "hidden",
        transition: "box-shadow 0.3s ease",
      }}>
      {/* Glow corner */}
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: 80, height: 80,
        background: "radial-gradient(circle at top right, rgba(60,140,255,0.12), transparent)",
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <h3 style={{
          fontFamily: "'Cormorant Garamond', 'Georgia', serif",
          fontSize: 18,
          color: "rgba(180,225,255,0.95)",
          fontWeight: 600,
          letterSpacing: "0.04em",
        }}>{title}</h3>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {skills.map((skill, i) => (
          <motion.span key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={controls}
            transition={{ duration: 0.4, delay: delay + 0.1 + i * 0.05 }}
            style={{
              padding: "5px 14px",
              borderRadius: 20,
              fontSize: 12,
              fontFamily: "'Space Mono', monospace",
              letterSpacing: "0.08em",
              background: "rgba(30,90,160,0.3)",
              border: "1px solid rgba(80,160,240,0.2)",
              color: "rgba(150,210,255,0.85)",
            }}>
            {skill}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
};

// ============================================================
// PROJECT CARD
// ============================================================
const ProjectCard = ({ title, tag, description, points, delay }) => {
  const controls = useAnimation();
  const ref = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) controls.start({ opacity: 1, y: 0 });
    }, { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [controls]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={controls}
      transition={{ duration: 0.8, delay, ease: "easeOut" }}
      whileHover={{ y: -8 }}
      style={{
        background: "rgba(8,30,58,0.7)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(60,140,220,0.2)",
        borderRadius: 20,
        padding: "36px 36px",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
        transition: "box-shadow 0.4s ease",
      }}
      whileHover={{ boxShadow: "0 30px 80px rgba(20,80,180,0.3)" }}>

      {/* Depth texture */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at 80% 20%, rgba(40,100,200,0.08), transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <h3 style={{
          fontFamily: "'Cormorant Garamond', 'Georgia', serif",
          fontSize: 24,
          color: "rgba(200,235,255,0.95)",
          fontWeight: 700,
          lineHeight: 1.2,
        }}>{title}</h3>
        <span style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10,
          letterSpacing: "0.2em",
          color: "rgba(80,160,255,0.7)",
          border: "1px solid rgba(80,160,255,0.25)",
          padding: "4px 12px",
          borderRadius: 20,
          textTransform: "uppercase",
        }}>{tag}</span>
      </div>

      <p style={{
        fontFamily: "'Crimson Text', 'Georgia', serif",
        fontSize: 16,
        color: "rgba(160,210,250,0.7)",
        lineHeight: 1.75,
        marginBottom: 20,
      }}>{description}</p>

      {points && (
        <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
          {points.map((p, i) => (
            <li key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
              <span style={{ color: "rgba(80,160,255,0.6)", marginTop: 3, flexShrink: 0 }}>▸</span>
              <span style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 12,
                color: "rgba(130,195,250,0.7)",
                lineHeight: 1.6,
                letterSpacing: "0.03em",
              }}>{p}</span>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
};

// ============================================================
// RESEARCH STATION (Contact)
// ============================================================
const ResearchStation = () => (
  <div style={{ position: "relative", width: "100%", maxWidth: 700, margin: "0 auto 60px" }}>
    <svg viewBox="0 0 700 300" style={{ width: "100%", height: "auto" }}>
      <defs>
        <radialGradient id="windowGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(100,200,255,0.6)" />
          <stop offset="60%" stopColor="rgba(50,130,220,0.2)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="seabedGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#020c16" />
          <stop offset="100%" stopColor="#010810" />
        </linearGradient>
      </defs>

      {/* Seabed */}
      <path d="M0 260 Q175 240 350 255 Q525 270 700 250 L700 300 H0Z" fill="url(#seabedGrad)" />

      {/* Main structure */}
      <rect x={120} y={155} width={460} height={115} rx={8} fill="rgba(8,25,45,0.95)" stroke="rgba(40,90,150,0.4)" strokeWidth={1.5} />

      {/* Central dome */}
      <path d="M295 155 Q350 95 405 155Z" fill="rgba(8,25,50,0.9)" stroke="rgba(40,90,150,0.3)" strokeWidth={1} />

      {/* Legs */}
      <rect x={180} y={270} width={12} height={30} fill="rgba(20,55,90,0.8)" />
      <rect x={260} y={270} width={12} height={30} fill="rgba(20,55,90,0.8)" />
      <rect x={430} y={270} width={12} height={30} fill="rgba(20,55,90,0.8)" />
      <rect x={510} y={270} width={12} height={30} fill="rgba(20,55,90,0.8)" />

      {/* Antenna */}
      <line x1={350} y1={95} x2={350} y2={55} stroke="rgba(60,130,200,0.5)" strokeWidth={1.5} />
      <motion.circle cx={350} cy={52} r={4} fill="rgba(80,180,255,0.8)"
        animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} />

      {/* Windows with glow */}
      {[155, 230, 305, 380, 455, 530].map((x, i) => (
        <g key={i}>
          <motion.rect x={x} y={172} width={30} height={22} rx={5}
            fill="rgba(60,160,255,0.12)"
            stroke="rgba(80,180,255,0.3)"
            strokeWidth={1}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }} />
          <motion.rect x={x} y={172} width={30} height={22} rx={5}
            fill="url(#windowGlow)"
            filter="url(#glow)"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }} />
        </g>
      ))}

      {/* Dome window */}
      <motion.ellipse cx={350} cy={130} rx={30} ry={18} fill="rgba(60,160,255,0.1)"
        stroke="rgba(80,180,255,0.4)" strokeWidth={1}
        animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity }} />

      {/* Seabed texture dots */}
      {Array.from({ length: 30 }, (_, i) => (
        <circle key={i} cx={20 + i * 22} cy={265 + Math.sin(i) * 8} r={1.5} fill="rgba(30,70,110,0.4)" />
      ))}
    </svg>
  </div>
);

const ContactPanel = ({ icon, label, sublabel, href, delay }) => {
  const controls = useAnimation();
  const ref = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) controls.start({ opacity: 1, y: 0 });
    }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [controls]);

  return (
    <motion.a
      ref={ref}
      href={href}
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
      initial={{ opacity: 0, y: 30 }}
      animate={controls}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -4, boxShadow: "0 16px 50px rgba(40,120,220,0.3)" }}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        background: "rgba(8,35,65,0.7)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(60,140,220,0.25)",
        borderRadius: 16,
        padding: "28px 32px",
        textDecoration: "none",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        transition: "box-shadow 0.3s ease",
      }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at center bottom, rgba(40,120,220,0.08), transparent 70%)",
        pointerEvents: "none",
      }} />
      <span style={{ fontSize: 28 }}>{icon}</span>
      <span style={{
        fontFamily: "'Cormorant Garamond', 'Georgia', serif",
        fontSize: 17, fontWeight: 600,
        color: "rgba(180,225,255,0.9)",
        letterSpacing: "0.04em",
      }}>{label}</span>
      {sublabel && (
        <span style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10, letterSpacing: "0.12em",
          color: "rgba(100,170,240,0.55)",
        }}>{sublabel}</span>
      )}
    </motion.a>
  );
};

// ============================================================
// SECTION HEADER
// ============================================================
const SectionHeader = ({ label, title, subtitle }) => {
  const controls = useAnimation();
  const ref = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) controls.start({ opacity: 1, y: 0 });
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [controls]);

  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={controls}
      transition={{ duration: 0.8 }}
      style={{ textAlign: "center", marginBottom: 60 }}>
      <p style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase",
        color: "rgba(80,160,255,0.6)",
        marginBottom: 14,
      }}>{label}</p>
      <h2 style={{
        fontFamily: "'Cormorant Garamond', 'Georgia', serif",
        fontSize: "clamp(32px, 5vw, 52px)",
        fontWeight: 700,
        color: "rgba(200,235,255,0.95)",
        lineHeight: 1.15,
        marginBottom: 16,
        letterSpacing: "-0.01em",
      }}>{title}</h2>
      {subtitle && (
        <p style={{
          fontFamily: "'Crimson Text', 'Georgia', serif",
          fontSize: 17,
          color: "rgba(130,195,250,0.6)",
          maxWidth: 520,
          margin: "0 auto",
          lineHeight: 1.7,
        }}>{subtitle}</p>
      )}
    </motion.div>
  );
};

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [fishingEnd, setFishingEnd] = useState(null);
  const heroRef = useRef(null);
  const { depth, bgTop, bgBottom, brightness, particleDensity, islandOpacity, islandY, scrollYProgress } = useDepthController();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const parallaxX = useSpring(useTransform(mouseX, [-1, 1], [-18, 18]), { stiffness: 80, damping: 30 });
  const parallaxY = useSpring(useTransform(mouseY, [-1, 1], [-10, 10]), { stiffness: 80, damping: 30 });

  const handleMouseMove = useCallback((e) => {
    mouseX.set((e.clientX / window.innerWidth) * 2 - 1);
    mouseY.set((e.clientY / window.innerHeight) * 2 - 1);
  }, [mouseX, mouseY]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  // ── All useTransform calls at top level (Rules of Hooks) ──
  const bgGradient = useTransform(
    [bgTop, bgBottom],
    ([top, bottom]) => `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`
  );
  const bgFilter = useTransform(brightness, b => `brightness(${b})`);
  const scrollIndicatorOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0]);

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Space+Mono:wght@400;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #020810; }
        ::-webkit-scrollbar-thumb { background: rgba(60,130,200,0.4); border-radius: 2px; }
        a { color: inherit; }
      `}</style>

      <AnimatePresence>
        {!loaded && <LoadingScreen key="loader" onComplete={() => setLoaded(true)} />}
      </AnimatePresence>

      {loaded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          style={{ position: "relative" }}>

          {/* ── FIXED BACKGROUND ── */}
          <motion.div style={{
            background: bgGradient,
            position: "fixed", inset: 0, zIndex: 0,
            filter: bgFilter,
          }} />

          {/* ── PARTICLES ── */}
          <ParticleField depth={depth} count={35} />

          {/* ── FISH ENTITIES ── */}
          <FishSilhouette size={22} y={38} delay={0} depth={depth} minDepth={0.12} maxDepth={0.45} direction={1} />
          <FishSilhouette size={18} y={52} delay={2} depth={depth} minDepth={0.15} maxDepth={0.5} direction={-1} />
          <FishSilhouette size={35} y={42} delay={1} depth={depth} minDepth={0.28} maxDepth={0.62} direction={1} />
          <FishSilhouette size={28} y={60} delay={3} depth={depth} minDepth={0.32} maxDepth={0.68} direction={-1} />
          <FishSilhouette size={50} y={65} delay={0.5} depth={depth} minDepth={0.45} maxDepth={0.85} direction={1} />
          <FishSilhouette size={42} y={48} delay={2.5} depth={depth} minDepth={0.5} maxDepth={0.88} direction={-1} />
          <SharkSilhouette depth={depth} />

          {/* ══════════════════════════════════════════════════
              HERO SECTION
          ══════════════════════════════════════════════════ */}
          <section
            ref={heroRef}
            style={{
              position: "relative", zIndex: 10,
              minHeight: "100vh",
              display: "flex", alignItems: "stretch",
              overflow: "hidden",
            }}
            aria-label="Hero section">

            {/* Left: Island */}
            <div style={{
              flex: "0 0 50%", position: "relative",
              display: "flex", alignItems: "flex-end", justifyContent: "center",
              paddingBottom: "5%",
            }}>
              <motion.div style={{ x: parallaxX, y: parallaxY, width: "100%", height: "100%" }}>
                <IslandScene
                  fishingLineEnd={fishingEnd}
                  islandOpacity={islandOpacity}
                  islandY={islandY}
                />
              </motion.div>
            </div>

            {/* Right: Waves + Content */}
            <div style={{
              flex: "0 0 50%", position: "relative",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              paddingTop: 80, paddingBottom: 60,
              paddingLeft: 32, paddingRight: 32,
            }}>
              {/* Wave layers */}
              <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
                <WaveLayer amplitude={22} speed={8} yOffset={0} opacity={0.12} color="rgba(30,120,200,0.5)" />
                <WaveLayer amplitude={18} speed={11} yOffset={20} opacity={0.1} color="rgba(20,100,180,0.4)" />
                <WaveLayer amplitude={28} speed={6} yOffset={-10} opacity={0.08} color="rgba(40,140,220,0.35)" />
              </div>

              {/* Draggable photo — centered in hero right */}
              <div style={{
                position: "absolute",
                top: "50%", left: "30%",
                transform: "translate(-50%, -50%)",
                zIndex: 20,
              }}>
                <DraggablePhoto onPositionChange={setFishingEnd} containerRef={heroRef} />
              </div>

              {/* Overlay text */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.3 }}
                style={{
                  position: "relative", zIndex: 15,
                  textAlign: "left", maxWidth: 420,
                  marginLeft: "auto",
                }}>

                <p style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11, letterSpacing: "0.3em",
                  color: "rgba(80,160,255,0.65)",
                  marginBottom: 16,
                  textTransform: "uppercase",
                }}>Information Technology Student</p>

                <h1 style={{
                  fontFamily: "'Cormorant Garamond', 'Georgia', serif",
                  fontSize: "clamp(38px, 5.5vw, 68px)",
                  fontWeight: 700,
                  color: "rgba(210,240,255,0.97)",
                  lineHeight: 1.05,
                  marginBottom: 20,
                  letterSpacing: "-0.02em",
                }}>
                  Diving Into<br />
                  <span style={{ fontStyle: "italic", color: "rgba(100,180,255,0.85)" }}>What's Possible</span>
                </h1>

                <p style={{
                  fontFamily: "'Crimson Text', 'Georgia', serif",
                  fontSize: 17,
                  color: "rgba(150,210,255,0.65)",
                  lineHeight: 1.75,
                  marginBottom: 36,
                  maxWidth: 360,
                }}>
                  Engineering systems at the intersection of clarity and complexity — from surface interfaces to the deep architecture below.
                </p>

                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <motion.a href="#about"
                    whileHover={{ scale: 1.04, boxShadow: "0 8px 30px rgba(60,150,255,0.35)" }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      padding: "13px 28px",
                      background: "linear-gradient(135deg, rgba(40,100,200,0.8), rgba(20,70,160,0.7))",
                      border: "1px solid rgba(80,160,255,0.4)",
                      borderRadius: 8,
                      color: "rgba(200,235,255,0.95)",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 12, letterSpacing: "0.12em",
                      textDecoration: "none", cursor: "pointer",
                      display: "inline-block",
                    }}>
                    Dive Deeper ↓
                  </motion.a>

                  <motion.a href="#skills"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      padding: "13px 28px",
                      background: "transparent",
                      border: "1px solid rgba(80,160,255,0.3)",
                      borderRadius: 8,
                      color: "rgba(150,210,255,0.8)",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 12, letterSpacing: "0.12em",
                      textDecoration: "none", cursor: "pointer",
                      display: "inline-block",
                    }}>
                    View Skills
                  </motion.a>
                </div>
              </motion.div>

              {/* Scroll indicator */}
              <motion.div
                style={{
                  position: "absolute", bottom: 32,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                  opacity: scrollIndicatorOpacity,
                  zIndex: 15,
                }}>
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    width: 22, height: 36,
                    border: "1.5px solid rgba(100,180,255,0.35)",
                    borderRadius: 11,
                    display: "flex", justifyContent: "center", paddingTop: 6,
                  }}>
                  <motion.div
                    animate={{ y: [0, 10, 0], opacity: [1, 0, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ width: 3, height: 6, borderRadius: 2, background: "rgba(100,180,255,0.6)" }} />
                </motion.div>
                <p style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 9, letterSpacing: "0.25em",
                  color: "rgba(100,170,255,0.4)",
                }}>SCROLL</p>
              </motion.div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════
              ABOUT SECTION
          ══════════════════════════════════════════════════ */}
          <section id="about" style={{
            position: "relative", zIndex: 10,
            padding: "120px clamp(24px, 6vw, 100px)",
            maxWidth: 900,
            margin: "0 auto",
          }} aria-label="About section">

            <LightRays depth={depth} />
            <BubbleField count={15} />

            <SectionHeader
              label="/ 01 — Identity"
              title="Who Navigates These Waters"
              subtitle="A student, a builder, a thinker — charting depth through disciplined curiosity."
            />

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.9 }}
              style={{
                background: "rgba(8,28,52,0.55)",
                backdropFilter: "blur(24px)",
                border: "1px solid rgba(50,120,210,0.15)",
                borderRadius: 20,
                padding: "48px clamp(28px, 5vw, 56px)",
                position: "relative",
                overflow: "hidden",
              }}>

              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 2,
                background: "linear-gradient(90deg, transparent, rgba(80,160,255,0.4), transparent)",
              }} />

              {[
                `I'm an Information Technology student with a genuine passion for understanding how systems work beneath the surface — not just how to use them, but how to build, optimize, and architect them with intention.`,
                `My academic focus spans software development, system design, and the engineering principles that transform functional code into elegant, maintainable systems. I believe the most interesting problems live at the intersection of logic and creativity.`,
                `I approach every challenge as a layered exploration — starting from requirements, descending through architecture, and surfacing with solutions that are both technically rigorous and purposefully designed. Continuous learning is not a habit but a necessity in a field that reinvents itself as rapidly as ours.`,
                `This portfolio itself reflects that philosophy: not just a display of what I know, but a demonstration of how I think, how I build, and how I persist through complexity.`,
              ].map((text, i) => (
                <motion.p key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.12 }}
                  style={{
                    fontFamily: "'Crimson Text', 'Georgia', serif",
                    fontSize: 18,
                    color: "rgba(160,215,255,0.78)",
                    lineHeight: 1.85,
                    marginBottom: i < 3 ? 24 : 0,
                  }}>
                  {text}
                </motion.p>
              ))}
            </motion.div>
          </section>

          {/* ══════════════════════════════════════════════════
              SKILLS SECTION
          ══════════════════════════════════════════════════ */}
          <section id="skills" style={{
            position: "relative", zIndex: 10,
            padding: "120px clamp(24px, 6vw, 100px)",
            maxWidth: 1100,
            margin: "0 auto",
          }} aria-label="Skills section">

            <SectionHeader
              label="/ 02 — Capability"
              title="The Deep Ocean Ecosystem"
              subtitle="Skills cultivated through pressure, iteration, and depth of exploration."
            />

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 24,
            }}>
              <SkillCard
                title="Technical Skills"
                icon="⚙️"
                delay={0}
                skills={["HTML5 & CSS3", "JavaScript ES2024", "React", "Python", "SQL", "REST APIs", "Git & Version Control", "Data Structures", "Algorithms", "System Design"]}
              />
              <SkillCard
                title="Development Tools"
                icon="🔧"
                delay={0.15}
                skills={["VS Code", "Vite", "Node.js", "npm / yarn", "Git & GitHub", "Figma", "Chrome DevTools", "Postman", "Linux CLI", "Docker Fundamentals"]}
              />
              <SkillCard
                title="Core Strengths"
                icon="🧠"
                delay={0.3}
                skills={["Analytical Thinking", "System Architecture", "Attention to Detail", "Rapid Learning", "Problem Decomposition", "Technical Communication", "Clean Code Principles", "Performance Awareness"]}
              />
            </div>
          </section>

          {/* ══════════════════════════════════════════════════
              PROJECTS SECTION
          ══════════════════════════════════════════════════ */}
          <section id="projects" style={{
            position: "relative", zIndex: 10,
            padding: "120px clamp(24px, 6vw, 100px)",
            maxWidth: 1000,
            margin: "0 auto",
          }} aria-label="Projects section">

            <SectionHeader
              label="/ 03 — Engineering"
              title="Constructed With Intent"
              subtitle="Systems designed from the seabed up — each a demonstration of deliberate architecture."
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              <ProjectCard
                title="Deep Ocean Portfolio"
                tag="Live"
                delay={0}
                description="A production-grade interactive portfolio engineered with React, Framer Motion, and a centralized scroll-driven depth controller. Every visual layer responds dynamically to scroll progress."
                points={[
                  "Centralized depth controller interpolating gradients, brightness, particle density, and parallax intensity via scroll progress",
                  "Physics-based draggable photo with spring animation, elastic bounds, real-time fishing line tension simulation, and idle float oscillation",
                  "Scroll-triggered fish entities with size scaling proportional to depth; shark silhouette appearing at deepest skill layer",
                  "Staged loading sequence simulating multi-phase initialization with animated progress indicator",
                  "Layered SVG waves with independent animation speeds and mouse parallax response",
                  "Glassmorphic skill panels with staggered entrance animations via Intersection Observer",
                  "Research station contact section with animated glowing windows and ambient seabed particles",
                  "Full responsiveness from 320px mobile to 4K desktop with memoized event handlers for 60fps performance",
                ]}
              />

              <ProjectCard
                title="Ongoing Development"
                tag="In Progress"
                delay={0.2}
                description="The ocean floor is never fully mapped. Future systems include full-stack applications, algorithmic visualizations, and engineering tools built from first principles."
                points={[
                  "Component-ready project card architecture — new entries require zero structural modification",
                  "Scalable data model: each project is a declarative configuration object",
                  "Depth-tagged categorization system for filtering by domain and technology",
                ]}
              />
            </div>
          </section>

          {/* ══════════════════════════════════════════════════
              CONTACT SECTION — Research Station
          ══════════════════════════════════════════════════ */}
          <section id="contact" style={{
            position: "relative", zIndex: 10,
            padding: "120px clamp(24px, 6vw, 80px) 80px",
            maxWidth: 900,
            margin: "0 auto",
          }} aria-label="Contact section">

            <SectionHeader
              label="/ 04 — Contact"
              title="The Research Station"
              subtitle="Deepest layer. Signal reaches here. Reach out."
            />

            <ResearchStation />

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              style={{
                fontFamily: "'Cormorant Garamond', 'Georgia', serif",
                fontSize: "clamp(20px, 3vw, 28px)",
                fontStyle: "italic",
                fontWeight: 600,
                color: "rgba(170,220,255,0.75)",
                textAlign: "center",
                marginBottom: 56,
                lineHeight: 1.5,
                maxWidth: 580,
                margin: "0 auto 56px",
              }}>
              "The best collaborations begin at depth — where the noise fades and the signal becomes clear."
            </motion.p>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 18,
              marginTop: 56,
            }}>
              <ContactPanel icon="📄" label="Resume" sublabel="Download PDF" href="#" delay={0} />
              <ContactPanel icon="💼" label="LinkedIn" sublabel="Connect" href="https://linkedin.com" delay={0.1} />
              <ContactPanel icon="✉️" label="Email" sublabel="Say hello" href="mailto:hello@example.com" delay={0.2} />
              <ContactPanel icon="🐙" label="GitHub" sublabel="View code" href="https://github.com" delay={0.3} />
            </div>

            {/* Final depth marker */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.5 }}
              style={{
                textAlign: "center",
                marginTop: 100,
                paddingBottom: 60,
              }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 16 }}>
                <div style={{ height: 1, width: 80, background: "rgba(60,130,200,0.25)" }} />
                <svg width={16} height={16} viewBox="0 0 16 16">
                  <circle cx={8} cy={8} r={7} stroke="rgba(80,160,255,0.3)" strokeWidth={1} fill="none" />
                  <circle cx={8} cy={8} r={3} fill="rgba(80,160,255,0.4)" />
                </svg>
                <div style={{ height: 1, width: 80, background: "rgba(60,130,200,0.25)" }} />
              </div>
              <p style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 10, letterSpacing: "0.25em",
                color: "rgba(60,120,200,0.35)",
                textTransform: "uppercase",
              }}>— depth: maximum — signal: strong —</p>
            </motion.div>
          </section>

          {/* ── Scroll progress indicator ── */}
          <motion.div style={{
            position: "fixed", top: 0, left: 0, right: 0, height: 2, zIndex: 9998,
            background: "linear-gradient(90deg, rgba(40,100,200,0.8), rgba(100,200,255,0.9))",
            scaleX: scrollYProgress,
            transformOrigin: "left",
          }} />

          {/* Nav dots */}
          <div style={{
            position: "fixed", right: 24, top: "50%",
            transform: "translateY(-50%)",
            display: "flex", flexDirection: "column", gap: 12,
            zIndex: 9000,
          }}>
            {[["#about", "About"], ["#skills", "Skills"], ["#projects", "Projects"], ["#contact", "Contact"]].map(([href, label]) => (
              <motion.a key={href} href={href}
                title={label}
                whileHover={{ scale: 1.4 }}
                style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "rgba(80,160,255,0.4)",
                  border: "1px solid rgba(80,160,255,0.3)",
                  display: "block",
                  textDecoration: "none",
                  transition: "background 0.3s",
                }}
              />
            ))}
          </div>

        </motion.div>
      )}
    </>
  );
}
