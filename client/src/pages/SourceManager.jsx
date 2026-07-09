import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../App';

export default function SourceManager() {
  const { showToast } = useContext(AppContext);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [form, setForm] = useState({ channel_username: '', channel_name: '' });
  const [saving, setSaving] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/source-channels');
      const data = await r.json();
      if (data.sources) setSources(data.sources);
    } catch (e) {
      showToast('Failed to load source channels', 'error');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.channel_username) return showToast('Username is required', 'error');
    
    setSaving(true);
    try {
      const method = editId ? 'PUT' : 'POST';
      const body = { ...form, id: editId };
      
      const r = await fetch('/api/source-channels', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      
      showToast(editId ? 'Source updated' : 'Source added', 'success');
      setShowModal(false);
      fetchSources();
    } catch (err) {
      showToast(err.message, 'error');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this source channel? Historical posts will remain.')) return;
    try {
      const r = await fetch('/api/source-channels', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      showToast('Source deleted', 'success');
      fetchSources();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const openAdd = () => {
    setForm({ channel_username: '', channel_name: '' });
    setEditId(null);
    setShowModal(true);
  };

  const openEdit = (src) => {
    setForm({ channel_username: src.channel_username, channel_name: src.channel_name || '' });
    setEditId(src.id);
    setShowModal(true);
  };

  const handleSyncAll = async () => {
    if (sources.length === 0) return showToast('No sources to sync.', 'error');
    if (!confirm('This will fetch the latest posts for all your sources. It may take some time. Proceed?')) return;
    
    setSyncingAll(true);
    let successCount = 0;
    
    for (let i = 0; i < sources.length; i++) {
      const src = sources[i];
      setSyncProgress(`Syncing ${src.channel_username} (${i + 1}/${sources.length})...`);
      try {
        const r = await fetch(`/api/fetch-feed?channel=${encodeURIComponent(src.channel_username)}`);
        const data = await r.json();
        if (!data.error) successCount++;
      } catch (e) {
        console.error('Failed to sync ' + src.channel_username, e);
      }
    }
    
    setSyncProgress(null);
    setSyncingAll(false);
    showToast(`Synced successfully! Updates found for ${successCount} channels.`, 'success');
  };

  return (
    <div className="p-8 max-w-5xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            Source Feeds
            {syncingAll && (
              <span className="text-xs font-medium bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-200 animate-pulse flex items-center gap-2">
                <svg className="spin" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                {syncProgress}
              </span>
            )}
          </h1>
          <p className="text-gray-500 mt-1">Manage the Telegram channels you import jobs from.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSyncAll} disabled={syncingAll || loading || sources.length === 0} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-lg font-bold text-sm shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <svg className={syncingAll ? 'spin text-blue-600' : 'text-gray-500'} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
            Sync All
          </button>
          <button onClick={openAdd} className="bg-brand-red hover:bg-brand-redHover text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-md transition-colors flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Add New Source
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Channel Username</th>
                <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Display Name</th>
                <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Added On</th>
                <th className="py-3 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="4" className="py-8 text-center text-gray-400">Loading...</td></tr>
              ) : sources.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-12 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <p className="text-gray-900 font-bold">No sources added yet</p>
                    <p className="text-gray-500 text-sm mt-1">Click "Add New Source" to get started.</p>
                  </td>
                </tr>
              ) : (
                sources.map(src => (
                  <tr key={src.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                        @{src.channel_username}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-800 font-medium">
                      {src.channel_name || <span className="text-gray-400 italic">Not specified</span>}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {new Date(src.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right space-x-3">
                      <button onClick={() => openEdit(src)} className="text-sm font-bold text-gray-500 hover:text-brand-red transition-colors">Edit</button>
                      <button onClick={() => handleDelete(src.id)} className="text-sm font-bold text-gray-400 hover:text-red-600 transition-colors">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-gray-900">{editId ? 'Edit Source' : 'Add Source'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Telegram Username</label>
                <div className="flex bg-white rounded-lg border border-gray-300 focus-within:border-brand-red focus-within:ring-1 focus-within:ring-brand-red transition-all">
                  <span className="px-3 py-2.5 bg-gray-50 border-r border-gray-200 text-gray-500 font-bold rounded-l-lg text-sm">@</span>
                  <input 
                    type="text" 
                    value={form.channel_username}
                    onChange={e => setForm({...form, channel_username: e.target.value})}
                    placeholder="seekfitjobkh"
                    className="flex-1 px-3 py-2.5 bg-transparent border-none text-sm text-gray-900 focus:outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Display Name (Optional)</label>
                <input 
                  type="text" 
                  value={form.channel_name}
                  onChange={e => setForm({...form, channel_name: e.target.value})}
                  placeholder="e.g. SeekFitJob Official"
                  className="w-full px-3 py-2.5 bg-white rounded-lg border border-gray-300 focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-all text-sm text-gray-900 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="bg-brand-red hover:bg-brand-redHover text-white px-5 py-2 rounded-lg font-bold text-sm shadow-md transition-colors disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Source'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
