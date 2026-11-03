import { useEffect, useState } from 'react';

// Whole seconds left until `targetMs` (epoch ms), ticking once a second and stopping at 0.
export function useCountdown(targetMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  const secondsLeft = Math.max(0, Math.ceil((targetMs - now) / 1000));

  // Resyncs at once when the target moves (e.g. after a resend), then ticks until it is reached.
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = targetMs > Date.now() ? setInterval(tick, 1000) : undefined;
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [targetMs]);

  return secondsLeft;
}

// 75 → '01:15'
export const formatCountdown = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
