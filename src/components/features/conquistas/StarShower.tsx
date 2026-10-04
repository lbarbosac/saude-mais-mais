import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  twinkle: number;
  twinkleSpeed: number;
  color: string;
}

const COLORS = ["#facc15", "#fde68a", "#fbbf24", "#ffffff", "#a78bfa"];

export default function StarShower() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const stars = useRef<Star[]>([]);

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

    const spawn = () => {
      stars.current.push({
        x: Math.random() * canvas.width,
        y: -10,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 1.5 + Math.random() * 2.5,
        size: 2 + Math.random() * 5,
        opacity: 0.8 + Math.random() * 0.2,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.08 + Math.random() * 0.1,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    };

    const spawnInterval = setInterval(() => {
      if (stars.current.length < 80) spawn();
    }, 80);

    const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, points = 5) => {
      const inner = r * 0.45;
      ctx.beginPath();
      for (let i = 0; i < points * 2; i++) {
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const radius = i % 2 === 0 ? r : inner;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const s of stars.current) {
        s.x += s.vx;
        s.y += s.vy;
        s.twinkle += s.twinkleSpeed;

        const pulse = 0.7 + 0.3 * Math.sin(s.twinkle);

        if (s.y > canvas.height * 0.8) s.opacity -= 0.02;

        ctx.save();
        ctx.globalAlpha = Math.max(0, s.opacity * pulse);
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 8;
        drawStar(ctx, s.x, s.y, s.size);
        ctx.restore();
      }

      stars.current = stars.current.filter((s) => s.opacity > 0 && s.y < canvas.height + 20);
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    const stop = setTimeout(() => {
      clearInterval(spawnInterval);
    }, 4500);

    return () => {
      clearInterval(spawnInterval);
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
