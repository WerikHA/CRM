import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';

export default function N8nLogsView() {
  const [logs, setLogs] = useState<string>('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/n8n/logs');
        if (res.ok) setLogs(await res.text());
      } catch (err) {}
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Activity size={20} /> Logs de Interação n8n
      </h2>
      <div className="bg-gray-900 rounded-2xl p-4 font-mono text-sm text-indigo-400 h-[60vh] overflow-y-auto border border-gray-800 shadow-inner">
        {logs ? logs.split('\n').map((line, i) => <div key={i} className="mb-1">{line}</div>) : 'Nenhum log disponível...'}
      </div>
    </div>
  );
}
