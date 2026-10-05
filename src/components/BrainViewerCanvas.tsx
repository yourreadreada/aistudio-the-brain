import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Fact, AISource, SOURCE_PALETTE } from '../types/brain';

interface BrainViewerCanvasProps {
  brainName: string;
  facts: Fact[];
  selectedFactId: number | null;
  onSelectFact: (fact: Fact | null) => void;
  searchQuery: string;
  activeSourceFilter: string | null;
}

interface GraphNode {
  id: string;
  isCenter?: boolean;
  isSourceHub?: boolean;
  sourceKey?: AISource;
  fact?: Fact;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  r: number;
  color: string;
  dotColor: string;
  amp: number;
  phase: number;
  phase2: number;
  speed: number;
  twspeed: number;
  label: string;
  subtext?: string;
  branchLevel: number; // 0=center, 1=hub, 2=sub-branch, 3=satellite
}

interface GraphLine {
  a: number;
  b: number;
  color: string;
  baseOpacity: number;
  tier: number; // 0, 1, 2 for multi-layer lighting
  isCrossLink?: boolean;
}

export const BrainViewerCanvas: React.FC<BrainViewerCanvasProps> = ({
  brainName,
  facts,
  selectedFactId,
  onSelectFact,
  searchQuery,
  activeSourceFilter,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredFact, setHoveredFact] = useState<Fact | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Pan & Zoom
  const panRef = useRef({ x: 0, y: 0, zoom: 1 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const didDragRef = useRef(false);

  // Interactive mouse pointer magnetism (mimicking the login page physics)
  const pointerRef = useRef({ x: 99, y: 99 });

  // Sonar wave on search / filter
  const scanTimeRef = useRef(0);

  useEffect(() => {
    scanTimeRef.current = 0;
  }, [searchQuery, activeSourceFilter, brainName]);

  // ADAPTIVE GRAPH GENERATOR BASED ON NODE COUNT (N)
  const { nodes, lines, sourceClusters } = useMemo(() => {
    const nodeList: GraphNode[] = [];
    const lineList: GraphLine[] = [];

    const totalFacts = facts.length;
    // Determine density tier
    const isSparse = totalFacts <= 12;
    const isDense = totalFacts > 45;

    // Distinct sources present in current facts
    const activeSources = Array.from(new Set(facts.map((f) => f.source))) as AISource[];
    const sourcesToDisplay = activeSources.length
      ? activeSources
      : (['claude', 'gpt', 'gemini', 'github'] as AISource[]);

    // Adaptive sizing math
    const baseOrbitRadius = isSparse ? 150 : isDense ? 210 : 180;
    const factBaseRadius = isSparse ? 4.8 : isDense ? 2.8 : 3.6;

    // 1. Center Brain Hub
    const centerIdx = 0;
    nodeList.push({
      id: 'center-hub',
      isCenter: true,
      baseX: 0,
      baseY: 0,
      x: 0,
      y: 0,
      r: isSparse ? 9.5 : isDense ? 7.5 : 8.5,
      color: '#ffffff',
      dotColor: '#ffffff',
      amp: 0,
      phase: 0,
      phase2: 0,
      speed: 0,
      twspeed: 0,
      label: brainName.toUpperCase(),
      subtext: `${totalFacts} memories`,
      branchLevel: 0,
    });

    // 2. Source Hubs arranged radially with adaptive spacing
    const hubIndexBySource: Record<string, number> = {};
    const clusterMeta: { source: AISource; count: number; x: number; y: number; color: string }[] = [];

    sourcesToDisplay.forEach((src, i) => {
      // Angle with slight natural offset
      const angle = (i / sourcesToDisplay.length) * Math.PI * 2 - Math.PI / 2;
      const countForSource = facts.filter((f) => f.source === src).length;

      // Distance slightly scales with the weight of facts in this source
      const weightDistBonus = isDense ? Math.min(30, countForSource * 2.5) : 0;
      const hx = Math.cos(angle) * (baseOrbitRadius + weightDistBonus);
      const hy = Math.sin(angle) * (baseOrbitRadius + weightDistBonus);
      const hubIdx = nodeList.length;
      hubIndexBySource[src] = hubIdx;

      const palette = SOURCE_PALETTE[src] || {
        color: '#ffffff',
        dotColor: '#ffffff',
        name: src,
      };

      clusterMeta.push({
        source: src,
        count: countForSource,
        x: hx,
        y: hy,
        color: palette.color,
      });

      nodeList.push({
        id: `hub-${src}`,
        isSourceHub: true,
        sourceKey: src,
        baseX: hx,
        baseY: hy,
        x: hx,
        y: hy,
        r: isSparse ? 7.5 : isDense ? 5.5 : 6.5,
        color: palette.color,
        dotColor: palette.dotColor,
        amp: 1.2,
        phase: i * 1.5,
        phase2: i * 0.8,
        speed: 0.00035,
        twspeed: 0.001,
        label: palette.name,
        subtext: `${countForSource} facts`,
        branchLevel: 1,
      });

      // Primary stem line from center to source hub (Layer tier 2)
      lineList.push({
        a: centerIdx,
        b: hubIdx,
        color: palette.color,
        baseOpacity: 0.45,
        tier: 2,
      });
    });

    // 3. Fact Nodes clustered adaptively around their source hubs
    // In dense mode: create sub-branch anchors to form dendritic constellations like apex.host
    const subBranchAnchors: Record<string, number[]> = {};

    sourcesToDisplay.forEach((src) => {
      subBranchAnchors[src] = [];
      const hubIdx = hubIndexBySource[src];
      if (hubIdx === undefined) return;
      const hubNode = nodeList[hubIdx];
      const sourceFacts = facts.filter((f) => f.source === src);

      // If dense: generate 2-4 sub-stems
      if (sourceFacts.length >= 6) {
        const subBranchCount = Math.min(4, Math.max(2, Math.floor(sourceFacts.length / 4)));
        for (let s = 0; s < subBranchCount; s++) {
          const stemAngle =
            Math.atan2(hubNode.baseY, hubNode.baseX) +
            (s - (subBranchCount - 1) / 2) * (isDense ? 0.55 : 0.42);
          const stemDist = isDense ? 42 : 36;
          const sx = hubNode.baseX + Math.cos(stemAngle) * stemDist;
          const sy = hubNode.baseY + Math.sin(stemAngle) * stemDist;
          const sIdx = nodeList.length;
          subBranchAnchors[src].push(sIdx);

          const palette = SOURCE_PALETTE[src] || { color: '#9db4ff', dotColor: '#9db4ff' };

          nodeList.push({
            id: `sub-${src}-${s}`,
            baseX: sx,
            baseY: sy,
            x: sx,
            y: sy,
            r: factBaseRadius * 0.9,
            color: palette.color,
            dotColor: palette.dotColor,
            amp: 1.0,
            phase: s * 1.2,
            phase2: s * 0.9,
            speed: 0.0003,
            twspeed: 0.001,
            label: '',
            branchLevel: 2,
          });

          lineList.push({
            a: hubIdx,
            b: sIdx,
            color: palette.color,
            baseOpacity: 0.32,
            tier: 1,
          });
        }
      }
    });

    // Distribute facts around their respective source or sub-branch
    facts.forEach((fact, fIdx) => {
      const hubIdx = hubIndexBySource[fact.source];
      if (hubIdx === undefined) return;
      const hubNode = nodeList[hubIdx];

      const palette = SOURCE_PALETTE[fact.source] || {
        color: '#9db4ff',
        dotColor: '#9db4ff',
      };

      // Determine parent anchor: either the source hub, or an assigned sub-branch
      const anchors = subBranchAnchors[fact.source] || [];
      const hasSubBranches = anchors.length > 0;
      const parentIdx = hasSubBranches
        ? anchors[fIdx % anchors.length]
        : hubIdx;
      const parentNode = nodeList[parentIdx];

      // Adaptive dispersion math
      // When sparse: wide circular fan
      // When dense: dendritic cluster with varying depth
      const seed = fact.id * 149.3 + fIdx * 23;
      const spreadAngle = (seed * Math.PI) / 180;
      const spreadDist = isSparse
        ? 32 + (seed % 48)
        : hasSubBranches
        ? 16 + (seed % 34)
        : 22 + (seed % 55);

      const fx = parentNode.baseX + Math.cos(spreadAngle) * spreadDist;
      const fy = parentNode.baseY + Math.sin(spreadAngle) * spreadDist;
      const factNodeIdx = nodeList.length;

      nodeList.push({
        id: `fact-${fact.id}`,
        fact,
        baseX: fx,
        baseY: fy,
        x: fx,
        y: fy,
        r: factBaseRadius,
        color: palette.color,
        dotColor: palette.dotColor,
        amp: 1.4 + (fact.id % 3) * 0.6,
        phase: fact.id * 0.73,
        phase2: fact.id * 1.25,
        speed: 0.0003 + (fact.id % 4) * 0.0001,
        twspeed: 0.0008 + (fact.id % 3) * 0.0004,
        label: `#${fact.id}`,
        subtext: fact.source,
        branchLevel: 3,
      });

      // Connect to parent
      lineList.push({
        a: parentIdx,
        b: factNodeIdx,
        color: palette.color,
        baseOpacity: 0.24,
        tier: 0,
      });
    });

    // 4. Subtle Cross-Source Synaptic Links:
    // If facts from different sources share topical keywords (e.g. 'code', 'translator', 'audio', 'moodle', 'model'),
    // draw a faint ethereal connection line between them to mimic true associative memory!
    const factNodes = nodeList
      .map((nd, idx) => ({ nd, idx }))
      .filter((item) => Boolean(item.nd.fact));

    const keywords = ['translator', 'audio', 'canteen', 'moodle', 'claude', 'gpt', 'model', 'typescript', 'redis'];
    const addedCrossLinks = new Set<string>();

    for (const kw of keywords) {
      const matches = factNodes.filter(
        (fn) => fn.nd.fact?.content.toLowerCase().includes(kw)
      );
      if (matches.length >= 2) {
        for (let i = 0; i < matches.length - 1; i++) {
          for (let j = i + 1; j < Math.min(i + 3, matches.length); j++) {
            const a = matches[i].idx;
            const b = matches[j].idx;
            const key = a < b ? `${a}-${b}` : `${b}-${a}`;
            if (!addedCrossLinks.has(key)) {
              addedCrossLinks.add(key);
              lineList.push({
                a,
                b,
                color: 'rgba(255, 255, 255, 0.4)',
                baseOpacity: 0.12,
                tier: 0,
                isCrossLink: true,
              });
            }
          }
        }
      }
    }

    return { nodes: nodeList, lines: lineList, sourceClusters: clusterMeta };
  }, [facts, brainName]);

  // Main Render Loop with Multi-Layer Atmospheric Lighting
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = canvas.clientWidth;
    let height = canvas.clientHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      if (!canvas || !ctx) return;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    function handlePointerMove(e: PointerEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const pan = panRef.current;
      const cx = rect.width / 2 + pan.x;
      const cy = rect.height / 2 + pan.y;
      const radius = Math.min(rect.width, rect.height) * 0.45 * pan.zoom;

      pointerRef.current = {
        x: (e.clientX - rect.left - cx) / radius,
        y: (e.clientY - rect.top - cy) / radius,
      };
    }

    function handlePointerLeave() {
      pointerRef.current = { x: 99, y: 99 };
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerleave', handlePointerLeave);

    function render(now: number) {
      if (!ctx) return;
      scanTimeRef.current += 0.016;

      // Deep void black base
      ctx.fillStyle = '#03040a';
      ctx.fillRect(0, 0, width, height);

      const pan = panRef.current;
      const cx = width / 2 + pan.x;
      const cy = height / 2 + pan.y;
      const zoom = pan.zoom;

      // 1. LAYER: 56px Spatial Grid (matches apex.host login pattern)
      const gridSize = 56 * zoom;
      const startX = cx % gridSize;
      const startY = cy % gridSize;

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.022)';
      ctx.lineWidth = 1;
      for (let x = startX; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = startY; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // 2. LAYER: ATMOSPHERIC RADIAL GRADIENT GLOW (Central + AI Source Nebulas)
      // Mimics the login page atmospheric background lighting:
      // Central ambient mist
      const centralMistRadius = Math.min(width, height) * 0.48 * zoom;
      const centerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, centralMistRadius);
      centerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
      centerGlow.addColorStop(0.35, 'rgba(157, 180, 255, 0.025)');
      centerGlow.addColorStop(0.7, 'rgba(10, 14, 28, 0.01)');
      centerGlow.addColorStop(1, 'rgba(3, 4, 10, 0)');
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, width, height);

      // Per-source atmospheric color-coded nebula blooms!
      // Each AI (Claude, GPT, Gemini, GitHub, etc.) casts its own atmospheric ambient lighting
      sourceClusters.forEach((cluster) => {
        const hx = cx + cluster.x * zoom;
        const hy = cy + cluster.y * zoom;
        const bloomRadius = (90 + Math.min(100, cluster.count * 8)) * zoom;

        const nebula = ctx.createRadialGradient(hx, hy, 0, hx, hy, bloomRadius);
        // Extract color and render soft atmospheric glow
        nebula.addColorStop(0, cluster.color + '26'); // ~15% opacity
        nebula.addColorStop(0.5, cluster.color + '0c'); // ~5% opacity
        nebula.addColorStop(1, 'transparent');

        ctx.fillStyle = nebula;
        ctx.fillRect(0, 0, width, height);
      });

      // 3. LAYER: Sonar Scan Wave (active on query or brain switch)
      const scanPeriod = 2.8;
      const scanFrac = (scanTimeRef.current % scanPeriod) / scanPeriod;
      const scanRadius = scanFrac * 500 * zoom;
      const scanAlpha = Math.max(0, 1 - scanFrac) * 0.38;

      ctx.beginPath();
      ctx.arc(cx, cy, scanRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${scanAlpha})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // 4. LAYER: Node Positioning with Organic Oscillation & Pointer Magnetism
      const pX = pointerRef.current.x;
      const pY = pointerRef.current.y;
      const isPointerActive = pX < 9;
      const magnetStrength = 0.035;

      for (let i = 0; i < nodes.length; i++) {
        const nd = nodes[i];
        if (nd.isCenter) {
          nd.x = cx;
          nd.y = cy;
        } else {
          // Harmonic breathing
          const oscX = nd.amp * Math.cos(now * nd.speed + nd.phase);
          const oscY = nd.amp * Math.sin(now * nd.speed * 1.3 + nd.phase);

          // Pointer magnetic deflection (from login constellation)
          let magX = 0;
          let magY = 0;
          if (isPointerActive) {
            const nodeNormX = (nd.baseX) / (width * 0.5);
            const nodeNormY = (nd.baseY) / (height * 0.5);
            const distFromPointer = Math.hypot(nodeNormX - pX, nodeNormY - pY);
            if (distFromPointer < 1.2) {
              const pull = (1.2 - distFromPointer) * magnetStrength * 35;
              magX = pX * pull;
              magY = pY * pull;
            }
          }

          nd.x = cx + (nd.baseX + oscX + magX) * zoom;
          nd.y = cy + (nd.baseY + oscY + magY) * zoom;
        }
      }

      // Check search filter match
      const isSearchActive = Boolean(searchQuery.trim() || activeSourceFilter);

      // 5. LAYER: Multi-Tiered Synaptic Links (3 tiers of atmospheric depth)
      for (let tier = 0; tier < 3; tier++) {
        for (let l = 0; l < lines.length; l++) {
          const ln = lines[l];
          if (ln.tier !== tier) continue;

          const na = nodes[ln.a];
          const nb = nodes[ln.b];
          if (!na || !nb) continue;

          const isFactLine = Boolean(nb.fact);
          let opacity = ln.baseOpacity;

          if (selectedFactId && nb.fact) {
            opacity = nb.fact.id === selectedFactId ? 0.9 : 0.04;
          } else if (isSearchActive && nb.fact) {
            const matches =
              (!activeSourceFilter || nb.fact.source === activeSourceFilter) &&
              (!searchQuery || nb.fact.content.toLowerCase().includes(searchQuery.toLowerCase()));
            opacity = matches ? 0.8 : 0.05;
          }

          ctx.beginPath();
          ctx.moveTo(na.x, na.y);
          ctx.lineTo(nb.x, nb.y);

          if (ln.isCrossLink) {
            ctx.strokeStyle = ln.color;
            ctx.setLineDash([3, 5]);
            ctx.lineWidth = 0.8;
          } else {
            ctx.strokeStyle = ln.color;
            ctx.setLineDash([]);
            ctx.lineWidth = isFactLine ? 0.85 : 1.4;
          }

          ctx.globalAlpha = opacity;
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;

          // Animated synapsing pulse particle along line
          if (opacity > 0.15 && !ln.isCrossLink) {
            const pulseT = (now * 0.00045 + (l % 7) * 0.14) % 1;
            const px = na.x + (nb.x - na.x) * pulseT;
            const py = na.y + (nb.y - na.y) * pulseT;

            ctx.beginPath();
            ctx.arc(px, py, 1.4 * Math.sqrt(zoom), 0, Math.PI * 2);
            ctx.fillStyle = ln.color;
            ctx.globalAlpha = Math.min(1, opacity * 1.5);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        }
      }

      // 6. LAYER: Nodes with Luminescent Outer Halos
      for (let i = 0; i < nodes.length; i++) {
        const nd = nodes[i];
        const isSelected = nd.fact && nd.fact.id === selectedFactId;
        const isHovered = nd.fact && hoveredFact?.id === nd.fact.id;

        let alpha = 0.85;
        if (nd.fact) {
          if (selectedFactId) {
            alpha = isSelected ? 1 : 0.14;
          } else if (isSearchActive) {
            const matches =
              (!activeSourceFilter || nd.fact.source === activeSourceFilter) &&
              (!searchQuery || nd.fact.content.toLowerCase().includes(searchQuery.toLowerCase()));
            alpha = matches ? (isHovered ? 1 : 0.92) : 0.14;
          } else {
            alpha = 0.58 + 0.32 * Math.sin(now * nd.twspeed + nd.phase2);
          }
        }

        const radius = nd.r * Math.sqrt(zoom) * (isSelected || isHovered ? 1.45 : 1);

        // Nodal Halo Aura
        if (isSelected || isHovered || nd.isCenter || nd.isSourceHub) {
          ctx.beginPath();
          ctx.arc(nd.x, nd.y, radius + (nd.isCenter ? 12 : 7), 0, Math.PI * 2);
          ctx.fillStyle = nd.color;
          ctx.globalAlpha = nd.isCenter ? 0.12 : isSelected || isHovered ? 0.35 : 0.18;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(nd.x, nd.y, radius + (nd.isCenter ? 6 : 3), 0, Math.PI * 2);
          ctx.strokeStyle = nd.dotColor;
          ctx.lineWidth = nd.isCenter ? 1.6 : 1.2;
          ctx.globalAlpha = isSelected || isHovered ? 0.9 : 0.5;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Solid Node Core
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, Math.max(2, radius), 0, Math.PI * 2);
        ctx.fillStyle = nd.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1;

        // Monospace Typography Labels
        // Only show labels for Center, Hubs, or Selected/Hovered facts to keep high visual discipline
        if (nd.isCenter || nd.isSourceHub || isSelected || isHovered) {
          const fontSize = nd.isCenter ? 12.5 : nd.isSourceHub ? 11 : 10;
          ctx.font = `${nd.isCenter ? '600' : '500'} ${fontSize}px JetBrains Mono, monospace`;
          ctx.fillStyle = nd.isCenter ? '#ffffff' : isSelected || isHovered ? '#ffffff' : nd.color;
          ctx.globalAlpha = Math.max(0.65, alpha);
          ctx.fillText(nd.label, nd.x + radius + 7, nd.y + 3.5);

          if (nd.subtext && (nd.isCenter || nd.isSourceHub)) {
            ctx.font = `400 9.5px JetBrains Mono, monospace`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.fillText(nd.subtext, nd.x + radius + 7, nd.y + fontSize + 4);
          }
          ctx.globalAlpha = 1;
        }
      }

      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [nodes, lines, sourceClusters, selectedFactId, hoveredFact, searchQuery, activeSourceFilter]);

  // Pointer Drag & Click
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    didDragRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.hypot(dx, dy) > 4) {
        didDragRef.current = true;
        panRef.current.x += dx;
        panRef.current.y += dy;
        dragStartRef.current = { x: e.clientX, y: e.clientY };
      }
      return;
    }

    // Hit test fact nodes
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let hitFact: Fact | null = null;
    for (const nd of nodes) {
      if (!nd.fact) continue;
      const dist = Math.hypot(mouseX - nd.x, mouseY - nd.y);
      if (dist <= Math.max(12, nd.r * 2.8)) {
        hitFact = nd.fact;
        break;
      }
    }

    setHoveredFact(hitFact);
    if (hitFact) {
      setTooltipPos({ x: e.clientX, y: e.clientY });
    } else {
      setTooltipPos(null);
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    if (!didDragRef.current) {
      if (hoveredFact) {
        onSelectFact(hoveredFact);
      } else {
        onSelectFact(null);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    panRef.current.zoom = Math.max(0.4, Math.min(3.0, panRef.current.zoom * zoomFactor));
  };

  const resetView = () => {
    panRef.current = { x: 0, y: 0, zoom: 1 };
  };

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-[#03040a]">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      />

      {/* Floating View Controls */}
      <div className="pointer-events-auto absolute bottom-5 left-5 flex items-center gap-2 rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 backdrop-blur-md">
        <button
          onClick={() => {
            panRef.current.zoom = Math.min(3.0, panRef.current.zoom * 1.2);
          }}
          className="mono text-xs text-white/70 transition hover:text-white"
          title="Zoom In"
        >
          +
        </button>
        <div className="h-3 w-px bg-white/20" />
        <button
          onClick={() => {
            panRef.current.zoom = Math.max(0.4, panRef.current.zoom * 0.8);
          }}
          className="mono text-xs text-white/70 transition hover:text-white"
          title="Zoom Out"
        >
          −
        </button>
        <div className="h-3 w-px bg-white/20" />
        <button
          onClick={resetView}
          className="mono text-[11px] text-white/50 transition hover:text-white"
        >
          Recenter
        </button>
      </div>

      {/* Hover Tooltip */}
      {hoveredFact && tooltipPos && (
        <div
          className="pointer-events-none fixed z-50 max-w-sm rounded-xl border border-white/20 bg-[#070913]/95 px-3.5 py-2.5 shadow-2xl backdrop-blur-xl transition-all duration-75"
          style={{
            left: `${tooltipPos.x + 16}px`,
            top: `${tooltipPos.y + 16}px`,
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: SOURCE_PALETTE[hoveredFact.source]?.color }}
            />
            <span className="mono text-xs font-semibold uppercase tracking-wider text-white">
              {SOURCE_PALETTE[hoveredFact.source]?.name || hoveredFact.source}
            </span>
            <span className="text-white/30">·</span>
            <span className="mono text-[10px] text-white/50">#{hoveredFact.id}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-white/90 leading-relaxed">
            {hoveredFact.content}
          </p>
          <p className="mono mt-1 text-[10px] text-white/40">
            Click to inspect or correct
          </p>
        </div>
      )}
    </div>
  );
};
