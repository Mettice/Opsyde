import { useState, useCallback, useRef } from 'react';

const useThrottledViewport = (delay = 16) => {
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const timeoutRef = useRef(null);
  const pendingViewportRef = useRef(null);

  const throttledSetViewport = useCallback((newViewport) => {
    pendingViewportRef.current = newViewport;

    if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(() => {
        if (pendingViewportRef.current) {
          setViewport(pendingViewportRef.current);
          pendingViewportRef.current = null;
        }
        timeoutRef.current = null;
      }, delay);
    }
  }, [delay]);

  return [viewport, throttledSetViewport];
};

export default useThrottledViewport; 