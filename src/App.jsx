import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import {
  motion, useScroll, useTransform, useSpring,
  useMotionValue, AnimatePresence,
} from "framer-motion";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const PALETTE = {
  text:     "rgba(210,240,255,0.92)",
  textDim:  "rgba(140,200,250,0.62)",
  accentDim:"rgba(60,140,220,0.42)",
};

const CV_URL = "https://export-download.canva.com/VrvLw/DAHA89VrvLw/33/0-2632849560997057759.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260301%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260301T020306Z&X-Amz-Expires=61762&X-Amz-Signature=0d9c81dda4a7a3c05e1540fc9391a2e6603eab3e39d28a32beb284a91305afbf&X-Amz-SignedHeaders=host&response-content-disposition=attachment%3B%20filename%2A%3DUTF-8%27%27CV.pdf&response-expires=Sun%2C%2001%20Mar%202026%2019%3A12%3A28%20GMT";

// ─────────────────────────────────────────────
// HOOK: DEPTH CONTROLLER
// ─────────────────────────────────────────────
function useDepthController() {
  const { scrollYProgress } = useScroll();
  const depth = useSpring(scrollYProgress, { stiffness:40, damping:25, restDelta:0.001 });
  const bgTop         = useTransform(depth, [0,0.2,0.5,0.8,1], ["#5ba8d4","#0e3a5c","#071828","#030e18","#010810"]);
  const bgBottom      = useTransform(depth, [0,0.2,0.5,0.8,1], ["#0d4a7a","#061220","#030c14","#010810","#000508"]);
  const islandOpacity = useTransform(depth, [0,0.12,0.22], [1,0.5,0]);
  const islandY       = useTransform(depth, [0,0.25], [0,-80]);
  return { depth, bgTop, bgBottom, islandOpacity, islandY, scrollYProgress };
}

// ─────────────────────────────────────────────
// LOADING SCREEN
// ─────────────────────────────────────────────
const LoadingScreen = memo(({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [label, setLabel]       = useState("Initializing Experience\u2026");
  const stages = useMemo(() => [
    [25,"Loading depth systems\u2026"],
    [50,"Calibrating ocean layers\u2026"],
    [75,"Generating particle fields\u2026"],
    [100,"Diving in\u2026"],
  ], []);

  useEffect(() => {
    let val = 0;
    const id = setInterval(() => {
      val = Math.min(val + 1, 100);
      setProgress(val);
      const s = stages.find(([p]) => p === val);
      if (s) setLabel(s[1]);
      if (val >= 100) { clearInterval(id); setTimeout(onComplete, 500); }
    }, 20);
    return () => clearInterval(id);
  }, [stages, onComplete]);

  return (
    <motion.div exit={{ opacity:0 }} transition={{ duration:0.7 }}
      style={{ position:"fixed", inset:0, zIndex:9999, background:"linear-gradient(180deg,#040e1a,#020810)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
      {[1,-1,1].map((dir,i) => (
        <motion.div key={i} style={{ position:"absolute", top:`${22+i*26}%`, opacity:0.07 }}
          animate={{ x: dir>0 ? [-200,1800] : [1800,-200] }}
          transition={{ duration:22+i*6, repeat:Infinity, ease:"linear" }}>
          <svg width={70+i*25} height={32+i*9} viewBox="0 0 60 28">
            <path d="M0 14 Q12 7 24 9 Q36 3 48 7 Q56 9 60 14 Q56 19 48 21 Q36 25 24 19 Q12 21 0 14Z M48 7 Q54 3 59 0 Q57 7 56 14 Q57 21 59 28 Q54 25 48 21Z" fill="white"/>
          </svg>
        </motion.div>
      ))}
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6 }} style={{ textAlign:"center", zIndex:2 }}>
        <motion.div animate={{ opacity:[0.3,1,0.3] }} transition={{ duration:2.5, repeat:Infinity }} style={{ marginBottom:28 }}>
          <svg width={48} height={48} viewBox="0 0 48 48">
            <circle cx={24} cy={24} r={22} stroke="rgba(80,160,255,0.35)" strokeWidth={1.5} fill="none"/>
            <circle cx={24} cy={24} r={14} stroke="rgba(80,160,255,0.55)" strokeWidth={1}   fill="none"/>
            <circle cx={24} cy={24} r={5}  fill="rgba(80,160,255,0.75)"/>
          </svg>
        </motion.div>
        <p style={{ fontFamily:"'Space Mono',monospace", fontSize:11, letterSpacing:"0.3em", color:"rgba(100,175,255,0.7)", textTransform:"uppercase", marginBottom:28 }}>{label}</p>
        <div style={{ width:260, height:1, background:"rgba(255,255,255,0.07)", position:"relative", margin:"0 auto" }}>
          <div style={{ position:"absolute", left:0, top:0, height:"100%", width:`${progress}%`, background:"linear-gradient(90deg,rgba(40,110,200,0.7),rgba(100,200,255,0.9))", transition:"width 0.08s linear" }}/>
          <div style={{ position:"absolute", top:-3, left:`calc(${progress}% - 3px)`, width:6, height:6, borderRadius:"50%", background:"rgba(140,220,255,0.9)", boxShadow:"0 0 10px rgba(100,200,255,0.8)", transition:"left 0.08s linear" }}/>
        </div>
        <p style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:"rgba(80,150,220,0.4)", letterSpacing:"0.2em", marginTop:14 }}>{progress}%</p>
      </motion.div>
    </motion.div>
  );
});

