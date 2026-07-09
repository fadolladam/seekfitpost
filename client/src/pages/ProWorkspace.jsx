import React, { useContext, useEffect } from 'react';
import { AppContext } from '../App';
import Feed from '../components/Feed';
import Composer from '../components/Composer';

export default function ProWorkspace() {
  const { posts, selectedPost, setSelectedPost, showToast } = useContext(AppContext);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in an input or textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.ctrlKey && e.key === 'g') {
        e.preventDefault();
        // Trigger AI Generate
        const btn = document.getElementById('btn-generate-ai');
        if (btn && !btn.disabled) {
          btn.click();
        } else {
          showToast('Cannot generate right now. Please select a post.', 'error');
        }
      }

      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        // Trigger Publish
        const btn = document.getElementById('btn-publish-all');
        if (btn && !btn.disabled) {
          btn.click();
        } else {
          showToast('Cannot publish right now. Check if all required fields are filled and the confirmation box is checked.', 'error');
        }
      }

      // Up / Down arrow navigation for Feed
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (posts.length === 0) return;

        const currentIndex = selectedPost ? posts.findIndex(p => p.id === selectedPost.id) : -1;
        
        let newIndex = currentIndex;
        if (e.key === 'ArrowDown') {
          newIndex = currentIndex < posts.length - 1 ? currentIndex + 1 : 0;
        } else if (e.key === 'ArrowUp') {
          newIndex = currentIndex > 0 ? currentIndex - 1 : posts.length - 1;
        }

        setSelectedPost(posts[newIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [posts, selectedPost, setSelectedPost, showToast]);

  return (
    <main className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden relative">
      <Feed status="unposted" isPro={true} />
      <Composer isPro={true} />
    </main>
  );
}
