// Paints the scene that shows through the hero letters: a lavender twilight sky with stars,
// light beams, a neural-network constellation and a city skyline. Original artwork, generated
// at runtime, returned as a data URL for use as a CSS background.
export function paintHeroScene(w: number, h: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d")!;

  let seed = 11;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#4a36a8");
  sky.addColorStop(0.38, "#8c74e8");
  sky.addColorStop(0.7, "#e9ddff");
  sky.addColorStop(1, "#b9a5ff");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);

  g.globalCompositeOperation = "screen";
  const glow = (x: number, y: number, r: number, color: string) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, color);
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  };
  glow(w * 0.18, h * 0.22, h * 0.7, "rgba(233,168,255,0.55)");
  glow(w * 0.78, h * 0.18, h * 0.8, "rgba(127,155,255,0.5)");
  glow(w * 0.52, h * 0.7, h * 0.9, "rgba(255,255,255,0.6)");
  glow(w * 0.52, h * 0.72, h * 0.25, "rgba(255,255,255,0.9)");

  for (let i = 0; i < 320; i++) {
    const r = rnd() * 1.4 + 0.3;
    g.fillStyle = `rgba(255,255,255,${0.35 + rnd() * 0.6})`;
    g.beginPath();
    g.arc(rnd() * w, rnd() * h * 0.55, r * (h / 300), 0, Math.PI * 2);
    g.fill();
  }

  // Diagonal light beams.
  for (const [x, y, len, thick, color] of [
    [0.05, 0.42, 0.55, 0.018, "rgba(240,190,255,0.85)"],
    [0.55, 0.2, 0.5, 0.012, "rgba(200,215,255,0.8)"],
    [0.3, 0.12, 0.35, 0.008, "rgba(255,255,255,0.7)"],
  ] as const) {
    g.save();
    g.translate(x * w, y * h);
    g.rotate(-0.28);
    const beam = g.createLinearGradient(0, 0, len * w, 0);
    beam.addColorStop(0, "rgba(255,255,255,0)");
    beam.addColorStop(0.7, color);
    beam.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = beam;
    g.fillRect(0, -(thick * h) / 2, len * w, thick * h);
    g.restore();
  }
  g.globalCompositeOperation = "source-over";

  // Neural-network constellation.
  const nodes = Array.from({ length: 34 }, () => ({ x: rnd() * w, y: rnd() * h * 0.6 }));
  g.strokeStyle = "rgba(255,255,255,0.35)";
  g.lineWidth = Math.max(1, h * 0.004);
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y) < w * 0.11) {
        g.beginPath();
        g.moveTo(nodes[i].x, nodes[i].y);
        g.lineTo(nodes[j].x, nodes[j].y);
        g.stroke();
      }
    }
  }
  for (const n of nodes) {
    g.fillStyle = "rgba(255,255,255,0.9)";
    g.beginPath();
    g.arc(n.x, n.y, h * 0.008, 0, Math.PI * 2);
    g.fill();
  }

  const skyline = (baseY: number, color: string, minH: number, maxH: number, windows: boolean) => {
    let x = 0;
    while (x < w) {
      const bw = w * (0.012 + rnd() * 0.03);
      const bh = h * (minH + rnd() * (maxH - minH));
      g.fillStyle = color;
      g.fillRect(x, baseY - bh, bw, bh + h);
      if (windows) {
        const cell = Math.max(2, h * 0.012);
        for (let wy = baseY - bh + cell; wy < baseY - cell; wy += cell * 2) {
          for (let wx = x + cell; wx < x + bw - cell; wx += cell * 2) {
            if (rnd() < 0.35) {
              g.fillStyle = "rgba(255,240,255,0.75)";
              g.fillRect(wx, wy, cell, cell);
            }
          }
        }
      }
      x += bw + w * 0.002;
    }
  };
  skyline(h * 0.97, "#a291ea", 0.1, 0.24, false);
  skyline(h, "#6f5ac9", 0.05, 0.16, true);

  return canvas.toDataURL("image/jpeg", 0.9);
}
