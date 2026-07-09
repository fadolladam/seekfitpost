import React, { useEffect, useState, useContext } from 'react';
import { AppContext } from '../App';

export default function ConnectionCenter() {
  const { showToast, setCurrentView } = useContext(AppContext);
  const [health, setHealth] = useState({
    openai: false,
    telegram_bot: false,
    facebook_token: false,
    linkedin_token: false
  });
  const [loading, setLoading] = useState(true);
  
  const [publerToken, setPublerToken] = useState('');
  const [publerStatus, setPublerStatus] = useState(null); // 'checking' | 'connected' | 'error' | null
  const [publerUser, setPublerUser] = useState('');
  const [publerAccounts, setPublerAccounts] = useState([]);
  
  const [publishingGroups, setPublishingGroups] = useState([]);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupAccounts, setNewGroupAccounts] = useState([]);
  const [editingGroupId, setEditingGroupId] = useState(null);

  const allAccounts = [
    ...publerAccounts,
    ...(health.telegram_bot ? [{ id: 'native_tg', name: 'Telegram Bot (.env)', provider: 'telegram_native', avatar: null }] : []),
    ...(health.facebook_token ? [{ id: 'native_fb', name: 'Facebook Page (.env)', provider: 'facebook_native', avatar: null }] : []),
    ...(health.linkedin_token ? [{ id: 'native_li', name: 'LinkedIn Page (.env)', provider: 'linkedin_native', avatar: null }] : []),
  ];

  useEffect(() => {
    checkHealth();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const r = await fetch('/api/settings');
      const data = await r.json();
      if (data.publer_api_token) {
        setPublerToken(data.publer_api_token);
        testPubler(); // Test token directly via API
      }
      if (data.publer_publishing_groups) {
        setPublishingGroups(JSON.parse(data.publer_publishing_groups));
      }
    } catch (e) {}
  };

  const testPubler = async () => {
    setPublerStatus('checking');
    try {
      // Fetch workspaces to verify connection and get workspace name
      const rWS = await fetch('/api/publer?route=/workspaces');
      if (!rWS.ok) throw new Error('Invalid token');
      const wsData = await rWS.json();
      const wsName = (Array.isArray(wsData) && wsData.length > 0) ? wsData[0].name : 'Connected to Publer';
      setPublerUser(wsName);

      // Fetch accounts to display
      const rAcc = await fetch('/api/publer?route=/accounts');
      if (rAcc.ok) {
        const accData = await rAcc.json();
        if (Array.isArray(accData)) setPublerAccounts(accData);
      }
      setPublerStatus('connected');
    } catch (e) {
      setPublerStatus('error');
    }
  };

  const saveAndTestPubler = async () => {
    if (!publerToken) return showToast('Please enter a Publer token', 'error');
    setPublerStatus('checking');
    try {
      const rSave = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { publer_api_token: publerToken } })
      });
      if (!rSave.ok) throw new Error('Failed to save settings');
      
      const rTest = await fetch('/api/publer?route=/workspaces');
      if (!rTest.ok) throw new Error('Invalid Publer Token');
      const data = await rTest.json();
      
      let wsId = null;
      let wsName = 'Connected to Publer';
      if (Array.isArray(data) && data.length > 0) {
        wsId = data[0].id;
        wsName = data[0].name;
      }
      
      if (wsId) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: { publer_workspace_id: wsId } })
        });
      }

      setPublerStatus('connected');
      setPublerUser(wsName);
      
      // Fetch accounts immediately after successful connection
      const rAcc = await fetch('/api/publer?route=/accounts');
      if (rAcc.ok) {
        const accData = await rAcc.json();
        if (Array.isArray(accData)) setPublerAccounts(accData);
      }

      showToast('Publer connected successfully!', 'success');
    } catch (err) {
      setPublerStatus('error');
      showToast(err.message, 'error');
    }
  };

  const saveGroup = async () => {
    if (!newGroupName) return showToast('Group name is required', 'error');
    if (newGroupAccounts.length === 0) return showToast('Select at least one account', 'error');

    const updatedGroups = editingGroupId
      ? publishingGroups.map(g => g.id === editingGroupId ? { id: g.id, name: newGroupName, accounts: newGroupAccounts } : g)
      : [...publishingGroups, {
          id: Date.now().toString(),
          name: newGroupName,
          accounts: newGroupAccounts
        }];

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { publer_publishing_groups: JSON.stringify(updatedGroups) } })
      });
      setPublishingGroups(updatedGroups);
      setNewGroupName('');
      setNewGroupAccounts([]);
      setShowGroupForm(false);
      setEditingGroupId(null);
      showToast('Publishing group saved!', 'success');
    } catch (e) {
      showToast('Failed to save group', 'error');
    }
  };

  const deleteGroup = async (id) => {
    const updatedGroups = publishingGroups.filter(g => g.id !== id);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { publer_publishing_groups: JSON.stringify(updatedGroups) } })
      });
      setPublishingGroups(updatedGroups);
      showToast('Group deleted', 'success');
    } catch (e) {
      showToast('Failed to delete group', 'error');
    }
  };

  const checkHealth = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/check-config');
      const data = await r.json();
      setHealth(data);
    } catch(err) {
      showToast('Failed to connect to backend', 'error');
    }
    setLoading(false);
  };

  const copyKey = (name) => {
    navigator.clipboard.writeText(`[Server-side Environment Variable]`);
    showToast(`Copied reference for ${name}`, 'success');
  };

  const ConfigCard = ({ title, status, desc }) => (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${status ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
          {status ? 'Connected' : 'Missing'}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-4 h-8">{desc}</p>
      <div className="flex gap-2">
        <input type="password" value="********" readOnly className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 text-xs text-gray-400 focus:outline-none" />
        <button onClick={() => copyKey(title)} className="bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-md font-bold text-[10px] transition-colors">Copy Ref</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setCurrentView('studio')} className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Connection Center</h1>
          <p className="text-gray-500 text-sm font-medium mt-1">Manage API keys and external integrations.</p>
        </div>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 flex gap-3">
        <svg className="text-blue-500 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        <div>
          <h4 className="text-sm font-bold text-blue-900 mb-1">Security Notice</h4>
          <p className="text-xs text-blue-800 leading-relaxed">For security reasons, actual API keys are stored on the server via <code className="bg-blue-100 px-1 rounded">.env.local</code>. This dashboard only reports connection health. To update a key, edit the backend environment variables and restart the server.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-xl">
            <svg className="spin mb-2" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ad261c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            <span className="text-xs font-bold text-gray-600">Verifying connections...</span>
          </div>
        )}
        <ConfigCard title="OpenAI API Key" status={health.openai} desc="Required for AI content generation and translation." />
        <ConfigCard title="Telegram Bot Token" status={health.telegram_bot} desc="Used to publish jobs to your Telegram Channel." />
        <ConfigCard title="Facebook Page Token" status={health.facebook_token} desc="Posts content directly to your Facebook Page." />
        <ConfigCard title="LinkedIn Access Token" status={health.linkedin_token} desc="Publishes updates to your LinkedIn Company Page." />
      </div>

      <div className="mt-8 bg-white border-2 border-brand-redSoft rounded-xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-brand-red"></div>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-red"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              Publer Integration
            </h3>
            <p className="text-sm text-gray-500 mt-1">Connect your Publer account to publish and schedule posts across all platforms simultaneously.</p>
          </div>
          {publerStatus === 'connected' && (
            <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full border border-green-200 flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              {publerUser}
            </span>
          )}
        </div>
        
        <div className="flex gap-3 items-end mb-6">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Publer Access Token</label>
            <input 
              type="password" 
              value={publerToken}
              onChange={e => { setPublerToken(e.target.value); setPublerStatus(null); }}
              placeholder="Paste your Publer API token here..."
              className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-all"
            />
          </div>
          <button 
            onClick={saveAndTestPubler}
            disabled={publerStatus === 'checking' || !publerToken}
            className="bg-brand-red hover:bg-brand-redHover disabled:bg-gray-300 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-md transition-colors flex items-center gap-2"
          >
            {publerStatus === 'checking' && <svg className="spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
            Save & Test Connection
          </button>
        </div>

        {publerStatus === 'connected' && publerAccounts.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-bold text-gray-900">Connected Accounts</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {publerAccounts.map(acc => (
                <div key={acc.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-white hover:shadow-sm transition-all">
                  {acc.avatar ? (
                    <img src={acc.avatar} alt="" className="w-10 h-10 rounded-full bg-gray-200 object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 font-bold uppercase">{acc.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-gray-900 truncate" title={acc.name}>{acc.name}</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">{acc.provider}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Publishing Groups Manager */}
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-gray-900">Publishing Groups</h4>
                {!showGroupForm && (
                  <button onClick={() => setShowGroupForm(true)} className="text-xs font-bold text-brand-red bg-brand-redSoft px-3 py-1.5 rounded hover:bg-brand-red hover:text-white transition-colors">
                    + Create Group
                  </button>
                )}
              </div>
              
              {showGroupForm && (
                <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h5 className="text-xs font-bold text-gray-900 mb-3">New Group Details</h5>
                  <input 
                    type="text" 
                    value={newGroupName} 
                    onChange={e => setNewGroupName(e.target.value)} 
                    placeholder="e.g. Marketing Channels" 
                    className="w-full md:w-1/2 mb-4 bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-brand-red"
                  />
                  <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Select Accounts:</p>
                  <div className="flex flex-col gap-4 mb-4">
                    {allAccounts.length > 0 ? (
                      Object.entries(
                        allAccounts.reduce((groups, acc) => {
                          const provider = acc.provider || 'other';
                          if (!groups[provider]) groups[provider] = [];
                          groups[provider].push(acc);
                          return groups;
                        }, {})
                      ).map(([provider, accounts]) => (
                        <div key={provider} className="bg-white border border-gray-200 rounded-lg p-3">
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-100 pb-1">{provider.replace('_native', ' (Native/Env)')}</h4>
                          <div className="flex flex-wrap gap-2">
                            {accounts.map(acc => (
                              <label key={acc.id} className="flex items-center gap-2 cursor-pointer bg-white border border-gray-200 px-3 py-1.5 rounded-md shadow-sm hover:border-brand-red transition-colors">
                                <input 
                                  type="checkbox"
                                  checked={newGroupAccounts.includes(acc.id)}
                                  onChange={e => {
                                    if (e.target.checked) setNewGroupAccounts([...newGroupAccounts, acc.id]);
                                    else setNewGroupAccounts(newGroupAccounts.filter(id => id !== acc.id));
                                  }}
                                  className="w-3.5 h-3.5 text-brand-red border-gray-300 rounded focus:ring-brand-red"
                                />
                                <div className="flex items-center gap-1.5">
                                  {acc.avatar ? <img src={acc.avatar} alt="" className="w-5 h-5 rounded-full object-cover" /> : <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center"><span className="text-[10px] font-bold text-gray-500">{acc.name.charAt(0)}</span></div>}
                                  <span className="text-xs font-bold text-gray-700">{acc.name}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400">No connected accounts found.</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveGroup} className="bg-brand-red hover:bg-brand-redHover text-white px-4 py-1.5 rounded text-xs font-bold transition-colors">{editingGroupId ? 'Update Group' : 'Save Group'}</button>
                    <button onClick={() => { setShowGroupForm(false); setEditingGroupId(null); }} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-1.5 rounded text-xs font-bold transition-colors">Cancel</button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {publishingGroups.length === 0 ? (
                  <p className="text-xs text-gray-500">No publishing groups created yet.</p>
                ) : (
                  publishingGroups.map(group => (
                    <div key={group.id} className="flex items-center justify-between bg-white border border-gray-200 p-3 rounded-lg">
                      <div>
                        <h5 className="text-sm font-bold text-gray-900">{group.name}</h5>
                        <p className="text-xs text-gray-500 mt-0.5">{group.accounts.length} accounts</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => {
                          setEditingGroupId(group.id);
                          setNewGroupName(group.name);
                          setNewGroupAccounts(group.accounts);
                          setShowGroupForm(true);
                        }} className="text-gray-400 hover:text-blue-500 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                        </button>
                        <button onClick={() => deleteGroup(group.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
