import { useLayoutEffect, useRef } from 'react';

const GLYPHS = '?/$%&*#@!<>[]{}=+-_~^ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const noise = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
const DURATION = 720;
const OUTRO = 0.3;

export function ScrambleText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(text);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const from = previous.current;
    previous.current = text;
    if (from === text) {
      node.textContent = text;
      return;
    }
    const reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
    if (reduced) {
      node.textContent = text;
      return;
    }

    let frame = 0;
    const started = performance.now();
    node.textContent = Array.from(from).map(char => char === ' ' ? ' ' : noise()).join('');

    const settle = window.setTimeout(() => {
      node.textContent = text;
    }, DURATION + 120);

    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / DURATION);
      let output: string;
      if (t < OUTRO) {
        const progress = t / OUTRO;
        output = Array.from(from).map(char => char === ' ' || Math.random() > progress ? char : noise()).join('');
      } else {
        const progress = (t - OUTRO) / (1 - OUTRO);
        const revealed = Math.floor(progress * text.length);
        output = Array.from(text).map((char, index) => index < revealed || char === ' ' ? char : noise()).join('');
      }
      node.textContent = output || '\u00A0';
      if (t < 1) frame = requestAnimationFrame(tick);
      else node.textContent = text;
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
    };
  }, [text]);

  return <span ref={ref} className={`ma-scramble ${className ?? ''}`} aria-live="off">{text}</span>;
}
