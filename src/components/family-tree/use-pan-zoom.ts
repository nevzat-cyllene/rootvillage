"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Transform = { x: number; y: number; k: number };
export type Box = { x: number; y: number; w: number; h: number };

const MIN_K = 0.12;
const MAX_K = 2.2;

const clampK = (k: number) => Math.min(MAX_K, Math.max(MIN_K, k));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Pointer / wheel / pinch pan-zoom for an absolutely positioned canvas layer.
 * Screen = transform.x + canvas.x * k. Panning starts only on elements that
 * do not opt out with `data-no-pan` (cards handle their own gestures).
 */
export function usePanZoom(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [transform, setTransformState] = useState<Transform>({ x: 0, y: 0, k: 1 });
  const transformRef = useRef(transform);
  const animRef = useRef<number | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  /** Set after a pan/pinch that actually moved, so the trailing click can be ignored. */
  const lastGestureMovedRef = useRef(false);
  const gesture = useRef<
    | { kind: "pan"; startX: number; startY: number; origin: Transform; moved: boolean }
    | { kind: "pinch"; startDist: number; startMid: { x: number; y: number }; origin: Transform }
    | null
  >(null);

  const setTransform = useCallback((next: Transform | ((prev: Transform) => Transform)) => {
    const value = typeof next === "function" ? next(transformRef.current) : next;
    transformRef.current = value;
    setTransformState(value);
  }, []);

  const stopAnimation = () => {
    if (animRef.current != null) cancelAnimationFrame(animRef.current);
    animRef.current = null;
  };

  const animateTo = useCallback(
    (target: Transform, duration = 420) => {
      stopAnimation();
      const from = transformRef.current;
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const e = easeOut(t);
        setTransform({
          x: from.x + (target.x - from.x) * e,
          y: from.y + (target.y - from.y) * e,
          k: from.k + (target.k - from.k) * e,
        });
        if (t < 1) animRef.current = requestAnimationFrame(step);
        else animRef.current = null;
      };
      animRef.current = requestAnimationFrame(step);
    },
    [setTransform],
  );

  const viewport = useCallback(() => {
    const el = containerRef.current;
    if (!el) return { w: 1, h: 1, left: 0, top: 0 };
    const rect = el.getBoundingClientRect();
    return { w: rect.width, h: rect.height, left: rect.left, top: rect.top };
  }, [containerRef]);

  /** Fit a canvas-space box into the viewport. */
  const fitTo = useCallback(
    (box: Box, options: { padding?: number; maxK?: number; animate?: boolean; topInset?: number; bottomInset?: number } = {}) => {
      const { padding = 48, maxK = 1, animate = true, topInset = 0, bottomInset = 0 } = options;
      const vp = viewport();
      const availW = Math.max(80, vp.w - padding * 2);
      const availH = Math.max(80, vp.h - padding * 2 - topInset - bottomInset);
      const k = clampK(Math.min(maxK, availW / Math.max(1, box.w), availH / Math.max(1, box.h)));
      const x = (vp.w - box.w * k) / 2 - box.x * k;
      const y = topInset + (vp.h - topInset - bottomInset - box.h * k) / 2 - box.y * k;
      const target = { x, y, k };
      if (animate) animateTo(target);
      else setTransform(target);
    },
    [animateTo, setTransform, viewport],
  );

  /** Zoom around a screen point (defaults to viewport centre). */
  const zoomBy = useCallback(
    (factor: number, at?: { x: number; y: number }, animate = true) => {
      const vp = viewport();
      const px = at ? at.x - vp.left : vp.w / 2;
      const py = at ? at.y - vp.top : vp.h / 2;
      const prev = transformRef.current;
      const k = clampK(prev.k * factor);
      const ratio = k / prev.k;
      const target = { x: px - (px - prev.x) * ratio, y: py - (py - prev.y) * ratio, k };
      if (animate) animateTo(target, 180);
      else setTransform(target);
    },
    [animateTo, setTransform, viewport],
  );

  const toCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const vp = viewport();
      const t = transformRef.current;
      return { x: (clientX - vp.left - t.x) / t.k, y: (clientY - vp.top - t.y) / t.k };
    },
    [viewport],
  );

  // Wheel: zoom (trackpad pinch sends ctrlKey) or pan with shift/plain scroll.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      stopAnimation();
      if (event.ctrlKey || event.metaKey) {
        const factor = Math.exp(-event.deltaY * 0.0022);
        zoomBy(factor, { x: event.clientX, y: event.clientY }, false);
        return;
      }
      // Plain wheel = zoom too (map-like), but softer; shift pans horizontally.
      if (event.shiftKey) {
        setTransform((prev) => ({ ...prev, x: prev.x - event.deltaY, y: prev.y - event.deltaX }));
        return;
      }
      const factor = Math.exp(-event.deltaY * 0.0012);
      zoomBy(factor, { x: event.clientX, y: event.clientY }, false);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [containerRef, setTransform, zoomBy]);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        kind: "pinch",
        startDist: Math.hypot(a!.x - b!.x, a!.y - b!.y),
        startMid: { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 },
        origin: transformRef.current,
      };
      return;
    }
    lastGestureMovedRef.current = false;
    if (target.closest("[data-no-pan]")) return;
    stopAnimation();
    gesture.current = {
      kind: "pan",
      startX: event.clientX,
      startY: event.clientY,
      origin: transformRef.current,
      moved: false,
    };
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (pointers.current.has(event.pointerId)) {
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }
      const g = gesture.current;
      if (!g) return;
      if (g.kind === "pan") {
        const dx = event.clientX - g.startX;
        const dy = event.clientY - g.startY;
        if (!g.moved && Math.hypot(dx, dy) < 3) return;
        g.moved = true;
        setTransform({ x: g.origin.x + dx, y: g.origin.y + dy, k: g.origin.k });
      } else if (g.kind === "pinch" && pointers.current.size >= 2) {
        const [a, b] = [...pointers.current.values()];
        const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        const mid = { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 };
        const vp = viewport();
        const k = clampK(g.origin.k * (dist / Math.max(1, g.startDist)));
        const ratio = k / g.origin.k;
        const sx = g.startMid.x - vp.left;
        const sy = g.startMid.y - vp.top;
        setTransform({
          x: sx - (sx - g.origin.x) * ratio + (mid.x - g.startMid.x),
          y: sy - (sy - g.origin.y) * ratio + (mid.y - g.startMid.y),
          k,
        });
      }
    },
    [setTransform, viewport],
  );

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    const g = gesture.current;
    if (pointers.current.size < 2 && g?.kind === "pinch") {
      gesture.current = null;
      lastGestureMovedRef.current = true;
    }
    if (g?.kind === "pan") {
      lastGestureMovedRef.current = g.moved;
      gesture.current = null;
    }
  }, []);

  useEffect(() => () => stopAnimation(), []);

  return {
    transform,
    transformRef,
    setTransform,
    fitTo,
    zoomBy,
    toCanvas,
    animateTo,
    lastGestureMovedRef,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}
