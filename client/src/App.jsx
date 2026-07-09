import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Feed from './components/Feed';
import Composer from './components/Composer';
import ConnectionCenter from './pages/ConnectionCenter';
import SourceManager from './pages/SourceManager';
import Toast from './components/Toast';

export const AppContext = React.createContext();

function App() {
  const [toast, setToast] = useState(null);
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [channel, setChannel] = useState(localStorage.getItem('sfj_source_channel') || '');
  const [language, setLanguage] = useState('en');

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <AppContext.Provider value={{
      showToast,
      posts, setPosts,
      selectedPost, setSelectedPost,
      channel, setChannel,
      language, setLanguage
    }}>
      <BrowserRouter>
        <div className="flex h-screen w-full bg-gray-50 text-gray-800 font-sans overflow-hidden">
          <Sidebar />
          
          <Routes>
            <Route path="/" element={
              <main className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden relative">
                <Feed status="unposted" />
                <Composer />
              </main>
            } />
            <Route path="/posted" element={
              <main className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden relative">
                <Feed status="posted" />
                <Composer />
              </main>
            } />
            <Route path="/sources" element={
              <main className="flex-1 h-full overflow-y-auto bg-gray-50/50">
                <SourceManager />
              </main>
            } />
            <Route path="/connections" element={
              <main className="flex-1 h-full overflow-y-auto">
                <ConnectionCenter />
              </main>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {toast && <Toast message={toast.msg} type={toast.type} />}
        </div>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export default App;