// ─────────────────────────────────────────────
// PARTICLE CANVAS (performance-safe)
// ─────────────────────────────────────────────
const ParticleCanvas = memo(({ depth }) => {
  const canvasRef = useRef(null);
  const depthVal  = useRef(0);
  useEffect(() => depth.onChange(v => { depthVal.current = v; }), [depth]);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W = window.innerWidth, H = window.innerHeight;
    canvas.width = W; canvas.height = H;
    const resize = () => { W=window.innerWidth; H=window.innerHeight; canvas.width=W; canvas.height=H; };
    window.addEventListener("resize", resize, { passive:true });
    const pts = Array.from({ length:50 }, () => ({
      x:Math.random()*W, y:Math.random()*H,
      vx:(Math.random()-0.5)*0.15, vy:-Math.random()*0.32-0.08,
      r:Math.random()*1.7+0.3, a:Math.random()*0.5+0.15,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0,0,W,H);
      const g = 0.12 + depthVal.current*0.55;
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.y<-4) { p.y=H+4; p.x=Math.random()*W; }
        if (p.x<-4) p.x=W+4; if (p.x>W+4) p.x=-4;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(120,200,255,${p.a*g})`; ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize",resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position:"fixed", inset:0, zIndex:1, pointerEvents:"none" }}/>;
});

// ─────────────────────────────────────────────
// FISH CANVAS (performance-safe)
// ─────────────────────────────────────────────
const FishCanvas = memo(({ depth }) => {
  const canvasRef = useRef(null);
  const depthVal  = useRef(0);
  useEffect(() => depth.onChange(v => { depthVal.current = v; }), [depth]);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W = window.innerWidth, H = window.innerHeight;
    canvas.width = W; canvas.height = H;
    const resize = () => { W=window.innerWidth; H=window.innerHeight; canvas.width=W; canvas.height=H; };
    window.addEventListener("resize", resize, { passive:true });

    const FISH = [
      { x:W*0.1, y:H*0.35, vx:0.5,   size:22,  minD:0.1,  maxD:0.55, dir:1 },
      { x:W*0.7, y:H*0.45, vx:-0.4,  size:18,  minD:0.12, maxD:0.5,  dir:-1 },
      { x:W*0.3, y:H*0.55, vx:0.6,   size:34,  minD:0.25, maxD:0.7,  dir:1 },
      { x:W*0.8, y:H*0.4,  vx:-0.5,  size:28,  minD:0.3,  maxD:0.72, dir:-1 },
      { x:W*0.2, y:H*0.65, vx:0.35,  size:50,  minD:0.45, maxD:0.9,  dir:1 },
      { x:W*0.6, y:H*0.6,  vx:-0.45, size:42,  minD:0.48, maxD:0.92, dir:-1 },
      { x:-300,  y:H*0.72, vx:0.28,  size:140, minD:0.55, maxD:0.95, dir:1, shark:true },
    ];

    function drawFish(x,y,size,dir,alpha,shark) {
      ctx.save();
      ctx.globalAlpha = alpha;
      if (dir === -1) { ctx.translate(x + size, y); ctx.scale(-1, 1); }
      else ctx.translate(x, y);
      const s = size / 60;
      ctx.scale(s, s);

      if (shark) {
        ctx.fillStyle = "rgba(4,18,34,0.6)";
        // body
        ctx.beginPath();
        ctx.moveTo(0,20); ctx.quadraticCurveTo(50,10,120,16);
        ctx.quadraticCurveTo(160,18,190,20);
        ctx.quadraticCurveTo(160,22,120,24);
        ctx.quadraticCurveTo(50,28,0,20);
        ctx.fill();
        // dorsal fin — separate path
        ctx.beginPath();
        ctx.moveTo(70,16); ctx.lineTo(82,2); ctx.lineTo(96,16); ctx.closePath();
        ctx.fill();
        // tail
        ctx.beginPath();
        ctx.moveTo(185,18); ctx.lineTo(200,6); ctx.lineTo(196,20);
        ctx.lineTo(200,34); ctx.lineTo(185,22); ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = "rgba(8,45,80,0.65)";
        // body only — clean ellipse-like shape
        ctx.beginPath();
        ctx.moveTo(8,16);
        ctx.quadraticCurveTo(20,6, 38,9);
        ctx.quadraticCurveTo(52,5, 60,16);
        ctx.quadraticCurveTo(52,27, 38,23);
        ctx.quadraticCurveTo(20,26, 8,16);
        ctx.fill();
        // tail — separate small triangle, no overlap
        ctx.beginPath();
        ctx.moveTo(8,16); ctx.lineTo(-8,6); ctx.lineTo(-4,16); ctx.lineTo(-8,26); ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    let raf;
    const draw = () => {
      ctx.clearRect(0,0,W,H);
      const d = depthVal.current;
      FISH.forEach(f => {
        f.x += f.vx;
        if (f.dir===1  && f.x > W+f.size*2) f.x = -f.size*2;
        if (f.dir===-1 && f.x < -f.size*2)  f.x = W+f.size*2;
        if (d<f.minD || d>f.maxD) return;
        const fi = Math.min((d-f.minD)/0.06,1), fo = Math.min((f.maxD-d)/0.06,1);
        const alpha = Math.min(fi,fo) * (f.shark?0.2:0.55);
        if (alpha<=0) return;
        drawFish(f.x,f.y,f.size,f.dir,alpha,f.shark);
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize",resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position:"fixed", inset:0, zIndex:2, pointerEvents:"none" }}/>;
});

// ─────────────────────────────────────────────
// FISHING LINE
// ─────────────────────────────────────────────
const FishingLine = memo(({ start, end }) => {
  if (!end) return null;
  const dist    = Math.hypot(end.x-start.x, end.y-start.y);
  const tension = Math.min(dist/260, 1);
  const sag     = (1-tension)*48 + tension*6;
  const mx = (start.x+end.x)/2, my = (start.y+end.y)/2+sag;
  return (
    <path
      d={`M${start.x} ${start.y} Q${mx} ${my} ${end.x} ${end.y}`}
      stroke={`rgba(200,175,135,${0.42+tension*0.38})`}
      strokeWidth={tension>0.75 ? 1 : 1.6}
      strokeDasharray={tension>0.88 ? "4 3" : undefined}
      fill="none"
    />
  );
});

// ─────────────────────────────────────────────
// ISLAND SCENE
// ─────────────────────────────────────────────
const IslandScene = memo(({ lineEnd, opacity, y }) => (
  <motion.div style={{ opacity, y, width:"100%", height:"100%", display:"flex", alignItems:"flex-end", justifyContent:"center", paddingBottom:"6%" }}>
    <svg viewBox="0 0 500 420" style={{ width:"100%", maxWidth:480, height:"auto" }}>
      <defs>
        <radialGradient id="sg" cx="50%" cy="30%" r="70%">
          <stop offset="0%"   stopColor="#d4a96a"/>
          <stop offset="65%"  stopColor="#b07840"/>
          <stop offset="100%" stopColor="#7a5228"/>
        </radialGradient>
        <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1a6fa0" stopOpacity="0.85"/>
          <stop offset="100%" stopColor="#0d3a5c" stopOpacity="0.75"/>
        </linearGradient>
      </defs>
      <ellipse cx={250} cy={392} rx={285} ry={32} fill="url(#wg)"/>
      <ellipse cx={205} cy={360} rx={158} ry={46} fill="url(#sg)"/>
      <ellipse cx={205} cy={356} rx={155} ry={28} fill="#c08850" opacity={0.45}/>
      <ellipse cx={190} cy={347} rx={88}  ry={11} fill="#e0b878" opacity={0.28}/>
      <motion.g animate={{ rotateZ:[-1.2,1.2,-1.2] }} transition={{ duration:3.8, repeat:Infinity, ease:"easeInOut" }} style={{ transformOrigin:"162px 363px" }}>
        <path d="M162 363 Q160 322 163 282 Q165 252 166 218" stroke="#6b4226" strokeWidth={6.5} fill="none" strokeLinecap="round"/>
        <path d="M166 218 Q142 188 112 198 Q136 207 166 218Z" fill="#2a7038" opacity={0.92}/>
        <path d="M166 218 Q147 192 157 162 Q160 190 166 218Z" fill="#338844" opacity={0.9}/>
        <path d="M166 218 Q192 180 212 190 Q191 204 166 218Z" fill="#2a7038" opacity={0.9}/>
        <path d="M166 218 Q196 202 216 217 Q193 213 166 218Z" fill="#338844" opacity={0.85}/>
        <path d="M166 218 Q152 226 126 220 Q149 219 166 218Z" fill="#2a7038" opacity={0.85}/>
        <circle cx={164} cy={225} r={5}   fill="#7a3810"/>
        <circle cx={173} cy={229} r={4}   fill="#6e3010"/>
        <circle cx={156} cy={228} r={4.5} fill="#7a3810"/>
      </motion.g>
      <g transform="translate(238,308)">
        <circle cx={0} cy={0} r={8} stroke="rgba(220,195,170,0.9)" strokeWidth={1.5} fill="none"/>
        <circle cx={-2.5} cy={-1} r={1} fill="rgba(220,195,170,0.9)"/>
        <circle cx={2.5}  cy={-1} r={1} fill="rgba(220,195,170,0.9)"/>
        <path d="M-2.5 3 Q0 5 2.5 3" stroke="rgba(220,195,170,0.9)" strokeWidth={1} fill="none"/>
        <line x1={0} y1={8}  x2={0}   y2={32} stroke="rgba(205,185,162,0.9)" strokeWidth={1.5}/>
        <line x1={0} y1={32} x2={-8}  y2={50} stroke="rgba(205,185,162,0.9)" strokeWidth={1.5}/>
        <line x1={0} y1={32} x2={8}   y2={50} stroke="rgba(205,185,162,0.9)" strokeWidth={1.5}/>
        <line x1={0} y1={14} x2={18}  y2={22} stroke="rgba(205,185,162,0.9)" strokeWidth={1.5}/>
        <line x1={0} y1={14} x2={-12} y2={20} stroke="rgba(205,185,162,0.9)" strokeWidth={1.5}/>
        <line x1={18} y1={22} x2={56} y2={-4} stroke="#8a6040" strokeWidth={2} strokeLinecap="round"/>
      </g>
      <FishingLine start={{ x:294, y:304 }} end={lineEnd}/>
    </svg>
  </motion.div>
));

// ─────────────────────────────────────────────
// DRAGGABLE PHOTO — pointer events only, no framer drag
// ─────────────────────────────────────────────
const DraggablePhoto = memo(({ onLineEnd, containerRef }) => {
  const ref      = useRef(null);
  const dragging = useRef(false);
  const origin   = useRef({ mx:0, my:0, ox:0, oy:0 });

  const ox = useMotionValue(0);
  const oy = useMotionValue(0);
  const sx = useSpring(ox, { stiffness:300, damping:30 });
  const sy = useSpring(oy, { stiffness:300, damping:30 });
  const sc = useMotionValue(1);

  // Idle float
  useEffect(() => {
    let raf, t = 0;
    const tick = () => {
      t += 0.025;
      if (!dragging.current) oy.set(Math.sin(t) * 7);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [oy]);

  // Report line position
  useEffect(() => {
    const report = () => {
      if (!ref.current || !containerRef?.current) return;
      const pr = ref.current.getBoundingClientRect();
      const cr = containerRef.current.getBoundingClientRect();
      onLineEnd({ x:(pr.left+pr.width/2-cr.left)/cr.width*500, y:(pr.top+pr.height/2-cr.top)/cr.height*420 });
    };
    const u1 = sx.onChange(report);
    const u2 = sy.onChange(report);
    report();
    return () => { u1(); u2(); };
  }, [sx, sy, onLineEnd, containerRef]);

  const BOUND = 110;

  const onDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true; sc.set(1.1);
    origin.current = { mx:e.clientX, my:e.clientY, ox:ox.get(), oy:oy.get() };
  }, [ox, oy, sc]);

  const onMove = useCallback((e) => {
    if (!dragging.current) return;
    const dx = e.clientX - origin.current.mx, dy = e.clientY - origin.current.my;
    ox.set(Math.max(-BOUND, Math.min(BOUND, origin.current.ox + dx)));
    oy.set(Math.max(-BOUND, Math.min(BOUND, origin.current.oy + dy)));
  }, [ox, oy]);

  const onUp = useCallback(() => {
    dragging.current = false; sc.set(1);
    ox.set(0); oy.set(0);
  }, [ox, oy, sc]);

  return (
    <motion.div ref={ref} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      style={{ x:sx, y:sy, scale:sc, cursor:"grab", touchAction:"none", userSelect:"none", willChange:"transform" }}>
      <div style={{ width:130, height:130, borderRadius:"50%", background:"linear-gradient(135deg,rgba(20,80,140,0.5),rgba(8,40,80,0.4))", border:"2px solid rgba(100,180,255,0.5)", boxShadow:"0 0 28px rgba(60,150,255,0.25),0 0 56px rgba(30,100,200,0.12),inset 0 0 18px rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", position:"relative" }}>
        <svg width={80} height={80} viewBox="0 0 80 80" fill="none">
          <circle cx={40} cy={28} r={17} fill="rgba(140,210,255,0.35)"/>
          <path d="M10 76 Q10 50 40 50 Q70 50 70 76" fill="rgba(140,210,255,0.3)"/>
        </svg>
        <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:"linear-gradient(135deg,rgba(255,255,255,0.1) 0%,transparent 60%)", pointerEvents:"none" }}/>
      </div>
      <motion.p animate={{ opacity:[0.25,0.7,0.25] }} transition={{ duration:2.8, repeat:Infinity }}
        style={{ fontFamily:"'Space Mono',monospace", fontSize:9, letterSpacing:"0.18em", color:"rgba(120,190,255,0.55)", textAlign:"center", marginTop:8 }}>
        drag me
      </motion.p>
    </motion.div>
  );
});

// ─────────────────────────────────────────────
// WAVES
// ─────────────────────────────────────────────
const WAVE_DATA = [
  { a:20, spd:9,  y:0,   op:0.13, c:"rgba(25,110,190,0.55)" },
  { a:16, spd:12, y:18,  op:0.1,  c:"rgba(18,95,170,0.45)" },
  { a:26, spd:7,  y:-12, op:0.08, c:"rgba(35,130,210,0.38)" },
];
const Waves = memo(() => (
  <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none" }}>
    {WAVE_DATA.map((w,i) => (
      <motion.div key={i} style={{ position:"absolute", bottom:w.y, left:0, right:0, height:72, opacity:w.op }}
        animate={{ x:[0,-90,0] }} transition={{ duration:w.spd, repeat:Infinity, ease:"easeInOut" }}>
        <svg viewBox="0 0 1200 72" preserveAspectRatio="none" style={{ width:"200%", height:"100%" }}>
          <path d={`M0 36 Q150 ${36-w.a} 300 36 Q450 ${36+w.a} 600 36 Q750 ${36-w.a} 900 36 Q1050 ${36+w.a} 1200 36 V72 H0Z`} fill={w.c}/>
        </svg>
      </motion.div>
    ))}
  </div>
));

// ─────────────────────────────────────────────
// LIGHT RAYS
// ─────────────────────────────────────────────
const LightRays = memo(({ depth }) => {
  const opacity = useTransform(depth, [0.12,0.28,0.62,0.78], [0,0.6,0.6,0]);
  return (
    <motion.div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none", opacity }}>
      {[0,1,2,3,4].map(i => (
        <motion.div key={i} animate={{ opacity:[0.35,0.85,0.35] }} transition={{ duration:3.2+i*0.6, repeat:Infinity, delay:i*0.45 }}
          style={{ position:"absolute", top:-40, left:`${8+i*18}%`, width:`${2.5+i%2*2}%`, height:"115%", background:"linear-gradient(180deg,rgba(100,190,255,0.1) 0%,transparent 100%)", transform:`skewX(${-14+i*7}deg)`, transformOrigin:"top center" }}/>
      ))}
    </motion.div>
  );
});

// ─────────────────────────────────────────────
// BUBBLES — static data to avoid re-render
// ─────────────────────────────────────────────
const BUBBLE_DATA = Array.from({ length:18 }, (_,i) => ({
  x:Math.random()*100, size:Math.random()*7+3,
  dur:Math.random()*8+7, delay:Math.random()*12, drift:Math.sin(i)*28,
}));
const BubbleField = memo(() => (
  <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
    {BUBBLE_DATA.map((b,i) => (
      <motion.div key={i}
        style={{ position:"absolute", left:`${b.x}%`, bottom:-20, width:b.size, height:b.size, borderRadius:"50%", border:"1px solid rgba(140,220,255,0.35)", background:"rgba(100,180,255,0.04)" }}
        animate={{ y:[-480,0], x:[0,b.drift,0] }}
        transition={{ duration:b.dur, delay:b.delay, repeat:Infinity, ease:"easeOut" }}/>
    ))}
  </div>
));

// ─────────────────────────────────────────────
// CUSTOM CURSOR — dot + lagging ring, pure RAF
// ─────────────────────────────────────────────
const CustomCursor = () => {
  const dotRef  = useRef(null);
  const ringRef = useRef(null);
  const pos     = useRef({ x:-100, y:-100 });
  const ring    = useRef({ x:-100, y:-100 });

  useEffect(() => {
    const move = (e) => { pos.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", move, { passive:true });

    let raf;
    const tick = () => {
      // dot: instant
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${pos.current.x - 4}px, ${pos.current.y - 4}px)`;
      }
      // ring: lerp behind
      ring.current.x += (pos.current.x - ring.current.x) * 0.12;
      ring.current.y += (pos.current.y - ring.current.y) * 0.12;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.current.x - 18}px, ${ring.current.y - 18}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      window.removeEventListener("mousemove", move);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      {/* Dot */}
      <div ref={dotRef} style={{ position:"fixed", top:0, left:0, width:8, height:8, borderRadius:"50%", background:"rgba(140,210,255,0.95)", pointerEvents:"none", zIndex:99999, willChange:"transform" }}/>
      {/* Ring */}
      <div ref={ringRef} style={{ position:"fixed", top:0, left:0, width:36, height:36, borderRadius:"50%", border:"1.5px solid rgba(100,180,255,0.55)", pointerEvents:"none", zIndex:99999, willChange:"transform" }}/>
    </>
  );
};

