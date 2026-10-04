import { useEffect, useRef } from "react";

const COLORS = ["#c084fc", "#60a5fa", "#34d399", "#fb7185", "#facc15", "#f97316"];

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

interface Burst {
  x: number;
  y: number;
  sparks: Spark[];
}

export default function FireworksBurst() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const bursts = useRef<Burst[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const spawnBurst = () => {
      const x = 0.15 * canvas.width + Math.random() * 0.7 * canvas.width;
      const y = 0.1 * canvas.height + Math.random() * 0.4 * canvas.height;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const sparkCount = 28 + Math.floor(Math.random() * 18);

      const sparks: Spark[] = Array.from({ length: sparkCount }, (_, i) => {
        const angle = (i / sparkCount) * Math.PI * 2;
        const speed = 3 + Math.random() * 5;
        const life = 55 + Math.random() * 30;
        return {
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          life,
          maxLife: life,
          size: 2.5 + Math.random() * 2,
        };
      });

      bursts.current.push({ x, y, sparks });
    };

    // Initial burst then periodic
    spawnBurst();
    spawnBurst();
    const interval = setInterval(() => {
      if (bursts.current.length < 6) spawnBurst();
    }, 600);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const burst of bursts.current) {
        burst.sparks = burst.sparks.filter((s) => s.life > 0);
        for (const s of burst.sparks) {
          s.x += s.vx;
          s.y += s.vy;
          s.vy += 0.15;
          s.vx *= 0.97;
          s.life -= 1;

          const alpha = s.life / s.maxLife;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = s.color;
          ctx.shadowColor = s.color;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size * alpha, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      bursts.current = bursts.current.filter((b) => b.sparks.length > 0);
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    // Stop after 6 seconds
    const stop = setTimeout(() => {
      clearInterval(interval);
      cancelAnimationFrame(animRef.current);
    }, 6000);

    return () => {
      clearInterval(interval);
      clearTimeout(stop);
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
