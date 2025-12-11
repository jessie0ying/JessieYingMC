import React from 'react';
import { GestureType } from '../types';

interface UIOverlayProps {
  loading: boolean;
  gesture: GestureType;
  videoRef: React.RefObject<HTMLVideoElement>;
  onUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({ loading, gesture, videoRef, onUpload }) => {
  return (
    <>
      {/* Hidden Video for MediaPipe */}
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover opacity-0 pointer-events-none -z-10"
        playsInline
        muted
        autoPlay
      />

      {/* Loading Screen */}
      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-gold-500">
          <div className="text-4xl font-serif text-[#FFD700] mb-4 animate-pulse">
            Summoning Christmas Spirit...
          </div>
          <div className="w-12 h-12 border-4 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* HUD / Instructions */}
      {!loading && (
        <div className="absolute inset-0 z-40 pointer-events-none p-6 flex flex-col justify-between">
          <header className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl md:text-5xl font-serif text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
                Merry Christmas
                </h1>
                <p className="text-gray-300 text-sm mt-1 tracking-widest uppercase">Immersive Gesture Experience</p>
            </div>
            <div className="bg-black/30 backdrop-blur-md border border-[#FFD700]/30 p-2 rounded-lg">
                <span className="text-[#FFD700] font-bold text-xs">STATUS: </span>
                <span className={`text-xs font-mono transition-colors duration-300 ${
                    gesture === GestureType.OPEN_HAND ? 'text-green-400' : 
                    gesture === GestureType.FIST ? 'text-red-400' : 
                    gesture === GestureType.POINTING ? 'text-blue-400' : 'text-white'
                }`}>
                    {gesture === GestureType.NONE ? 'SEARCHING HAND...' : 
                     gesture === GestureType.FIST ? 'CLOSED (FIST)' : 
                     gesture === GestureType.OPEN_HAND ? 'EXPLODED (OPEN)' : 
                     gesture === GestureType.POINTING ? 'ZOOMING PHOTO' : 'INTERACTING'}
                </span>
            </div>
          </header>

          <footer className="flex justify-between items-end pb-8">
             {/* Upload Button - Bottom Left */}
             <div className="pointer-events-auto">
                <label className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-xl cursor-pointer transition-all hover:scale-105 active:scale-95 group">
                    <div className="text-2xl group-hover:rotate-12 transition-transform">📷</div>
                    <div className="flex flex-col text-left">
                        <span className="text-[#FFD700] text-sm font-bold">Add Memories</span>
                        <span className="text-xs text-gray-400">Upload Photos</span>
                    </div>
                    <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        className="hidden" 
                        onChange={onUpload} 
                    />
                </label>
             </div>

             {/* Instructions - Center */}
            <div className="flex gap-8 text-center bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 absolute left-1/2 -translate-x-1/2 bottom-8">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full border-2 border-white/50 flex items-center justify-center">✊</div>
                    <span className="text-xs text-gray-300 font-mono">CLOSE</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full border-2 border-white/50 flex items-center justify-center">🖐</div>
                    <span className="text-xs text-gray-300 font-mono">EXPLODE</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-white/50 flex items-center justify-center">☝️</div>
                    <span className="text-xs text-gray-300 font-mono">ZOOM</span>
                </div>
            </div>
            
            {/* Spacer for symmetry or extra controls */}
            <div className="w-[140px]"></div>
          </footer>
        </div>
      )}
      
      {/* Decorative Frame */}
      <div className="absolute inset-0 z-30 pointer-events-none border-[1px] border-[#FFD700]/20 m-4 rounded-xl"></div>
    </>
  );
};