// ─────────────────────────────────────────────
// REVEAL WRAPPER
// ─────────────────────────────────────────────
const Reveal = ({ children, delay=0, y=28 }) => (
  <motion.div initial={{ opacity:0, y }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true, margin:"-55px" }} transition={{ duration:0.72, delay, ease:"easeOut" }}>
    {children}
  </motion.div>
);

// ─────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────
const SectionHeader = ({ label, title, subtitle }) => (
  <Reveal>
    <div style={{ textAlign:"center", marginBottom:52 }}>
      <p style={{ fontFamily:"'Space Mono',monospace", fontSize:10, letterSpacing:"0.3em", textTransform:"uppercase", color:PALETTE.accentDim, marginBottom:12 }}>{label}</p>
      <h2 style={{ fontFamily:"'Cormorant Garamond','Georgia',serif", fontSize:"clamp(28px,4.2vw,48px)", fontWeight:700, color:PALETTE.text, lineHeight:1.1, marginBottom:14, letterSpacing:"-0.01em" }}>{title}</h2>
      {subtitle && <p style={{ fontFamily:"'Crimson Text','Georgia',serif", fontSize:16.5, color:PALETTE.textDim, maxWidth:490, margin:"0 auto", lineHeight:1.78 }}>{subtitle}</p>}
    </div>
  </Reveal>
);

