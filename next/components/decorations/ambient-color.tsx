import React from 'react';

import { themeConfig } from '@/lib/theme.config';

export const AmbientColor = () => {
  return (
    <div className="absolute top-0 left-0 w-screen h-screen z-40 pointer-events-none">
      <div
        style={{
          transform: 'translateY(-350px) rotate(-45deg)',
          width: '560px',
          height: '1380px',
          background: `radial-gradient(68.54% 68.72% at 55.02% 31.46%, ${themeConfig.ambientGlow.color1} 0, ${themeConfig.ambientGlow.color2} 50%, transparent 80%)`,
        }}
        className="absolute top-0 left-0"
      />

      <div
        style={{
          transform: 'rotate(-45deg) translate(5%, -50%)',
          transformOrigin: 'top left',
          width: '240px',
          height: '1380px',
          background: `radial-gradient(50% 50% at 50% 50%, ${themeConfig.ambientGlow.color1.replace('.08', '.06')} 0, ${themeConfig.ambientGlow.color2} 80%, transparent 100%)`,
        }}
        className="absolute top-0 left-0"
      />

      <div
        style={{
          position: 'absolute',
          borderRadius: '20px',
          transform: 'rotate(-45deg) translate(-180%, -70%)',
          transformOrigin: 'top left',
          top: 0,
          left: 0,
          width: '240px',
          height: '1380px',
          background: `radial-gradient(50% 50% at 50% 50%, ${themeConfig.ambientGlow.color3} 0, transparent 100%)`,
        }}
        className="absolute top-0 left-0"
      />
    </div>
  );
};
