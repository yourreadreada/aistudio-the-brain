import React, { useEffect, useRef } from 'react';

export type ConstellationMood = 'idle' | 'typing' | 'entering';

interface ConstellationProps {
  mood?: ConstellationMood;
  interactive?: boolean;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function getDimensions(width: number, height: number) {
  const wide = width >= 1024;
  return {
    wide,
    radius: Math.min(width, height) * (wide ? 0.62 : 0.58),
    cx: wide ? 0.64 * width : width / 2,
    cy: height / 2,
  };
}

interface NodePoint {
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  delay: number;
  r: number;
  glow: number;
  d: number;
  phase: number;
}

interface LinkEdge {
  a: number;
  b: number;
  delay: number;
}

function generateGraph(totalNodes: number) {
  let seed = 20942;
  const random = () => {
    seed = (1664525 * seed + 0x3c6ef35f) >>> 0;
    return seed / 0x100000000;
  };

  const nodes: NodePoint[] = [];
  const links: LinkEdge[] = [];

  // Root node
  nodes.push({
    x: 0,
    y: 0,
    fromX: 0,
    fromY: 0,
    delay: 0,
    r: 2.6,
    glow: 1,
    d: 0,
    phase: 0,
  });

  const branchCount = Math.max(5, Math.min(11, Math.round(Math.log2(totalNodes))));
  const perBranch = Math.max(8, Math.floor((totalNodes - 1 - branchCount) / branchCount));

  for (let b = 0; b < branchCount; b++) {
    const angle = (b / branchCount) * Math.PI * 2 + (random() - 0.5) * 0.5;
    const dist = 0.24 + 0.14 * random();
    const nx = Math.cos(angle) * dist;
    const ny = Math.sin(angle) * dist;
    const branchRootIdx = nodes.length;

    nodes.push({
      x: nx,
      y: ny,
      fromX: 2.4 * nx,
      fromY: 2.4 * ny,
      delay: 0.1 + 0.1 * random(),
      r: 1.8,
      glow: 0.9,
      d: dist,
      phase: 6.283 * random(),
    });

    links.push({ a: 0, b: branchRootIdx, delay: 0.26 });

    const subCount = 3 + Math.floor(3 * random());
    const subIndices: number[] = [];

    for (let s = 0; s < subCount; s++) {
      const subAngle = angle + (s - (subCount - 1) / 2) * (0.42 + 0.2 * random());
      const subDist = dist + 0.02 + 0.44 * Math.pow(random(), 0.7);
      const sx = Math.cos(subAngle) * subDist;
      const sy = Math.sin(subAngle) * subDist;
      const subIdx = nodes.length;
      subIndices.push(subIdx);

      nodes.push({
        x: sx,
        y: sy,
        fromX: Math.cos(subAngle) * (subDist + 1.4 + random()),
        fromY: Math.sin(subAngle) * (subDist + 1.4 + random()),
        delay: 0.2 + 0.7 * subDist + 0.15 * random(),
        r: 1.25,
        glow: 0.66,
        d: subDist,
        phase: 6.283 * random(),
      });

      links.push({ a: branchRootIdx, b: subIdx, delay: 0.34 + 0.6 * subDist });
    }

    const extraCount = perBranch - subCount;
    for (let e = 0; e < extraCount; e++) {
      const parentIdx = subIndices[Math.floor(random() * subIndices.length)] || branchRootIdx;
      const parentNode = nodes[parentIdx];
      const offsetDist = 0.07 + 0.1 * random();
      const offsetAngle = 6.283 * random();
      const spread = Math.pow(random(), 0.55) * offsetDist;
      const stretch = 0.4 + 0.5 * random();
      const hx = parentNode.x * (1 + offsetDist * stretch * 0.6);
      const hy = parentNode.y * (1 + offsetDist * stretch * 0.6);
      const ux = hx + Math.cos(offsetAngle) * spread;
      const uy = hy + Math.sin(offsetAngle) * spread;
      const totalD = Math.hypot(ux, uy);
      const childIdx = nodes.length;

      nodes.push({
        x: ux,
        y: uy,
        fromX: ux * (1 + 1.6 / Math.max(totalD, 0.08)),
        fromY: uy * (1 + 1.6 / Math.max(totalD, 0.08)),
        delay: 0.24 + 0.8 * totalD + 0.2 * random(),
        r: 0.65 + 0.85 * random(),
        glow: 0.42 + 0.34 * random(),
        d: totalD,
        phase: 6.283 * random(),
      });

      links.push({ a: parentIdx, b: childIdx, delay: 0.4 + 0.7 * totalD });
      if (random() < 0.2) {
        const altIdx = subIndices[Math.floor(random() * subIndices.length)];
        links.push({ a: childIdx, b: altIdx, delay: 0.6 + 0.7 * totalD });
      }
    }
  }

  // Outer constellation satellites
  const outerCount = Math.max(20, Math.floor(0.14 * nodes.length));
  for (let o = 0; o < outerCount; o++) {
    const oAngle = 6.283 * random();
    const oDist = 0.02 + 0.3 * Math.pow(random(), 0.7);
    const ox = Math.cos(oAngle) * oDist;
    const oy = Math.sin(oAngle) * oDist;
    const outIdx = nodes.length;

    nodes.push({
      x: ox,
      y: oy,
      fromX: 6 * ox,
      fromY: 6 * oy,
      delay: 0.06 + 0.7 * oDist + 0.12 * random(),
      r: 0.85 + 0.95 * random(),
      glow: 0.72 + 0.28 * random(),
      d: oDist,
      phase: 6.283 * random(),
    });

    let nearest = 0;
    let minDist = oDist;
    for (let k = 1; k <= branchCount; k++) {
      const nodeK = nodes[k];
      if (!nodeK) break;
      const d = Math.hypot(nodeK.x - ox, nodeK.y - oy);
      if (d < minDist) {
        minDist = d;
        nearest = k;
      }
    }
    links.push({ a: nearest, b: outIdx, delay: 0.2 + 0.7 * oDist });
  }

  return { nodes, links };
}

export const Constellation: React.FC<ConstellationProps> = ({
  mood = 'idle',
  interactive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const moodRef = useRef(mood);
  moodRef.current = mood;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const targetNodeCount = window.innerWidth < 640 ? 450 : 1050;
    const { nodes, links } = generateGraph(targetNodeCount);

    let mouseX = 99;
    let mouseY = 99;
    let animId = 0;
    const startTime = performance.now();
    let enterStartTime = 0;

    function handleResize() {
      if (!canvas || !ctx) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function handlePointerMove(e: PointerEvent) {
      if (!canvas || !interactive) return;
      const rect = canvas.getBoundingClientRect();
      const dims = getDimensions(rect.width, rect.height);
      mouseX = (e.clientX - rect.left - dims.cx) / dims.radius;
      mouseY = (e.clientY - rect.top - dims.cy) / dims.radius;
    }

    function handlePointerLeave() {
      mouseX = 99;
      mouseY = 99;
    }

    handleResize();

    const posX = new Float32Array(nodes.length);
    const posY = new Float32Array(nodes.length);
    const alphaArray = new Float32Array(nodes.length);
    const radiusArray = new Float32Array(nodes.length);

    function render(now: number) {
      if (!ctx) return;
      const elapsed = (now - startTime) / 1000;
      const currentMood = moodRef.current;

      if (currentMood === 'entering' && !enterStartTime) {
        enterStartTime = elapsed;
      }

      const enterProgress = enterStartTime ? Math.min(1, (elapsed - enterStartTime) / 1.1) : 0;
      const enterEase = enterProgress * enterProgress * (3 - 2 * enterProgress);
      const blurFactor = easeOutCubic(Math.max(0, (enterProgress - 0.3) / 0.7));

      // Background color interpolation
      if (enterEase > 0) {
        const rVal = Math.round(5 - 2 * enterEase);
        const gVal = Math.round(5 - enterEase);
        const bVal = Math.round(5 + 5 * enterEase);
        ctx.fillStyle = `rgb(${rVal},${gVal},${bVal})`;
      } else {
        ctx.fillStyle = '#03040a';
      }
      ctx.fillRect(0, 0, width, height);

      const isDesktop = width >= 1024 ? 1 : 0.55;
      const dims = getDimensions(width, height);
      const centerX = dims.cx + (width / 2 - dims.cx) * enterEase;
      const centerY = dims.cy;
      const radius = dims.radius * (1 - 0.938 * enterEase);

      const pulseWave = prefersReducedMotion
        ? -9
        : elapsed < 2.6
        ? 0.62 * elapsed
        : ((elapsed - 2.6) % 7) * 0.34;

      const rot = prefersReducedMotion ? 0 : 0.016 * elapsed;
      const offsetX = mouseX < 9 ? 0.045 * mouseX : 0;
      const offsetY = mouseY < 9 ? 0.045 * mouseY : 0;
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);

      // Compute node positions
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const appear = prefersReducedMotion
          ? 1
          : Math.max(0, Math.min(1, (elapsed - node.delay) / 1.1));
        const appearEase = easeOutCubic(appear);

        let curX = node.fromX + (node.x - node.fromX) * appearEase;
        let curY = node.fromY + (node.y - node.fromY) * appearEase;

        if (!prefersReducedMotion && appear >= 1) {
          const breath = 0.008 * Math.sin(0.55 * elapsed + node.phase);
          curX += curX * breath;
          curY += curY * breath;
        }

        const rotatedX = curX * cosR - curY * sinR + offsetX;
        const rotatedY = curX * sinR + curY * cosR + offsetY;

        posX[i] = centerX + rotatedX * radius;
        posY[i] = centerY + rotatedY * radius;

        // Sonar wave & mouse proximity
        const waveDist = Math.max(0, 1 - 5.5 * Math.abs(node.d - pulseWave));
        const deltaX = rotatedX - (mouseX < 9 ? mouseX : 99);
        const deltaY = rotatedY - (mouseY < 9 ? mouseY : 99);
        const mouseProx = Math.max(0, 1 - 4.2 * Math.hypot(deltaX, deltaY));
        const typingGlow = currentMood === 'typing' ? 0.35 * Math.max(0, 1 - 1.5 * node.d) : 0;

        alphaArray[i] =
          Math.min(
            1,
            (0.86 * node.glow + 0.4 * waveDist + 0.6 * mouseProx + typingGlow) * appear
          ) *
          (1 - 0.92 * blurFactor);

        radiusArray[i] =
          node.r *
          (1 + 0.5 * waveDist + 0.9 * mouseProx) *
          (0.4 + 0.6 * appear) *
          (1 - 0.62 * enterEase);
      }

      // Draw links in 3 layers of intensity
      for (let tier = 0; tier < 3; tier++) {
        ctx.beginPath();
        let hasPoints = false;
        for (let l = 0; l < links.length; l++) {
          const link = links[l];
          const linkAppear = prefersReducedMotion
            ? 1
            : Math.max(0, Math.min(1, (elapsed - link.delay) / 0.9));
          if (linkAppear <= 0) continue;

          const avgAlpha = (alphaArray[link.a] + alphaArray[link.b]) * 0.5;
          if (Math.floor(3 * avgAlpha) === tier) {
            hasPoints = true;
            ctx.moveTo(posX[link.a], posY[link.a]);
            ctx.lineTo(posX[link.b], posY[link.b]);
          }
        }
        if (hasPoints) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${
            (0.028 + 0.045 * tier) * isDesktop * Math.pow(1 - blurFactor, 1.6)
          })`;
          ctx.lineWidth = tier === 2 ? 0.8 : 0.6;
          ctx.stroke();
        }
      }

      // Draw nodes
      for (let i = 0; i < nodes.length; i++) {
        if (alphaArray[i] <= 0.01) continue;
        ctx.beginPath();
        ctx.arc(posX[i], posY[i], Math.max(0.35, radiusArray[i]), 0, 6.2832);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(
          0.96,
          0.92 * alphaArray[i] * isDesktop
        )})`;
        ctx.fill();
      }

      // Central luminescent radial haze
      const hazeFactor =
        Math.min(1, Math.max(0, elapsed - 0.1)) *
        (currentMood === 'typing' ? 1 : 0.7) *
        (1 - blurFactor);
      if (hazeFactor > 0.02) {
        const glowGrad = ctx.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          0.38 * radius + enterEase * dims.radius * 0.1
        );
        glowGrad.addColorStop(
          0,
          `rgba(255, 255, 255, ${Math.min(0.3, 0.055 * hazeFactor)})`
        );
        glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // Enter warp light burst
      if (enterProgress > 0) {
        const burstT = Math.min(1, 1.15 * easeOutCubic(enterProgress));
        const burstRadius = Math.max(width, height) * 0.95 * (0.12 + 0.88 * enterEase);
        const burstGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, burstRadius);
        burstGrad.addColorStop(0, `rgba(255, 255, 255, ${0.92 * burstT})`);
        burstGrad.addColorStop(0.15, `rgba(255, 255, 255, ${0.86 * burstT})`);
        burstGrad.addColorStop(0.27, `rgba(223, 249, 255, ${0.3 * burstT})`);
        burstGrad.addColorStop(0.48, `rgba(157, 180, 255, ${0.1 * burstT})`);
        burstGrad.addColorStop(0.72, `rgba(157, 180, 255, ${0.03 * burstT})`);
        burstGrad.addColorStop(1, 'rgba(157, 180, 255, 0)');
        ctx.fillStyle = burstGrad;
        ctx.fillRect(0, 0, width, height);
      }

      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);

    window.addEventListener('resize', handleResize);
    if (interactive) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerleave', handlePointerLeave);
    }

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (interactive) {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerleave', handlePointerLeave);
      }
    };
  }, [interactive]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
};
