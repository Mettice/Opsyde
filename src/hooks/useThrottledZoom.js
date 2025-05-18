import { useCallback, useRef } from 'react';
import { throttle } from 'lodash';

const useThrottledZoom = (flowInstance, delay = 16) => {
  const zoomRef = useRef(1);

  const throttledZoom = useCallback(
    throttle((amount) => {
      if (flowInstance.current) {
        const nextZoom = Math.min(Math.max(zoomRef.current + amount, 0.1), 2);
        zoomRef.current = nextZoom;
        flowInstance.current.setZoom(nextZoom);
      }
    }, delay),
    [flowInstance]
  );

  const zoomIn = useCallback(() => throttledZoom(0.2), [throttledZoom]);
  const zoomOut = useCallback(() => throttledZoom(-0.2), [throttledZoom]);
  const resetZoom = useCallback(() => {
    if (flowInstance.current) {
      zoomRef.current = 1;
      flowInstance.current.setZoom(1);
      flowInstance.current.fitView();
    }
  }, [flowInstance]);

  return { zoomIn, zoomOut, resetZoom };
};

export default useThrottledZoom; 