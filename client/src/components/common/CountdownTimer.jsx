import { useEffect, useState } from 'react';

const pad = (value) => String(Math.max(0, value)).padStart(2, '0');

/**
 * Countdown to a target time. Defaults to "end of today" so the promo band
 * always has a meaningful deadline without hard coding a date.
 */
export function CountdownTimer({ target, onComplete, className = '', size = 'md' }) {
  const resolveTarget = () => {
    if (target) return new Date(target).getTime();
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return end.getTime();
  };

  const [remaining, setRemaining] = useState(() => Math.max(0, resolveTarget() - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      const next = Math.max(0, resolveTarget() - Date.now());
      setRemaining(next);
      if (next === 0) {
        onComplete?.();
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const totalSeconds = Math.floor(remaining / 1000);
  const units = [
    { label: 'Hours', value: Math.floor(totalSeconds / 3600) },
    { label: 'Minutes', value: Math.floor((totalSeconds % 3600) / 60) },
    { label: 'Seconds', value: totalSeconds % 60 },
  ];

  const boxClass = size === 'lg' ? 'h-14 w-14 text-xl' : 'h-11 w-11 text-base';

  return (
    <div className={`flex items-center gap-2 ${className}`} role="timer" aria-live="off">
      {units.map((unit, index) => (
        <div key={unit.label} className="flex items-center gap-2">
          <div className="text-center">
            <div className={`grid ${boxClass} place-items-center rounded-xl bg-white/12 font-bold tabular-nums text-white backdrop-blur`}>
              {pad(unit.value)}
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-white/60">{unit.label}</p>
          </div>
          {index < units.length - 1 && <span className="pb-4 text-lg font-bold text-white/40">:</span>}
        </div>
      ))}
    </div>
  );
}

export default CountdownTimer;
