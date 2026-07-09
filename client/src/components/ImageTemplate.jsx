import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

// Using forwardRef so we can capture this node with html-to-image
const ImageTemplate = React.forwardRef(({ companyName, shortDescription, positions, backgroundImage, postId }, ref) => {
  return (
    <div
      ref={ref}
      style={{
        width: '1080px',
        height: '1080px',
        backgroundColor: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      {/* Background graphic container on the right */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '50%',
          height: '100%',
          zIndex: 1
        }}
      >
        {/* We use an SVG clipPath to create the staggered vertical bars effect */}
        <svg width="0" height="0">
          <defs>
            <clipPath id="barsMask">
              <rect x="20" y="250" width="60" height="580" rx="30" />
              <rect x="100" y="170" width="60" height="740" rx="30" />
              <rect x="180" y="120" width="60" height="840" rx="30" />
              <rect x="260" y="80" width="60" height="920" rx="30" />
              <rect x="340" y="120" width="60" height="840" rx="30" />
              <rect x="420" y="170" width="60" height="740" rx="30" />
              <rect x="500" y="250" width="60" height="580" rx="30" />
            </clipPath>
          </defs>
        </svg>

        {/* The actual image masked by the SVG */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#ad261c', // Fallback color
            backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            clipPath: 'url(#barsMask)',
            opacity: 0.9
          }}
        >
          {/* Overlay color tint to match brand */}
          <div style={{ width: '100%', height: '100%', backgroundColor: 'rgba(173,38,28,0.4)' }}></div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }}>
        
        {/* Logo Section */}
        <div style={{ position: 'absolute', top: '72px', left: '72px' }}>
          <img 
            src="/images/seekfitjob_logo v2.png" 
            alt="SeekFitJob Logo" 
            style={{ height: '86px', width: 'auto', objectFit: 'contain' }} 
          />
        </div>

        {/* Content Block */}
        <div style={{ position: 'absolute', top: '190px', left: '72px', width: '480px' }}>
          {postId && (
            <div style={{ color: '#ad261c', fontSize: '24px', fontWeight: 900, marginBottom: '12px', letterSpacing: '1px' }}>
              SEEKFITJOB_{postId}
            </div>
          )}
          <h1 style={{ color: '#ad261c', fontSize: '86px', fontWeight: 900, lineHeight: 1.1, margin: '0 0 32px 0', letterSpacing: '-1px' }}>
            WE'RE<br/>SEEKING
          </h1>
          
          <div style={{ borderLeft: '6px solid #ad261c', paddingLeft: '28px' }}>
            <h3 style={{ color: '#1a202c', fontSize: '42px', fontWeight: 900, margin: '0 0 16px 0', lineHeight: 1.1 }}>
              WE'RE URGENTLY<br />HIRING FOR:
            </h3>

            <p style={{ color: '#4a5568', fontSize: '18px', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              📝 {shortDescription}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {positions.map((pos, idx) => (
                <div key={idx} style={{ color: '#4a5568', fontSize: '20px', fontWeight: 'bold' }}>
                  {idx + 1}. {pos}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* QR Code */}
        <div style={{ position: 'absolute', bottom: '144px', left: '72px' }}>
          <div style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
            <QRCodeSVG value="https://t.me/seekfitjobkh" size={144} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: '43px', left: '72px', right: '72px', display: 'flex', alignItems: 'center', gap: '28px', zIndex: 10 }}>
          <div style={{ backgroundColor: '#ad261c', color: '#fff', padding: '16px 40px', borderRadius: '40px', fontSize: '22px', fontWeight: 'bold', textAlign: 'center', whiteSpace: 'nowrap' }}>
            APPLY NOW
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '22px', fontWeight: 600, whiteSpace: 'nowrap' }}>
            <span style={{ color: '#1a202c' }}>hr@seekfitjob.com</span>
            <span style={{ color: '#cbd5e0' }}>|</span>
            <span style={{ color: '#1a202c' }}>@seekfitjob</span>
            <span style={{ color: '#cbd5e0' }}>|</span>
            <span style={{ color: '#1a202c' }}>seekfitjob.com</span>
          </div>
        </div>

      </div>
    </div>
  );
});

export default ImageTemplate;
