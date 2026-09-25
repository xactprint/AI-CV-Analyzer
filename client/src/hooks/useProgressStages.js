import { useEffect, useRef, useState } from "react";

/**
 * Steps through `stages` on a timer while `active` is true, so the user always
 * sees forward motion during a long AI call.
 */
export function useProgressStages(stages, active, interval = 2200) {
  const last = stages.length - 1;
  const [index, setIndex] = useState(0);
  const [wasActive, setWasActive] = useState(active);
  const startedAt = useRef(null);

  // Adjusting during render (React's documented pattern for reacting to a prop
  // change) instead of in an effect: a fresh run starts at the first stage and
  // a finished one lands on the last, with no cascading render.
  if (active !== wasActive) {
    setWasActive(active);
    setIndex(active ? 0 : last);
  }

  useEffect(() => {
    if (!active) return undefined;

    startedAt.current = Date.now();
    const id = setInterval(() => {
      setIndex(Math.min(last, Math.floor((Date.now() - startedAt.current) / interval)));
    }, interval);

    return () => clearInterval(id);
  }, [active, interval, last]);

  const current = Math.min(index, last);

  return {
    index: current,
    current: stages[current],
    percent: Math.min(96, Math.round(((current + 1) / stages.length) * 100)),
  };
}

export default useProgressStages;
