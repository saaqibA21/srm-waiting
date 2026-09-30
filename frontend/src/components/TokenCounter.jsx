import React, { useState, useEffect } from 'react';
import { WS_BASE_URL } from '../api';

function TokenCounter({ size = 'large', className = '' }) {
  const [tokenInfo, setTokenInfo] = useState({ current: '--', waiting: 0 });
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let ws;
    let retryInterval;

    const connect = () => {
      ws = new WebSocket(WS_BASE_URL);
      ws.onopen = () => {
        setConnected(true);
        if(retryInterval) clearInterval(retryInterval);
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'update') {
            // Assume the backend sends { current: 'T01', waiting: 5 }
            // or we could fetch the counter API here if needed.
            setTokenInfo(prev => ({...prev, ...data.payload}));
          }
        } catch(e) {}
      };
      ws.onclose = () => {
        setConnected(false);
        retryInterval = setTimeout(connect, 3000);
      };
    };

    connect();
    return () => {
      if(ws) ws.close();
      if(retryInterval) clearTimeout(retryInterval);
    };
  }, []);

  const sizeClass = size === 'large' ? 'text-6xl p-8' : 'text-3xl p-4';

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 text-center ${className}`}>
      <div className="flex justify-between items-center px-4 py-2 border-b border-gray-50">
        <span className="text-xs font-semibold text-gray-500 uppercase">Current Token</span>
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
      </div>
      <div className={`font-bold text-blue-600 ${sizeClass}`}>
        {tokenInfo.current}
      </div>
      <div className="bg-gray-50 py-2 text-sm text-gray-600 font-medium rounded-b-xl">
        WAITING: {tokenInfo.waiting}
      </div>
    </div>
  );
}
export default TokenCounter;