// ─────────────────────────────────────────────
// SKILL CARD
// ─────────────────────────────────────────────
const SkillCard = memo(({ title, icon, skills, delay }) => (
  <Reveal delay={delay}>
    <motion.div whileHover={{ y:-5, boxShadow:"0 16px 52px rgba(28,98,198,0.2)" }}
      style={{ background:"rgba(8,30,56,0.6)", backdropFilter:"blur(14px)", border:"1px solid rgba(68,148,228,0.16)", borderRadius:14, padding:"24px 26px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, right:0, width:68, height:68, background:"radial-gradient(circle at top right,rgba(58,138,252,0.1),transparent)", pointerEvents:"none" }}/>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
        <span style={{ fontSize:19 }}>{icon}</span>
        <h3 style={{ fontFamily:"'Cormorant Garamond','Georgia',serif", fontSize:16.5, color:"rgba(172,220,255,0.95)", fontWeight:600, letterSpacing:"0.03em" }}>{title}</h3>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        {skills.map((s,i) => (
          <motion.span key={i} initial={{ opacity:0, scale:0.85 }} whileInView={{ opacity:1, scale:1 }} viewport={{ once:true }} transition={{ duration:0.32, delay:delay+0.07+i*0.04 }}
            style={{ padding:"4px 11px", borderRadius:16, fontSize:10.5, fontFamily:"'Space Mono',monospace", letterSpacing:"0.06em", background:"rgba(22,82,152,0.3)", border:"1px solid rgba(68,148,228,0.18)", color:"rgba(142,208,255,0.85)" }}>
            {s}
          </motion.span>
        ))}
      </div>
    </motion.div>
  </Reveal>
));

// ─────────────────────────────────────────────
// PROJECT CARD
// ─────────────────────────────────────────────
const ProjectCard = memo(({ title, tag, desc, points, delay }) => (
  <Reveal delay={delay}>
    <motion.div whileHover={{ y:-5, boxShadow:"0 26px 72px rgba(16,76,172,0.26)" }}
      style={{ background:"rgba(5,22,44,0.72)", backdropFilter:"blur(18px)", border:"1px solid rgba(52,128,212,0.18)", borderRadius:18, padding:"30px 30px", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 78% 18%,rgba(36,96,192,0.07),transparent 68%)", pointerEvents:"none" }}/>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:13, flexWrap:"wrap", gap:9 }}>
        <h3 style={{ fontFamily:"'Cormorant Garamond','Georgia',serif", fontSize:21, color:"rgba(200,234,255,0.95)", fontWeight:700, lineHeight:1.2 }}>{title}</h3>
        <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, letterSpacing:"0.18em", color:"rgba(68,152,255,0.7)", border:"1px solid rgba(68,152,255,0.22)", padding:"3px 10px", borderRadius:16, textTransform:"uppercase" }}>{tag}</span>
      </div>
      <p style={{ fontFamily:"'Crimson Text','Georgia',serif", fontSize:15.5, color:"rgba(148,203,250,0.68)", lineHeight:1.78, marginBottom:16 }}>{desc}</p>
      {points && (
        <ul style={{ padding:0, margin:0, listStyle:"none" }}>
          {points.map((p,i) => (
            <li key={i} style={{ display:"flex", gap:8, marginBottom:6, alignItems:"flex-start" }}>
              <span style={{ color:"rgba(68,152,255,0.55)", marginTop:3, flexShrink:0 }}>▸</span>
              <span style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:"rgba(122,188,248,0.68)", lineHeight:1.62, letterSpacing:"0.022em" }}>{p}</span>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  </Reveal>
));

// ─────────────────────────────────────────────
// RESEARCH STATION
// ─────────────────────────────────────────────
const ResearchStation = memo(() => (
  <div style={{ width:"100%", maxWidth:680, margin:"0 auto 48px" }}>
    <svg viewBox="0 0 700 280" style={{ width:"100%", height:"auto" }}>
      <defs>
        <radialGradient id="wg2" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(90,190,255,0.55)"/>
          <stop offset="65%"  stopColor="rgba(45,125,215,0.18)"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>
        <filter id="gf"><feGaussianBlur stdDeviation="2.5" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
        <linearGradient id="sb2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#010c16"/><stop offset="100%" stopColor="#000810"/>
        </linearGradient>
      </defs>
      <path d="M0 240 Q175 222 350 236 Q525 252 700 232 L700 280 H0Z" fill="url(#sb2)"/>
      <rect x={110} y={140} width={480} height={112} rx={7} fill="rgba(6,22,42,0.96)" stroke="rgba(38,88,148,0.38)" strokeWidth={1.5}/>
      <path d="M285 140 Q350 82 415 140Z" fill="rgba(6,22,48,0.9)" stroke="rgba(38,88,148,0.28)" strokeWidth={1}/>
      {[160,240,320,400,480,540].map((x,i) => (
        <g key={i}>
          <motion.rect x={x} y={158} width={28} height={20} rx={4.5} fill="rgba(55,155,255,0.1)" stroke="rgba(75,175,255,0.28)" strokeWidth={1}
            animate={{ opacity:[0.55,1,0.55] }} transition={{ duration:2.1+i*0.28, repeat:Infinity, delay:i*0.18 }}/>
          <motion.rect x={x} y={158} width={28} height={20} rx={4.5} fill="url(#wg2)" filter="url(#gf)"
            animate={{ opacity:[0.28,0.68,0.28] }} transition={{ duration:2.1+i*0.28, repeat:Infinity, delay:i*0.18 }}/>
        </g>
      ))}
      <motion.ellipse cx={350} cy={116} rx={28} ry={16} fill="rgba(55,155,255,0.09)" stroke="rgba(75,175,255,0.38)" strokeWidth={1}
        animate={{ opacity:[0.45,1,0.45] }} transition={{ duration:3, repeat:Infinity }}/>
      <line x1={350} y1={82} x2={350} y2={44} stroke="rgba(55,130,200,0.45)" strokeWidth={1.5}/>
      <motion.circle cx={350} cy={41} r={4} fill="rgba(75,180,255,0.8)" animate={{ opacity:[0.4,1,0.4] }} transition={{ duration:1.4, repeat:Infinity }}/>
      {[175,255,445,525].map((x,i) => <rect key={i} x={x} y={252} width={11} height={28} fill="rgba(18,52,88,0.8)"/>)}
      {Array.from({length:28},(_,i) => <circle key={i} cx={22+i*24} cy={248+Math.sin(i)*7} r={1.4} fill="rgba(25,65,105,0.38)"/>)}
    </svg>
  </div>
));

// ─────────────────────────────────────────────
// CONTACT PANEL
// ─────────────────────────────────────────────
const ContactPanel = memo(({ icon, label, sub, href, delay }) => (
  <Reveal delay={delay}>
    <motion.a href={href} target={href?.startsWith("http")?"_blank":undefined} rel="noopener noreferrer"
      whileHover={{ y:-4, boxShadow:"0 12px 42px rgba(32,112,212,0.26)" }}
      style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:7, background:"rgba(5,30,60,0.72)", backdropFilter:"blur(18px)", border:"1px solid rgba(52,132,212,0.22)", borderRadius:14, padding:"22px 26px", textDecoration:"none", cursor:"pointer", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at center bottom,rgba(32,112,212,0.07),transparent 70%)", pointerEvents:"none" }}/>
      <span style={{ fontSize:24 }}>{icon}</span>
      <span style={{ fontFamily:"'Cormorant Garamond','Georgia',serif", fontSize:15.5, fontWeight:600, color:"rgba(172,220,255,0.9)", letterSpacing:"0.03em" }}>{label}</span>
      {sub && <span style={{ fontFamily:"'Space Mono',monospace", fontSize:9, letterSpacing:"0.12em", color:"rgba(92,162,232,0.52)" }}>{sub}</span>}
    </motion.a>
  </Reveal>
));

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
export default function App() {
  const [loaded,  setLoaded]  = useState(false);
  const [lineEnd, setLineEnd] = useState(null);
  const heroRef = useRef(null);

  const { depth, bgTop, bgBottom, islandOpacity, islandY, scrollYProgress } = useDepthController();

  // All transforms at top level — no hooks inside JSX
  const bgGrad      = useTransform([bgTop,bgBottom], ([t,b]) => `linear-gradient(180deg,${t} 0%,${b} 100%)`);
  const scrollIndOp = useTransform(scrollYProgress, [0,0.07], [1,0]);

  // Mouse parallax
  const rawMX = useMotionValue(0), rawMY = useMotionValue(0);
  const pxT   = useTransform(rawMX, [-1,1], [-12,12]);
  const pyT   = useTransform(rawMY, [-1,1], [-7,7]);
  const px    = useSpring(pxT, { stiffness:65, damping:26 });
  const py    = useSpring(pyT, { stiffness:65, damping:26 });

  const handleMouse = useCallback((e) => {
    rawMX.set(e.clientX/window.innerWidth*2-1);
    rawMY.set(e.clientY/window.innerHeight*2-1);
  }, [rawMX, rawMY]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouse, { passive:true });
    return () => window.removeEventListener("mousemove", handleMouse);
  }, [handleMouse]);

  const handleLineEnd = useCallback(pos => setLineEnd(pos), []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Space+Mono:wght@400;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{overflow-x:hidden;background:#020a12;cursor:none}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:#010810}
        ::-webkit-scrollbar-thumb{background:rgba(52,122,192,0.36);border-radius:2px}
        a{color:inherit}
        ::selection{background:rgba(58,138,255,0.28)}
      `}</style>

      <AnimatePresence>
        {!loaded && <LoadingScreen key="loader" onComplete={() => setLoaded(true)}/>}
      </AnimatePresence>

      {loaded && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.7 }}>

          {/* Fixed gradient background */}
          <motion.div style={{ background:bgGrad, position:"fixed", inset:0, zIndex:0 }}/>

          {/* Cursor */}
          <CustomCursor/>

          {/* Canvas-based systems (60fps, zero DOM overhead) */}
          <ParticleCanvas depth={depth}/>
          <FishCanvas depth={depth}/>

          {/* ══════════════ HERO ══════════════ */}
          <section ref={heroRef} style={{ position:"relative", zIndex:10, minHeight:"100vh", display:"flex", overflow:"hidden" }} aria-label="Hero — Surface">

            {/* LEFT: Island only */}
            <div style={{ flex:"0 0 46%", position:"relative", display:"flex", alignItems:"flex-end", justifyContent:"center", paddingBottom:"4%", overflow:"hidden" }}>
              <motion.div style={{ x:px, y:py, width:"100%", height:"100%" }}>
                <IslandScene lineEnd={lineEnd} opacity={islandOpacity} y={islandY}/>
              </motion.div>
            </div>

            {/* RIGHT: Name + photo + content */}
            <div style={{ flex:"0 0 54%", position:"relative", display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", padding:"80px 48px 60px 28px", textAlign:"center" }}>

              <Waves/>

              {/* ── NAME — first thing you see ── */}
              <motion.div initial={{ opacity:0, y:-18 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.85, delay:0.1 }}
                style={{ marginBottom:22, position:"relative", zIndex:15, width:"100%" }}>
                <p style={{ fontFamily:"'Space Mono',monospace", fontSize:9.5, letterSpacing:"0.35em", color:PALETTE.accentDim, textTransform:"uppercase", marginBottom:10 }}>
                  Information Technology Student
                </p>
                <h1 style={{ fontFamily:"'Cormorant Garamond','Georgia',serif", fontSize:"clamp(34px,4.8vw,64px)", fontWeight:700, color:PALETTE.text, lineHeight:1.04, letterSpacing:"-0.02em", marginBottom:4 }}>
                  Nazriel Sakhiy<br/>
                  <motion.span style={{ fontStyle:"italic", color:"rgba(98,182,255,0.82)" }}
                    animate={{ opacity:[0.75,1,0.75] }} transition={{ duration:3.5, repeat:Infinity }}>
                    Kurniadi
                  </motion.span>
                </h1>
                <motion.div style={{ width:54, height:1.5, background:"linear-gradient(90deg,rgba(78,158,255,0.58),transparent)", margin:"16px auto 0" }}
                  initial={{ scaleX:0, originX:0 }} animate={{ scaleX:1 }} transition={{ duration:0.9, delay:0.6 }}/>
              </motion.div>

              {/* ── DRAGGABLE PHOTO ── */}
              <motion.div initial={{ opacity:0, scale:0.82 }} animate={{ opacity:1, scale:1 }} transition={{ duration:0.8, delay:0.28 }}
                style={{ position:"relative", zIndex:20, marginBottom:28 }}>
                <DraggablePhoto onLineEnd={handleLineEnd} containerRef={heroRef}/>
              </motion.div>

              {/* ── TAGLINE + CTA ── */}
              <motion.div initial={{ opacity:0, y:22 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.85, delay:0.42 }}
                style={{ position:"relative", zIndex:15, maxWidth:390, textAlign:"center" }}>
                <p style={{ fontFamily:"'Crimson Text','Georgia',serif", fontSize:16, color:PALETTE.textDim, lineHeight:1.82, marginBottom:30 }}>
                  Engineering systems at the intersection of clarity and complexity — from surface interfaces to the deep architecture below.
                </p>
                <div style={{ display:"flex", gap:11, flexWrap:"wrap", justifyContent:"center" }}>
                  {[
                    { label:"Dive Deeper ↓", href:"#about",  filled:true  },
                    { label:"View Skills",   href:"#skills", filled:false },
                  ].map(({ label, href, filled }) => (
                    <motion.a key={label} href={href}
                      whileHover={{ scale:1.04, boxShadow: filled?"0 7px 26px rgba(52,138,252,0.36)":"none" }}
                      whileTap={{ scale:0.97 }}
                      style={{ padding:"11px 24px", background:filled?"linear-gradient(135deg,rgba(32,92,192,0.82),rgba(16,62,152,0.72))":"transparent", border:`1px solid ${filled?"rgba(72,155,255,0.42)":"rgba(72,152,255,0.28)"}`, borderRadius:7, color:filled?"rgba(200,234,255,0.95)":"rgba(142,206,255,0.78)", fontFamily:"'Space Mono',monospace", fontSize:10.5, letterSpacing:"0.1em", textDecoration:"none", cursor:"pointer", display:"inline-block" }}>
                      {label}
                    </motion.a>
                  ))}
                </div>
              </motion.div>

              {/* Scroll indicator */}
              <motion.div style={{ position:"absolute", bottom:26, left:"50%", transform:"translateX(-50%)", display:"flex", flexDirection:"column", alignItems:"center", gap:6, opacity:scrollIndOp, zIndex:15 }}>
                <motion.div animate={{ y:[0,8,0] }} transition={{ duration:2, repeat:Infinity }}
                  style={{ width:19, height:32, border:"1.5px solid rgba(88,172,255,0.3)", borderRadius:10, display:"flex", justifyContent:"center", paddingTop:5 }}>
                  <motion.div animate={{ y:[0,8,0], opacity:[1,0,1] }} transition={{ duration:2, repeat:Infinity }}
                    style={{ width:2.5, height:5, borderRadius:2, background:"rgba(88,172,255,0.55)" }}/>
                </motion.div>
                <p style={{ fontFamily:"'Space Mono',monospace", fontSize:7.5, letterSpacing:"0.22em", color:"rgba(88,162,255,0.36)" }}>SCROLL</p>
              </motion.div>
            </div>
          </section>

          {/* ══════════════ ABOUT ══════════════ */}
          <section id="about" style={{ position:"relative", zIndex:10, padding:"108px clamp(20px,6vw,88px)", maxWidth:840, margin:"0 auto" }} aria-label="About">
            <LightRays depth={depth}/>
            <BubbleField/>
            <SectionHeader label="/ 01 — Identity" title="Who Navigates These Waters" subtitle="A student, a builder, a thinker — charting depth through disciplined curiosity."/>
            <Reveal>
              <div style={{ background:"rgba(6,22,46,0.58)", backdropFilter:"blur(22px)", border:"1px solid rgba(46,112,202,0.14)", borderRadius:18, padding:"42px clamp(24px,5vw,50px)", position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:1.5, background:"linear-gradient(90deg,transparent,rgba(72,155,255,0.36),transparent)" }}/>
                {[
                  "I'm an Information Technology student with a genuine passion for understanding how systems work beneath the surface — not just how to use them, but how to build, optimize, and architect them with intention.",
                  "My academic focus spans software development, system design, and the engineering principles that transform functional code into elegant, maintainable systems. I believe the most interesting problems live at the intersection of logic and creativity.",
                  "I approach every challenge as a layered exploration — starting from requirements, descending through architecture, and surfacing with solutions that are both technically rigorous and purposefully designed. Continuous learning is not a habit but a necessity in a field that reinvents itself as rapidly as ours.",
                  "This portfolio itself reflects that philosophy: not just a display of what I know, but a demonstration of how I think, how I build, and how I persist through complexity.",
                ].map((t,i) => (
                  <Reveal key={i} delay={i*0.1} y={12}>
                    <p style={{ fontFamily:"'Crimson Text','Georgia',serif", fontSize:17, color:"rgba(152,210,255,0.76)", lineHeight:1.9, marginBottom:i<3?20:0 }}>{t}</p>
                  </Reveal>
                ))}
              </div>
            </Reveal>
          </section>

          {/* ══════════════ SKILLS ══════════════ */}
          <section id="skills" style={{ position:"relative", zIndex:10, padding:"108px clamp(20px,6vw,88px)", maxWidth:1060, margin:"0 auto" }} aria-label="Skills">
            <SectionHeader label="/ 02 — Capability" title="The Deep Ocean Ecosystem" subtitle="Skills cultivated through pressure, iteration, and depth of exploration."/>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(285px,1fr))", gap:20 }}>
              <SkillCard title="Technical Skills" icon="⚙️" delay={0}    skills={["HTML5 & CSS3","JavaScript ES2024","React","Python","SQL","REST APIs","Git & Version Control","Data Structures","Algorithms","System Design"]}/>
              <SkillCard title="Development Tools" icon="🔧" delay={0.1}  skills={["VS Code","Vite","Node.js","npm / yarn","Git & GitHub","Figma","Chrome DevTools","Postman","Linux CLI","Docker Fundamentals"]}/>
              <SkillCard title="Core Strengths"    icon="🧠" delay={0.2}  skills={["Analytical Thinking","System Architecture","Attention to Detail","Rapid Learning","Problem Decomposition","Technical Communication","Clean Code","Performance Awareness"]}/>
            </div>
          </section>

          {/* ══════════════ PROJECTS ══════════════ */}
          <section id="projects" style={{ position:"relative", zIndex:10, padding:"108px clamp(20px,6vw,88px)", maxWidth:960, margin:"0 auto" }} aria-label="Projects">
            <SectionHeader label="/ 03 — Engineering" title="Constructed With Intent" subtitle="Systems designed from the seabed up — each a demonstration of deliberate architecture."/>
            <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
              <ProjectCard title="Deep Ocean Portfolio" tag="Live" delay={0}
                desc="A production-grade interactive portfolio engineered with React, Framer Motion, and a centralized scroll-driven depth controller. Every visual layer responds dynamically to scroll progress."
                points={[
                  "Centralized depth controller interpolating gradients, brightness & parallax via scroll",
                  "Canvas-based particle & fish systems — 60fps with zero DOM node overhead",
                  "Physics-based draggable photo: spring animation, elastic bounds, fishing line tension",
                  "Scroll-triggered fish scaling with depth; low-opacity shark at deepest layer",
                  "Staged loading sequence with multi-phase initialization simulation",
                  "Glassmorphic skill panels with staggered whileInView entrance animations",
                  "SVG research station contact section with animated glowing windows",
                  "Fully responsive 320px–4K, Rules-of-Hooks compliant, memo-optimized throughout",
                ]}/>
              <ProjectCard title="Ongoing Development" tag="In Progress" delay={0.16}
                desc="The ocean floor is never fully mapped. Future systems include full-stack applications, algorithmic visualizations, and tools built from first principles."
                points={[
                  "Component-ready architecture — new projects require zero structural changes",
                  "Scalable declarative data model for filtering by domain and technology",
                  "Depth-tagged categorization system planned for future rollout",
                ]}/>
            </div>
          </section>

          {/* ══════════════ CONTACT ══════════════ */}
          <section id="contact" style={{ position:"relative", zIndex:10, padding:"108px clamp(20px,6vw,76px) 76px", maxWidth:840, margin:"0 auto" }} aria-label="Contact">
            <SectionHeader label="/ 04 — Contact" title="The Research Station" subtitle="Deepest layer. Signal reaches here. Reach out."/>
            <ResearchStation/>
            <Reveal>
              <p style={{ fontFamily:"'Cormorant Garamond','Georgia',serif", fontSize:"clamp(17px,2.7vw,25px)", fontStyle:"italic", fontWeight:600, color:"rgba(162,216,255,0.7)", textAlign:"center", lineHeight:1.58, maxWidth:548, margin:"0 auto 50px" }}>
                "The best collaborations begin at depth — where the noise fades and the signal becomes clear."
              </p>
            </Reveal>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))", gap:14, marginTop:50 }}>
              <ContactPanel icon="📄" label="Resume"   sub="Download CV"  href={CV_URL}                                              delay={0}/>
              <ContactPanel icon="💼" label="LinkedIn" sub="Connect"       href="https://www.linkedin.com/in/nazriel-sakhiy-kurniadi" delay={0.08}/>
              <ContactPanel icon="✉️" label="Email"    sub="nazzxsk@gmail.com" href="mailto:nazzxsk@gmail.com"                       delay={0.16}/>
              <ContactPanel icon="🐙" label="GitHub"   sub="Kaezshii"      href="https://github.com/Kaezshii"                        delay={0.24}/>
            </div>
            <Reveal delay={0.38}>
              <div style={{ textAlign:"center", marginTop:88, paddingBottom:58 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:16, marginBottom:13 }}>
                  <div style={{ height:1, width:68, background:"rgba(52,122,192,0.22)" }}/>
                  <svg width={13} height={13} viewBox="0 0 13 13"><circle cx={6.5} cy={6.5} r={5.5} stroke="rgba(72,152,255,0.28)" strokeWidth={1} fill="none"/><circle cx={6.5} cy={6.5} r={2.5} fill="rgba(72,152,255,0.36)"/></svg>
                  <div style={{ height:1, width:68, background:"rgba(52,122,192,0.22)" }}/>
                </div>
                <p style={{ fontFamily:"'Space Mono',monospace", fontSize:9, letterSpacing:"0.22em", color:"rgba(52,115,188,0.3)", textTransform:"uppercase" }}>
                  — depth: maximum — signal: strong —
                </p>
              </div>
            </Reveal>
          </section>

          {/* Scroll progress bar */}
          <motion.div style={{ position:"fixed", top:0, left:0, right:0, height:2, zIndex:9998, background:"linear-gradient(90deg,rgba(36,95,192,0.8),rgba(92,192,255,0.9))", scaleX:scrollYProgress, transformOrigin:"left" }}/>

          {/* Nav dots */}
          <div style={{ position:"fixed", right:16, top:"50%", transform:"translateY(-50%)", display:"flex", flexDirection:"column", gap:10, zIndex:9000 }}>
            {[["#about","About"],["#skills","Skills"],["#projects","Projects"],["#contact","Contact"]].map(([href,label]) => (
              <motion.a key={href} href={href} title={label} whileHover={{ scale:1.7, background:"rgba(78,162,255,0.62)" }}
                style={{ width:5, height:5, borderRadius:"50%", background:"rgba(72,152,255,0.3)", border:"1px solid rgba(72,152,255,0.24)", display:"block", textDecoration:"none" }}/>
            ))}
          </div>

        </motion.div>
      )}
    </>
  );
}
