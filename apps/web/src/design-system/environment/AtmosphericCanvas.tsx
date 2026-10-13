// ============================================================
// Civiora Cinematic Rotating Digital Earth Background
// MotionSites Asset Integration: Luminous Violet Digital Earth
// Butter-smooth 60fps GPU Compositing + Zero-Stall Native Looping
// ============================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';

const EARTH_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_104036_bd6924f6-3c8e-417e-8465-6d03c8c2e9e6.mp4';

const EARTH_POSTER_URL =
  'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/82e7eb75-c65f-490a-99b5-f3d1cad54200.webp';

export interface AtmosphericCanvasProps {
  intensity?: 'subtle' | 'vibrant' | 'emergency';
  interactive?: boolean;
}

export const AtmosphericCanvas: React.FC<AtmosphericCanvasProps> = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [playbackFailed, setPlaybackFailed] = useState(false);

  // Check user preference for reduced motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);

    const handler = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Safe playback helper that gracefully handles browser autoplay policies
  const attemptPlay = useCallback(async (video: HTMLVideoElement | null) => {
    if (!video) return false;
    try {
      video.muted = true;
      video.defaultMuted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      return true;
    } catch (err) {
      console.warn('[Civiora Earth Background] Autoplay deferred or rejected:', err);
      return false;
    }
  }, []);

  // Video lifecycle and continuous rotation management
  useEffect(() => {
    if (reducedMotion) {
      if (videoRef.current) videoRef.current.pause();
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    let isMounted = true;

    const handlePlaying = () => {
      if (!isMounted) return;
      setIsVideoPlaying(true);
      setPlaybackFailed(false);
    };

    const handleWaiting = () => {
      // Browser buffering - do not mark as failed or pause
    };

    const handleStalled = () => {
      if (!isMounted) return;
      attemptPlay(video);
    };

    const handleError = (e: Event) => {
      console.warn('[Civiora Earth Background] Video error, retaining poster:', e);
      if (isMounted) setPlaybackFailed(true);
    };

    // Auto-resume playback on tab visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden && video && !reducedMotion) {
        attemptPlay(video);
      }
    };

    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handlePlaying);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('stalled', handleStalled);
    video.addEventListener('error', handleError);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial play attempt
    attemptPlay(video).then((success) => {
      if (!success && isMounted && video.paused) {
        // Attempt once more on next animation frame
        requestAnimationFrame(() => {
          if (isMounted && video) attemptPlay(video);
        });
      }
    });

    return () => {
      isMounted = false;
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handlePlaying);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('stalled', handleStalled);
      video.removeEventListener('error', handleError);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [reducedMotion, attemptPlay]);

  return (
    <div
      id="civiora-earth-background"
      className="position-fixed top-0 start-0 w-100 h-100 overflow-hidden"
      style={{
        zIndex: 0,
        pointerEvents: 'none',
        backgroundColor: '#030712', // Inky deep space black matching the video starfield
      }}
      aria-hidden="true"
    >
      {/* ── Layer 1: High-Resolution Static Poster Backdrop ── */}
      {/* Renders instantly for zero layout shift; smoothly fades when video is rolling */}
      <img
        src={EARTH_POSTER_URL}
        alt=""
        className="w-100 h-100 position-absolute top-0 start-0"
        style={{
          objectFit: 'cover',
          objectPosition: 'center 35%',
          opacity: isVideoPlaying && !reducedMotion && !playbackFailed ? 0 : 1,
          transition: 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
        loading="eager"
      />

      {/* ── Layer 2: Rotating Digital Earth Video ────────────── */}
      {/* Hardware-accelerated GPU compositing + native continuous hardware looping */}
      {!reducedMotion && (
        <video
          ref={videoRef}
          src={EARTH_VIDEO_URL}
          poster={EARTH_POSTER_URL}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          disablePictureInPicture
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 35%',
            opacity: isVideoPlaying ? 1 : 0,
            transition: 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: 'none',
            transform: 'translateZ(0)',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
          }}
        />
      )}
    </div>
  );
};

export default AtmosphericCanvas;

