import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../App';

export default function Feed({ status = 'unposted' }) {
  const { posts, setPosts, setSelectedPost, channel, setChannel, language, setLanguage, showToast } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [sort, setSort] = useState('desc');
  const [limit, setLimit] = useState('50');
  const [savedChannels, setSavedChannels] = useState([]);

  // Bulk features state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [progress, setProgress] = useState({ active: false, percent: 0, text: '' });

  // Auto load from DB on mount or status change
  useEffect(() => {
    loadChannels();
    if (channel) {
      loadFeedFromDB(channel, sort, limit);
    }
  }, [status]);

  const loadChannels = async () => {
    try {
      const r = await fetch('/api/source-channels');
      const data = await r.json();
      if (data.sources) setSavedChannels(data.sources);
    } catch (e) {}
  };

  const loadFeedFromDB = async (ch, currentSort, currentLimit) => {
    if (!ch) return;
    setLoading(true);
    localStorage.setItem('sfj_source_channel', ch);
    try {
      const r = await fetch(`/api/feed-db?channel=${encodeURIComponent(ch)}&sort=${currentSort}&status=${status}`);
      const data = await r.json();
      let p = data.posts || [];
      if (currentLimit !== 'all') {
        p = p.slice(0, parseInt(currentLimit, 10));
      }
      setPosts(p);
    } catch (err) {
      showToast('Error loading feed', 'error');
    }
    setLoading(false);
  };

  const fetchPosts = async () => {
    const cleanChannel = channel.replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '').trim();
    if (!cleanChannel) return showToast('Please enter a channel username', 'error');
    
    setFetching(true);
    try {
      const r = await fetch(`/api/fetch-feed?channel=${encodeURIComponent(cleanChannel)}`);
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      setChannel(cleanChannel);
      await loadFeedFromDB(cleanChannel, sort, limit);
      await loadChannels();
      showToast('Import successful', 'success');
    } catch (err) {
      showToast('Import failed: ' + err.message, 'error');
    }
    setFetching(false);
  };

  const handleSortChange = (e) => {
    setSort(e.target.value);
    loadFeedFromDB(channel, e.target.value, limit);
  };

  const handleLimitChange = (e) => {
    setLimit(e.target.value);
    loadFeedFromDB(channel, sort, e.target.value);
  };

  const basePrompt = `Goal:
Make each Post ID suitable for Telegram/Facebook job posting. The current version is too long, too repetitive, and sometimes adds information that was not clearly provided in the original post.

Rules:
1. Keep every original POST_ID exactly as it is.
2. Keep this line before every post:
   === IMAGE_KEYWORD: keyword ===
3. Each post should be around 80–120 words only.
4. Do not invent responsibilities, requirements, or benefits if the original post did not provide them.
5. If information is missing, keep the wording simple and general.
6. Remove repetitive long introductions.
7. Remove unnecessary corporate-style paragraphs.
8. For posts that are not real job vacancies, such as event, wellness, or awareness posts, convert them into short career/community content instead of forcing them into a job vacancy format.
9. Keep the tone professional, warm, motivating, and clear.
10. Use simple bullet points.
11. Keep confirmed details only, such as position title, salary, location, working hours, contact, and benefits.
12. Standardize the CTA at the end of every post as:

🔗 Apply your CV to:
Telegram: @seekfitjob
Email: hr@seekfitjob.com
——————————————
TG Channel: t.me/SeekFitJobKH
More jobs: www.seekfitjob.com

Preferred format per post:

[Strong emoji] [Short job title or opportunity headline]

[1 short sentence introducing the opportunity.]

Open Position / Details:
• ...

Requirements / Ideal Candidate:
• ...

Benefits / Offer:
• ...

🔗 Apply your CV to:
Telegram: @seekfitjob
Email: hr@seekfitjob.com
SEEKFITJOB_[INSERT_POST_ID]
——————————————
TG Channel: t.me/SeekFitJobKH
More jobs: www.seekfitjob.com

Important:
If the original post only has limited information, do not expand it too much. Keep it clean, short, and accurate.
When replacing [INSERT_POST_ID] with the POST_ID, only use the number part (e.g., if POST_ID is channel_name/1234, write SEEKFITJOB_1234).

`;

  const copyPrompt = (e, text) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${basePrompt}Original Post:\n${text}`)
      .then(() => showToast('Prompt copied', 'success'))
      .catch(() => showToast('Copy failed', 'error'));
  };

  const handleCopyAll = () => {
    const ungenerated = posts.filter(p => !p.generated_text);
    if (ungenerated.length === 0) return showToast('No ungenerated posts to copy', 'error');
    
    // Add the system instructions once at the very top
    let combined = basePrompt + "\n\nHere are the posts to convert:\n\n";
    
    ungenerated.forEach(p => {
      combined += `=== POST_ID: ${p.id} ===\nOriginal Post:\n${p.text}\n\n\n`;
    });
    navigator.clipboard.writeText(combined)
      .then(() => showToast(`Copied ${ungenerated.length} prompts!`, 'success'))
      .catch(() => showToast('Copy failed', 'error'));
  };

  const handleBulkGenerate = async () => {
    const ungenerated = posts.filter(p => !p.generated_text);
    if (ungenerated.length === 0) return showToast('All posts are already generated!', 'success');
    if (!window.confirm(`You are about to generate ${ungenerated.length} posts. Proceed?`)) return;

    setProgress({ active: true, percent: 0, text: `Generating 0 of ${ungenerated.length}...` });
    
    let successCount = 0;
    for (let i = 0; i < ungenerated.length; i++) {
      const p = ungenerated[i];
      try {
        await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            post: p.text, 
            language,
            post_id: p.id,
            channel: p.channel || (channel !== 'ALL' ? channel : localStorage.getItem('sfj_source_channel')) || ''
          })
        });
        successCount++;
      } catch(err) {
        console.error('Failed to generate for post', p.id);
      }
      setProgress({ active: true, percent: Math.round(((i + 1) / ungenerated.length) * 100), text: `Generating ${i + 1} of ${ungenerated.length}...` });
    }
    
    setProgress({ active: false, percent: 0, text: '' });
    showToast(`Successfully generated ${successCount} posts!`, 'success');
    loadFeedFromDB(channel, sort, limit);
  };

  const [duplicateWarning, setDuplicateWarning] = useState(null);

  const performImport = async (items) => {
    setDuplicateWarning(null);
    setShowBulkModal(false);
    setProgress({ active: true, percent: 50, text: `Saving ${items.length} posts...` });

    try {
      const r = await fetch('/api/save-manual-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      
      setProgress({ active: true, percent: 100, text: 'Done!' });
      showToast(data.message, 'success');
      setBulkText('');
      loadFeedFromDB(channel, sort, limit);
    } catch(err) {
      showToast('Import failed: ' + err.message, 'error');
    }
    
    setTimeout(() => setProgress({ active: false, percent: 0, text: '' }), 500);
  };

  const handleBulkImport = async () => {
    if (!bulkText.trim()) return showToast('Please paste content first', 'error');
    
    const currentPostMap = {};
    posts.forEach(p => { currentPostMap[p.id] = p; });

    const sections = bulkText.split('=== POST_ID: ');
    const itemsToSave = [];
    
    for (let i = 1; i < sections.length; i++) {
      const section = sections[i];
      const endOfIdIndex = section.indexOf(' ===');
      if (endOfIdIndex === -1) continue;
      
      const postId = section.substring(0, endOfIdIndex).trim();
      let content = section.substring(endOfIdIndex + 4).trim();
      
      let image_keyword = '';
      const keywordMatch = content.match(/===\s*IMAGE_KEYWORD:\s*(.*?)\s*===/i);
      if (keywordMatch) {
        image_keyword = keywordMatch[1].trim();
        content = content.replace(keywordMatch[0], '').trim();
      }
      
      if (postId && content) {
        // Look up the correct channel for this post. 
        // Fallback to state 'channel' only if it's not 'ALL'.
        const postChannel = currentPostMap[postId]?.channel || (channel !== 'ALL' ? channel : null);
        
        if (postChannel) {
          itemsToSave.push({ post_id: postId, channel: postChannel, text: content, image_keyword });
        } else {
          console.warn(`Could not determine channel for post ${postId}`);
        }
      }
    }

    if (itemsToSave.length === 0) return showToast('No valid POST_ID markers found, or channels could not be matched.', 'error');

    const duplicates = [];
    itemsToSave.forEach(item => {
      if (currentPostMap[item.post_id] && currentPostMap[item.post_id].generated_text) {
        duplicates.push(item.post_id);
      }
    });

    if (duplicates.length > 0) {
      setDuplicateWarning({ duplicates, itemsToSave });
      return;
    }

    performImport(itemsToSave);
  };

  return (
    <section className="w-full lg:w-[420px] xl:w-[460px] h-full flex flex-col bg-white border-r border-gray-200 flex-shrink-0 z-10 shadow-sm">
      
      {/* Topbar / Import Area */}
      <div className="p-5 border-b border-gray-200 bg-white">
        <h2 className="text-gray-900 font-bold text-lg mb-4">Source Feed</h2>
        
        <div className="flex flex-col gap-3">
          <div className="flex bg-gray-50 rounded-lg border border-gray-300 focus-within:border-brand-red transition-colors p-1">
            <input 
              value={channel}
              onChange={e => setChannel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchPosts()}
              type="text" 
              placeholder="@telegram_channel" 
              className="flex-1 bg-transparent border-none text-gray-900 px-3 py-1.5 focus:outline-none text-sm placeholder-gray-400" 
            />
            <button onClick={fetchPosts} disabled={fetching} className="bg-brand-red hover:bg-brand-redHover text-white px-4 py-1.5 rounded-md font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm">
              <svg className={fetching ? 'spin' : ''} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              {fetching ? 'Importing...' : 'Import'}
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2 min-h-[24px]">
            <button onClick={() => { setChannel('ALL'); loadFeedFromDB('ALL', sort, limit); }} className="text-[10px] font-bold text-gray-600 bg-gray-100 border border-gray-200 hover:bg-gray-200 hover:text-gray-900 px-2.5 py-1 rounded-md transition-colors">ALL CHANNELS</button>
            {savedChannels.map(ch => (
              <button key={ch.id} onClick={() => { setChannel(ch.channel_username); loadFeedFromDB(ch.channel_username, sort, limit); }} className="text-[10px] font-bold text-gray-600 bg-gray-100 border border-gray-200 hover:bg-gray-200 hover:text-gray-900 px-2.5 py-1 rounded-md transition-colors">@{ch.channel_username}</button>
            ))}
          </div>
          
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200">
              <button onClick={() => setLanguage('en')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all shadow-sm ${language === 'en' ? 'bg-white text-gray-900 border border-gray-300' : 'text-gray-500 hover:text-gray-800'}`}>EN</button>
              <button onClick={() => setLanguage('km')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all shadow-sm ${language === 'km' ? 'bg-white text-gray-900 border border-gray-300' : 'text-gray-500 hover:text-gray-800'}`}>KM</button>
            </div>
            <div className="flex gap-2">
              <select value={limit} onChange={handleLimitChange} className="bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-red cursor-pointer shadow-sm">
                <option value="10">10 Posts</option>
                <option value="20">20 Posts</option>
                <option value="50">50 Posts</option>
                <option value="100">100 Posts</option>
                <option value="all">All Posts</option>
              </select>
              <select value={sort} onChange={handleSortChange} className="bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-red cursor-pointer shadow-sm">
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>
          {status === 'unposted' && (
            <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
              <button onClick={handleCopyAll} disabled={posts.length === 0} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 px-2 py-1.5 rounded-md font-bold text-[10px] transition-colors shadow-sm">Copy All Prompts</button>
              <button onClick={() => setShowBulkModal(true)} disabled={posts.length === 0} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 px-2 py-1.5 rounded-md font-bold text-[10px] transition-colors shadow-sm">Bulk Import</button>
              <button onClick={handleBulkGenerate} disabled={posts.length === 0} className="flex-1 bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-50 px-2 py-1.5 rounded-md font-bold text-[10px] transition-colors shadow-sm">Bulk AI Generate</button>
            </div>
          )}
        </div>
      </div>
      
      {/* Post List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 relative bg-gray-50/50">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="animate-pulse bg-white border border-gray-200 rounded-xl h-24"></div>)
        ) : posts.length > 0 ? (
          posts.map((p, i) => (
            <div key={i} onClick={() => setSelectedPost(p)} className="cursor-pointer transition-all border border-gray-200 bg-white hover:border-gray-300 hover:shadow-md rounded-xl p-4 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-gray-400">{new Date(p.datetime).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                {p.generated_text ? (
                  <span className="text-[9px] font-black bg-green-50 text-green-600 border border-green-200 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Ready
                  </span>
                ) : (
                  <span className="text-[9px] font-black bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded uppercase tracking-wider">New</span>
                )}
              </div>
              {(p.pub_image && p.pub_image !== 'attached') ? (
                <img src={p.pub_image} className="w-full h-24 object-cover rounded-lg border border-gray-100" />
              ) : (
                p.image && <img src={p.image} className="w-full h-24 object-cover rounded-lg border border-gray-100" />
              )}
              <p className="text-gray-700 text-xs font-medium line-clamp-3 leading-relaxed">{p.pub_text || p.generated_text || p.text}</p>
              <div className="flex gap-2 mt-2">
                <button onClick={(e) => copyPrompt(e, p.text)} className="text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 hover:bg-gray-200 px-2 py-1.5 rounded transition-colors flex-1 shadow-sm">Copy Prompt</button>
                <button className="text-[10px] font-bold text-brand-red bg-brand-redSoft border border-brand-red/20 px-2 py-1.5 rounded transition-colors flex-1 shadow-sm">Open Composer</button>
              </div>
            </div>
          ))
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center mb-3 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <p className="text-gray-700 font-bold">No feed loaded</p>
            <p className="text-gray-500 text-xs mt-1">Import a Telegram channel to view job posts.</p>
          </div>
        )}
      </div>

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900">Bulk Import Prompts</h3>
              <button onClick={() => setShowBulkModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            {duplicateWarning ? (
              <>
                <div className="p-4 bg-orange-50 border-b border-orange-100 flex items-start gap-3">
                  <div className="text-orange-600 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-orange-900 text-sm">Duplicates Detected</h4>
                    <p className="text-xs text-orange-800 mt-1">
                      {duplicateWarning.duplicates.length} of the posts you are trying to import already have generated content in the database.
                    </p>
                  </div>
                </div>
                <div className="p-4 flex-1">
                  <p className="text-xs font-bold text-gray-700 mb-2">Affected Post IDs:</p>
                  <div className="bg-white border border-gray-200 rounded-md p-2 max-h-32 overflow-y-auto custom-scrollbar flex flex-wrap gap-1.5">
                    {duplicateWarning.duplicates.map(id => (
                      <span key={id} className="bg-gray-100 border border-gray-200 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded">
                        {id}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col gap-2">
                  <button onClick={() => performImport(duplicateWarning.itemsToSave)} className="w-full py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50">
                    Overwrite Duplicates (Import All)
                  </button>
                  <button onClick={() => {
                    const safeItems = duplicateWarning.itemsToSave.filter(item => !duplicateWarning.duplicates.includes(item.post_id));
                    if (safeItems.length === 0) {
                      setDuplicateWarning(null);
                      setShowBulkModal(false);
                      showToast('No new posts to import', 'success');
                    } else {
                      performImport(safeItems);
                    }
                  }} className="w-full py-2 bg-brand-red text-white rounded-lg text-xs font-bold hover:bg-brand-redHover">
                    Remove Duplicates & Import Remaining
                  </button>
                  <button onClick={() => setDuplicateWarning(null)} className="w-full py-2 bg-transparent text-gray-500 rounded-lg text-xs font-bold hover:text-gray-700 mt-1">
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-4">
                  <p className="text-xs text-gray-500 mb-2">Paste the generated content from ChatGPT below. Make sure it includes the <code className="bg-gray-100 px-1 rounded text-brand-red">=== POST_ID: ... ===</code> markers.</p>
                  <textarea 
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    className="w-full h-64 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 focus:border-brand-red focus:outline-none custom-scrollbar"
                    placeholder="=== POST_ID: 123 ===&#10;Your generated text here...&#10;&#10;=== POST_ID: 124 ===&#10;Your next generated text here..."
                  />
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
                  <button onClick={() => setShowBulkModal(false)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button onClick={handleBulkImport} className="px-4 py-2 bg-brand-red text-white rounded-lg text-xs font-bold hover:bg-brand-redHover">
                    Import {Math.max(0, bulkText.split('=== POST_ID: ').length - 1)} Posts
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Progress Overlay */}
      {progress.active && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8">
          <div className="w-16 h-16 border-4 border-gray-100 border-t-brand-red rounded-full animate-spin mb-4"></div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">{progress.percent}%</h3>
          <p className="text-sm font-medium text-gray-500">{progress.text}</p>
          <div className="w-full max-w-xs bg-gray-200 rounded-full h-2 mt-4 overflow-hidden">
            <div className="bg-brand-red h-full transition-all duration-300" style={{ width: `${progress.percent}%` }}></div>
          </div>
        </div>
      )}

    </section>
  );
}
