import React, { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';

const ServerStatus = () => {
  const [serverStatus, setServerStatus] = useState({
    connected: false,
    checking: true,
    lastCheck: null
  });

  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await axiosInstance.get('/auth/check-admin-exists');
        setServerStatus({
          connected: true,
          checking: false,
          lastCheck: new Date().toLocaleTimeString()
        });
      } catch (error) {
        console.error('Server check failed:', error);
        setServerStatus({
          connected: false,
          checking: false,
          lastCheck: new Date().toLocaleTimeString()
        });
      }
    };

    // Initial check
    checkServerStatus();

    // Periodic checks every 30 seconds
    const interval = setInterval(checkServerStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`p-3 rounded-xl shadow-xl transition-all duration-300 ${
        serverStatus.connected 
          ? 'bg-emerald-500/90 text-white border-2 border-emerald-600'
          : 'bg-red-500/90 text-white border-2 border-red-600'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-6 h-6 rounded-full ${
            serverStatus.connected ? 'bg-emerald-400' : 'bg-red-400'
          }`}>
            <svg className={`w-6 h-6 ${
              serverStatus.connected ? 'animate-spin' : ''
            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div className="flex-1">
            <span className="font-medium">
              {serverStatus.checking ? 'Checking server...' : 
                serverStatus.connected ? 'Server Connected' : 
                'Server Disconnected'}
            </span>
            {serverStatus.lastCheck && (
              <span className="block text-sm mt-1 opacity-75">
                Last checked: {serverStatus.lastCheck}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerStatus;
