import React from 'react';

export default function Toast({ message, type }) {
  const bg = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-gray-800';
  return (
    <div id="toast-container" className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
      <div className={`px-4 py-3 rounded-lg text-white font-semibold text-sm shadow-lg fade-in ${bg}`}>
        {message}
      </div>
    </div>
  );
}
