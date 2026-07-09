import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();
  const currentView = location.pathname === '/' ? 'studio' : location.pathname.substring(1);
  const [health, setHealth] = useState({});

  useEffect(() => {
    fetch('/api/check-config')
      .then(r => r.json())
      .then(d => setHealth(d))
      .catch(() => {});
  }, []);

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col hidden md:flex h-screen bg-white border-r border-gray-200 z-20 shadow-sm">
      <div className="p-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-red flex items-center justify-center shadow-md shadow-brand-redSoft">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div>
            <h1 className="text-gray-900 text-lg font-bold leading-tight">SeekFitJob</h1>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Content Studio</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-6 px-3 flex flex-col gap-2">
        <Link to="/" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${currentView === 'studio' ? 'bg-brand-redSoft text-brand-red font-bold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
          <span className="hidden lg:block text-sm">Content Studio</span>
        </Link>
        <Link to="/posted" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${currentView === 'posted' ? 'bg-brand-redSoft text-brand-red font-bold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span className="hidden lg:block text-sm">Posted History</span>
        </Link>
        <Link to="/sources" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${currentView === 'sources' ? 'bg-brand-redSoft text-brand-red font-bold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
          <span className="hidden lg:block text-sm">Source Feeds</span>
        </Link>
        <Link to="/connections" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${currentView === 'connections' ? 'bg-brand-redSoft text-brand-red font-bold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 font-medium'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1-1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          <span className="hidden lg:block text-sm">API Connections</span>
        </Link>
      </nav>
      
      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">System Status</p>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><span className="text-xs text-gray-500 font-medium">OpenAI</span><span className={`w-1.5 h-1.5 rounded-full ${health.openai ? 'bg-green-500' : 'bg-red-500'}`}></span></div>
          <div className="flex items-center justify-between"><span className="text-xs text-gray-500 font-medium">Publer API</span><span className={`w-1.5 h-1.5 rounded-full ${health.publer_api_token ? 'bg-green-500' : 'bg-red-500'}`}></span></div>
        </div>
      </div>
    </aside>
  );
}
