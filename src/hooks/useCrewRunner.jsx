
import { useState } from 'react';

export default function useCrewRunner() {
  const [logs, setLogs] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const runCrew = async (payload) => {
    setIsRunning(true);
    setLogs("");
    const response = await fetch("http://localhost:8000/run-crew", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let chunk = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunk += decoder.decode(value);
      setLogs(prev => prev + chunk);
    }
    setIsRunning(false);
  };

  return { runCrew, logs, isRunning };
}
