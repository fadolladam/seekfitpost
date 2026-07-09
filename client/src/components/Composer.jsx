import React, { useContext, useState, useEffect, useRef } from 'react';
import { AppContext } from '../App';
import * as htmlToImage from 'html-to-image';
import ImageTemplate from './ImageTemplate';

export default function Composer() {
  const { selectedPost, setSelectedPost, posts, setPosts, showToast, language, channel } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('tg');
  const [loadingAI, setLoadingAI] = useState(false);
  
  const [textTg, setTextTg] = useState('');
  const [textFb, setTextFb] = useState('');
  const [textLi, setTextLi] = useState('');
  
  const [activePlatforms, setActivePlatforms] = useState({ tg: false, fb: false, li: false });
  const [publerAccounts, setPublerAccounts] = useState([]);
  const [publishingGroups, setPublishingGroups] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [image, setImage] = useState(null);
  const [checked, setChecked] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [autoSchedule, setAutoSchedule] = useState(false);

  const [health, setHealth] = useState({ telegram_bot: false, facebook_token: false, linkedin_token: false });

  // Fetch Publer Accounts and Groups on mount
  useEffect(() => {
    fetch('/api/publer?route=/accounts')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setPublerAccounts(data);
      })
      .catch(() => {});

    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data.publer_publishing_groups) {
          const parsedGroups = JSON.parse(data.publer_publishing_groups);
          setPublishingGroups(parsedGroups);
          if (parsedGroups.length > 0) {
            setSelectedAccounts(parsedGroups[0].accounts);
            setActiveGroup(parsedGroups[0].id);
          }
        }
      })
      .catch(() => {});
      
    fetch('/api/check-config')
      .then(r => r.json())
      .then(data => setHealth(data))
      .catch(() => {});
  }, []);

  const allAccounts = [
    ...publerAccounts,
    ...(health.telegram_bot ? [{ id: 'native_tg', name: 'Telegram Channel (.env)', provider: 'telegram_native', avatar: null }] : []),
    ...(health.facebook_token ? [{ id: 'native_fb', name: 'Facebook Page (.env)', provider: 'facebook_native', avatar: null }] : []),
    ...(health.linkedin_token ? [{ id: 'native_li', name: 'LinkedIn Page (.env)', provider: 'linkedin_native', avatar: null }] : []),
  ];

  const [search, setSearch] = useState('');
  const [photos, setPhotos] = useState([]);
  const [savingManual, setSavingManual] = useState(false);

  const templateRef = useRef(null);
  const [generatingTemplate, setGeneratingTemplate] = useState(false);
  const [templateData, setTemplateData] = useState({
    companyName: 'SeekFitJob Client',
    shortDescription: 'is looking for experienced candidates to join our team.',
    positions: ['Open Position']
  });

  useEffect(() => {
    if (selectedPost) {
      if (selectedPost.generated_text) {
        setTextTg(selectedPost.generated_text);
        setTextFb(selectedPost.generated_text);
        setTextLi(selectedPost.generated_text);
      } else {
        setTextTg('');
        setTextFb('');
        setTextLi('');
      }
      setImage(selectedPost.image || null);
      
      if (selectedPost.image_keyword) {
        setSearch(selectedPost.image_keyword);
        // We can't call searchUnsplash directly because it depends on `search` state which is async,
        // so we fetch directly with the keyword
        fetch(`/api/search-unsplash?q=${encodeURIComponent(selectedPost.image_keyword)}`)
          .then(r => r.json())
          .then(data => { if(data.photos) setPhotos(data.photos); })
          .catch(() => {});
      } else {
        setSearch('');
        setPhotos([]);
      }
    }
  }, [selectedPost]);

  if (!selectedPost) {
    return (
      <section className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-center p-8">
        <div className="w-16 h-16 bg-white border border-gray-200 shadow-sm rounded-xl flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Workspace</h2>
        <p className="text-gray-500 font-medium mt-2 max-w-sm">Select a job post from the source feed to start generating AI content for multiple platforms.</p>
      </section>
    );
  }

  const generatePost = async () => {
    setLoadingAI(true);
    try {
      const r = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          post: selectedPost.text, 
          language,
          post_id: selectedPost.id,
          channel: selectedPost.channel || channel || localStorage.getItem('sfj_source_channel') || ''
        })
      });
      const data = await r.json();
      if(data.error) throw new Error(data.error);
      
      const content = data.content || '';
      setTextTg(content);
      setTextFb(content);
      setTextLi(content);
      setImage(selectedPost.image || null);
      setChecked(false);
      
      if (data.keyword) {
        setSearch(data.keyword);
        fetch(`/api/search-unsplash?q=${encodeURIComponent(data.keyword)}`)
          .then(r => r.json())
          .then(res => { if(res.photos) setPhotos(res.photos); })
          .catch(() => {});
      }
      
      showToast('AI Draft Generated', 'success');
    } catch(err) {
      showToast('Generation failed: ' + err.message, 'error');
    }
    setLoadingAI(false);
  };

  const saveManual = async () => {
    if (!currentText) return showToast('No content to save.', 'error');
    setSavingManual(true);
    try {
      const r = await fetch('/api/save-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: selectedPost.id,
          channel: selectedPost.channel || channel || localStorage.getItem('sfj_source_channel') || '',
          text: currentText
        })
      });
      const data = await r.json();
      if(data.error) throw new Error(data.error);
      showToast('Manual draft saved successfully!', 'success');
      
      // Keep it synced with other tabs for convenience, like the AI does
      setTextTg(currentText);
      setTextFb(currentText);
      setTextLi(currentText);
    } catch(err) {
      showToast('Save failed: ' + err.message, 'error');
    }
    setSavingManual(false);
  };

  const publishAll = async () => {
    if (!checked) return showToast('Please review and check the confirmation box.', 'error');
    if (selectedAccounts.length === 0) return showToast('Please select at least one account to publish to.', 'error');
    
    if ((scheduleDate || autoSchedule) && selectedAccounts.some(id => id.startsWith('native_'))) {
      return showToast('Native platforms do not support scheduling. Please unselect them or clear the schedule options.', 'error');
    }

    setPublishing(true);
    try {
      const publerIds = selectedAccounts.filter(id => !id.startsWith('native_'));
      const hasNativeTg = selectedAccounts.includes('native_tg');
      const hasNativeFb = selectedAccounts.includes('native_fb');
      const hasNativeLi = selectedAccounts.includes('native_li');

      const promises = [];
      const errors = [];

      if (publerIds.length > 0) {
        let isoDate = null;
        if (scheduleDate) {
          isoDate = new Date(scheduleDate).toISOString();
        }
        promises.push(
          fetch('/api/publish-publer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              text: currentText, 
              image, 
              accounts: publerIds, 
              post_id: selectedPost.id,
              scheduleDate: isoDate,
              autoSchedule
            })
          }).then(r => r.json()).then(data => { if (data.error) errors.push('Publer: ' + data.error); })
        );
      }

      if (hasNativeTg) {
        promises.push(
          fetch('/api/post-telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textTg, image, post_id: selectedPost.id })
          }).then(r => r.json()).then(data => { 
            if (data.error) errors.push('Telegram: ' + data.error); 
            else if (data.results && data.results.some(r => !r.success)) {
              errors.push('Telegram: ' + data.results.find(r => !r.success).error);
            }
          }).catch(err => errors.push('Telegram: ' + err.message))
        );
      }
      
      if (hasNativeFb) {
        promises.push(
          fetch('/api/post-facebook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textFb, image, post_id: selectedPost.id })
          }).then(r => r.json()).then(data => { if (data.error) errors.push('Facebook: ' + data.error); })
        );
      }
      
      if (hasNativeLi) {
        promises.push(
          fetch('/api/post-linkedin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textLi, image, post_id: selectedPost.id })
          }).then(r => r.json()).then(data => { if (data.error) errors.push('LinkedIn: ' + data.error); })
        );
      }
      
      await Promise.all(promises);
      
      if (errors.length > 0) {
        throw new Error(errors.join(' | '));
      }
      
      showToast('Published successfully!', 'success');
      
      // Instantly remove the published post from the feed and close composer
      setPosts(posts.filter(p => p.id !== selectedPost.id));
      setSelectedPost(null);
      
    } catch (err) {
      showToast('Publish failed: ' + err.message, 'error');
    }
    setPublishing(false);
  };

  const searchUnsplash = async () => {
    if(!search) return;
    try {
      const r = await fetch(`/api/search-unsplash?q=${encodeURIComponent(search)}`);
      const data = await r.json();
      if(data.photos) setPhotos(data.photos);
    } catch(err) { showToast('Image search failed', 'error'); }
  };

  const currentText = activeTab === 'tg' ? textTg : activeTab === 'fb' ? textFb : textLi;

  const generateBrandedImage = async (overrideImageUrl = null) => {
    if (!selectedPost) return showToast('Select a post first', 'error');
    if (overrideImageUrl) {
      setImage(overrideImageUrl);
    }
    setGeneratingTemplate(true);
    showToast('Extracting job details via AI...', 'success');
    
    try {
      // 1. Extract details
      const r = await fetch('/api/extract-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post: selectedPost.text })
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error);

      // 2. Set details to state so component updates
      setTemplateData({
        companyName: data.company_name || 'SeekFitJob Client',
        shortDescription: data.short_description || 'is hiring for multiple positions.',
        positions: Array.isArray(data.positions) ? data.positions : ['Open Position']
      });

      showToast('Rendering graphic...', 'success');

      // 3. Give React a moment to render the hidden component with new data
      setTimeout(async () => {
        if (!templateRef.current) return;
        try {
          const dataUrl = await htmlToImage.toPng(templateRef.current, { quality: 1, pixelRatio: 1 });
          setImage(dataUrl);
          showToast('Branded image generated!', 'success');
        } catch (imgErr) {
          showToast('Failed to render image.', 'error');
        } finally {
          setGeneratingTemplate(false);
        }
      }, 500);
      
    } catch (err) {
      showToast('Generation failed: ' + err.message, 'error');
      setGeneratingTemplate(false);
    }
  };

  return (
    <section className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
      
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Content Composer</h2>
        <div className="flex gap-3">
          <button onClick={saveManual} disabled={savingManual || !currentText} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-5 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 shadow-sm">
            <svg className={savingManual ? 'spin' : ''} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            {savingManual ? 'Saving...' : 'Save Manual Draft'}
          </button>
          <button onClick={generatePost} disabled={loadingAI} className="bg-gray-900 hover:bg-gray-800 text-white px-5 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 shadow-md shadow-gray-200">
            <svg className={loadingAI ? 'spin' : ''} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            {loadingAI ? 'Generating AI Draft...' : 'Generate with AI'}
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          
          {/* Editor Column */}
          <div className="flex flex-col gap-6">
            
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                Original Source
              </h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 h-32 overflow-y-auto custom-scrollbar font-medium whitespace-pre-wrap leading-relaxed">
                {selectedPost.text}
              </div>
            </div>

            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 flex-1 flex flex-col min-h-[400px]">
              <div className="flex justify-between items-end mb-4 border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">AI Draft</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Edit content per platform</p>
                </div>
                <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                  <button onClick={() => setActiveTab('tg')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'tg' ? 'bg-white text-brand-red border border-gray-300 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Telegram</button>
                  <button onClick={() => setActiveTab('fb')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'fb' ? 'bg-white text-blue-600 border border-gray-300 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Facebook</button>
                  <button onClick={() => setActiveTab('li')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'li' ? 'bg-white text-blue-700 border border-gray-300 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>LinkedIn</button>
                </div>
              </div>

              <textarea 
                value={activeTab === 'tg' ? textTg : activeTab === 'fb' ? textFb : textLi}
                onChange={(e) => {
                  const v = e.target.value;
                  if(activeTab === 'tg') setTextTg(v);
                  if(activeTab === 'fb') setTextFb(v);
                  if(activeTab === 'li') setTextLi(v);
                }}
                className="flex-1 w-full bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800 font-medium focus:outline-none focus:border-brand-red focus:bg-white custom-scrollbar transition-colors leading-relaxed"
                placeholder={`Generated content for ${activeTab.toUpperCase()}...`}
              ></textarea>
            </div>
            
          </div>
          
          {/* Publish & Assets Column */}
          <div className="flex flex-col gap-6">
            
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden flex flex-col">
              <div className="bg-gray-100 p-3 border-b border-gray-200 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                <span className="ml-2 text-xs font-bold text-gray-500">Live Preview ({activeTab.toUpperCase()})</span>
              </div>
              <div className="bg-gray-200 flex-1 overflow-y-auto custom-scrollbar h-[350px] flex items-center justify-center p-4">
                
                {/* Telegram Preview */}
                {activeTab === 'tg' && (
                  <div className="max-w-sm w-full bg-white rounded-2xl rounded-bl-none shadow-sm p-2 flex flex-col relative">
                    {image && <img src={image} className="w-full object-cover rounded-xl mb-2 max-h-48" />}
                    <div className="px-2 pb-5 text-[13px] text-gray-900 whitespace-pre-wrap font-sans leading-snug">
                      {currentText || <span className="text-gray-400 italic">No content generated yet.</span>}
                    </div>
                    <span className="text-[10px] text-gray-400 absolute bottom-1.5 right-3">12:00 PM</span>
                  </div>
                )}

                {/* Facebook Preview */}
                {activeTab === 'fb' && (
                  <div className="max-w-sm w-full bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    <div className="p-3 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-brand-red text-white flex items-center justify-center font-bold text-xs">SFJ</div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 leading-none">SeekFitJob</h4>
                        <p className="text-[10px] text-gray-500 mt-1">Just now · 🌍</p>
                      </div>
                    </div>
                    <div className="px-3 pb-3 text-[13px] text-gray-800 whitespace-pre-wrap">
                      {currentText || <span className="text-gray-400 italic">No content generated yet.</span>}
                    </div>
                    {image && <img src={image} className="w-full border-t border-gray-100 max-h-56 object-cover" />}
                  </div>
                )}

                {/* LinkedIn Preview */}
                {activeTab === 'li' && (
                  <div className="max-w-sm w-full bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                    <div className="p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center font-bold text-gray-700 text-xs border border-gray-200">SFJ</div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 leading-none">SeekFitJob</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">10,000 followers</p>
                        <p className="text-[10px] text-gray-400">1h • 🌍</p>
                      </div>
                    </div>
                    <div className="px-3 pb-3 text-[13px] text-gray-800 whitespace-pre-wrap">
                      {currentText || <span className="text-gray-400 italic">No content generated yet.</span>}
                    </div>
                    {image && <img src={image} className="w-full border-t border-gray-100 max-h-56 object-cover" />}
                  </div>
                )}
                
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-gray-900">Attach Media</h3>
                <button 
                  onClick={generateBrandedImage} 
                  disabled={generatingTemplate}
                  className="bg-brand-redSoft text-brand-red hover:bg-brand-red hover:text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <svg className={generatingTemplate ? 'spin' : ''} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                  {generatingTemplate ? 'Generating...' : 'Auto-Generate Branded Image'}
                </button>
              </div>
              <div className="flex gap-2 mb-3">
                <input type="text" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchUnsplash()} placeholder="Search Unsplash (e.g. office, meeting)" className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-brand-red" />
                <button onClick={searchUnsplash} className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-bold text-xs transition-colors">Search</button>
              </div>
              <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                {photos.map(p => (
                  <img key={p.id} src={p.thumb} onClick={() => generateBrandedImage(p.regular)} className={`w-20 h-20 object-cover rounded-lg cursor-pointer border-2 transition-all ${image === p.regular ? 'border-brand-red' : 'border-transparent hover:border-gray-300'}`} />
                ))}
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 border-l-4 border-l-brand-red">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Publish Options</h3>

              {publishingGroups.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Quick Select Groups</h4>
                  <div className="flex gap-2 flex-wrap">
                    {publishingGroups.map(group => (
                      <button
                        key={group.id}
                        onClick={() => {
                          setSelectedAccounts(group.accounts);
                          setActiveGroup(group.id);
                        }}
                        className={`text-xs font-bold px-3 py-1.5 rounded-md transition-colors ${activeGroup === group.id ? 'bg-brand-red text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        {group.name}
                      </button>
                    ))}
                    {activeGroup && (
                      <button onClick={() => { setSelectedAccounts([]); setActiveGroup(null); }} className="text-[10px] font-bold text-gray-400 hover:text-red-500 uppercase px-2">Clear</button>
                    )}
                  </div>
                </div>
              )}

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
                    <div key={provider} className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 border-b border-gray-200 pb-2">{provider.replace('_native', ' (Native/Env)')}</h4>
                      <div className="flex gap-4 flex-wrap">
                        {accounts.map(acc => (
                          <label key={acc.id} className="flex items-center gap-2 cursor-pointer group bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-sm hover:border-brand-red transition-colors">
                            <input 
                              type="checkbox" 
                              checked={selectedAccounts.includes(acc.id)} 
                              onChange={e => {
                                setActiveGroup(null);
                                if(e.target.checked) setSelectedAccounts([...selectedAccounts, acc.id]);
                                else setSelectedAccounts(selectedAccounts.filter(id => id !== acc.id));
                              }} 
                              className="w-3.5 h-3.5 text-brand-red border-gray-300 rounded focus:ring-brand-red" 
                            />
                            <div className="flex items-center gap-1.5">
                              {acc.avatar ? <img src={acc.avatar} alt="" className="w-5 h-5 rounded-full object-cover" /> : <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center"><span className="text-[10px] font-bold text-gray-500">{acc.name.charAt(0)}</span></div>}
                              <span className="text-xs font-bold text-gray-700 group-hover:text-gray-900 transition-colors">{acc.name}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-gray-400">No connected accounts found. Please check Settings.</span>
                )}
              </div>
              <div className="flex flex-col gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <span className="text-xs font-bold text-gray-700 block mb-1">Schedule Post via Publer (Optional)</span>
                    <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} disabled={autoSchedule} className="w-full text-xs p-1.5 border border-gray-300 rounded focus:border-brand-red focus:outline-none disabled:opacity-50" />
                  </div>
                  {scheduleDate && !autoSchedule && (
                    <button onClick={() => setScheduleDate('')} className="text-[10px] font-bold text-gray-400 hover:text-red-500 uppercase mt-4">Clear</button>
                  )}
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input type="checkbox" checked={autoSchedule} onChange={e => { setAutoSchedule(e.target.checked); if(e.target.checked) setScheduleDate(''); }} className="w-4 h-4 text-brand-red border-gray-300 rounded focus:ring-brand-red" />
                  <span className="text-xs font-medium text-gray-700">Add to Publer Auto-Schedule Queue</span>
                </label>
              </div>
              <label className="flex items-start gap-3 cursor-pointer group mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="w-4 h-4 mt-0.5 text-brand-red border-gray-300 rounded focus:ring-brand-red" />
                <span className="text-xs font-medium text-gray-700 leading-tight">I have carefully reviewed the generated content for accuracy and brand tone.</span>
              </label>
              <button 
                onClick={publishAll} 
                disabled={publishing || !currentText || !checked || selectedAccounts.length === 0}
                className="w-full bg-brand-red hover:bg-brand-redHover disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold text-sm transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <svg className={publishing ? 'spin' : ''} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4Z"/></svg>
                {publishing ? 'Publishing...' : ((scheduleDate || autoSchedule) ? 'Schedule Post' : 'Publish to Selected Platforms')}
              </button>
            </div>
            
          </div>
        </div>
      </div>

      {/* Hidden container for rendering the image template */}
      <div style={{ position: 'fixed', top: '-9999px', left: '-9999px' }}>
        <ImageTemplate 
          ref={templateRef} 
          companyName={templateData.companyName}
          shortDescription={templateData.shortDescription}
          positions={templateData.positions}
          backgroundImage={image} // The currently selected Unsplash image will act as the template's background pattern
          postId={selectedPost?.id ? (String(selectedPost.id).includes('/') ? String(selectedPost.id).split('/').pop() : selectedPost.id) : null}
        />
      </div>

    </section>
  );
}
