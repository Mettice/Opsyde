const loadData = async () => {
    try {
      const flows = await fetchFlows();
      setFlows(flows);
      setLoading(false);
    } catch (error) {
      console.error('Error loading flows:', error);
      setError(error.message || 'Failed to load flows');
      setLoading(false);
    }
  };