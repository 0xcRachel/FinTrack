import { useEffect, useRef, useState } from 'react';

export function SwapText({ text, className }: { text: string; className?: string }) {
  const [state, setState] = useState({ current: text, previous: null as string | null, version: 0 });
  const current = useRef(text);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (text === current.current) return;
    const previous = current.current;
    current.current = text;
    setState(state => ({ current: text, previous, version: state.version + 1 }));
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setState(state => ({ ...state, previous: null }));
    }, 360);
  }, [text]);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  return <span className={`ft-swap-text ${className ?? ''}`} key={state.version}>
    {state.previous !== null && <span className="ft-swap-old" aria-hidden="true">{state.previous}</span>}
    <span className="ft-swap-new">{state.current}</span>
  </span>;
}
