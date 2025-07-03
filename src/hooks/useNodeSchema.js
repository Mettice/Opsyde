import { useState, useEffect } from 'react';

export function useNodeSchema(nodeType) {
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!nodeType) return;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        let res;
        if (typeof window.axios === 'function') {
          res = await window.axios.get(`/api/nodes/schema/${nodeType}`);
          setSchema(res.data?.data || null);
        } else {
          const response = await fetch(`/api/nodes/schema/${nodeType}`);
          const data = await response.json();
          setSchema(data?.data || null);
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [nodeType]);

  return { schema, loading, error };
} 