'use client';

import { AlertTriangle, Camera, RefreshCw, Video, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

// Same square-crop-and-resize target `resizeImageToDataUrl` uses for an
// uploaded file, so a camera-captured photo and an uploaded one end up the
// same shape/size.
const CAPTURE_SIZE = 400;

type CameraState = 'requesting' | 'live' | 'denied' | 'unavailable' | 'insecure' | 'error';

/** Waits for the video element to actually have a frame ready — assigning
 * `.srcObject` alone doesn't guarantee a frame is decoded yet, and calling
 * `.play()` before that on some mobile browsers (notably iOS/Android
 * Chrome) silently no-ops, leaving a blank/frozen preview even though the
 * permission prompt was accepted and the stream is technically attached.
 * This is the actual root cause of "camera doesn't connect on my phone"
 * reports — the fix is waiting for readiness, then explicitly starting
 * playback and surfacing (not swallowing) a rejected play(). */
async function playWhenReady(video: HTMLVideoElement): Promise<void> {
  if (video.readyState < 1) {
    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => resolve();
    });
  }
  await video.play();
}

/** "Take Photo" on Register Patient's Patient Photograph card — was a dead
 * button with no handler at all. Requests the camera (prompting the browser
 * permission dialog), lets the officer pick between whichever cameras/
 * capture devices are actually attached (built-in webcam, external USB
 * camera, etc. — desks vary), capture a frame, and hands the resulting data
 * URL back the same way `onPhotoUploaded` already does for an uploaded
 * file. */
export function TakePhotoModal({
  onClose,
  onCapture,
}: {
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>('requesting');
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [devices, setDevices] = useState<{ value: string; label: string }[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const [errorDetail, setErrorDetail] = useState('');

  function stopCurrentStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  // Only resolves labelled device names once permission has actually been
  // granted — calling this before a successful getUserMedia just returns
  // blank labels, so it's called after the stream starts, not on mount.
  async function refreshDeviceList(activeDeviceId?: string) {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const all = await navigator.mediaDevices.enumerateDevices();
    const cameras = all
      .filter((d) => d.kind === 'videoinput')
      .map((d, i) => ({ value: d.deviceId, label: d.label || `Camera ${i + 1}` }));
    setDevices(cameras);
    if (activeDeviceId) setSelectedDeviceId(activeDeviceId);
  }

  async function startStream(deviceId?: string) {
    // getUserMedia is only exposed at all in a secure context (HTTPS, or
    // localhost) — on plain HTTP over a LAN IP (a common way this gets
    // tested against a second device) `navigator.mediaDevices` is simply
    // `undefined` in every modern browser, which looks identical to "no
    // camera hardware" unless checked for separately and reported honestly.
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setCameraState('insecure');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unavailable');
      return;
    }
    setCameraState('requesting');
    setErrorDetail('');
    stopCurrentStream();
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' },
          audio: false,
        });
      } catch (err) {
        // Some devices/browsers reject a `facingMode` constraint they don't
        // recognise as over-constrained rather than just ignoring it — retry
        // once with a bare `video: true` before treating this as a real
        // failure, rather than giving up on the very first attempt.
        const canFallback =
          !deviceId && err instanceof DOMException && err.name === 'OverconstrainedError';
        if (!canFallback) throw err;
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        try {
          await playWhenReady(video);
        } catch {
          // Autoplay was blocked (some browsers require a direct user
          // gesture) — the stream is still live and attached, so leave the
          // officer able to capture; a tap on Capture is itself a user
          // gesture and will resume playback then.
        }
      }
      setCameraState('live');
      const activeId = stream.getVideoTracks()[0]?.getSettings().deviceId;
      await refreshDeviceList(activeId ?? deviceId);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setCameraState('denied');
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setCameraState('unavailable');
      } else if (name === 'NotReadableError') {
        setErrorDetail('The camera is already in use by another app or browser tab.');
        setCameraState('error');
      } else {
        setErrorDetail(
          err instanceof DOMException
            ? `${err.name}: ${err.message}`
            : err instanceof Error
              ? err.message
              : String(err),
        );
        setCameraState('error');
      }
    }
  }

  useEffect(() => {
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      startStream().then(() => {
        if (cancelled) stopCurrentStream();
      });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      stopCurrentStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- retryToken deliberately re-runs this from scratch
  }, [retryToken]);

  function handleDeviceChange(deviceId: string) {
    setSelectedDeviceId(deviceId);
    startStream(deviceId);
  }

  function handleRetry() {
    setRetryToken((t) => t + 1);
  }

  function handleCapture() {
    const video = videoRef.current;
    if (!video) return;
    // Capturing is itself a user gesture — if autoplay was blocked earlier
    // (some mobile browsers require direct interaction), this resumes
    // playback so the frame actually reflects what's in front of the
    // camera right now rather than a stale/blank one.
    if (video.paused) video.play().catch(() => {});

    const canvas = document.createElement('canvas');
    canvas.width = CAPTURE_SIZE;
    canvas.height = CAPTURE_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = Math.max(CAPTURE_SIZE / video.videoWidth, CAPTURE_SIZE / video.videoHeight);
    const w = video.videoWidth * scale;
    const h = video.videoHeight * scale;
    // Mirror horizontally so the preview matches what the officer sees of
    // themselves (or the patient) in the live feed, not a flipped capture.
    ctx.translate(CAPTURE_SIZE, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, CAPTURE_SIZE - (CAPTURE_SIZE - w) / 2 - w, (CAPTURE_SIZE - h) / 2, w, h);

    setCapturedDataUrl(canvas.toDataURL('image/jpeg', 0.85));
  }

  function handleRetake() {
    setCapturedDataUrl(null);
  }

  function handleUsePhoto() {
    if (!capturedDataUrl) return;
    onCapture(capturedDataUrl);
  }

  const stateMessage: Partial<Record<CameraState, string>> = {
    denied:
      'Camera access was denied. Allow camera access for this site in your browser settings, then try again.',
    unavailable: 'No camera or capture device was found. Use Upload Photo instead.',
    insecure:
      'Camera access requires a secure (HTTPS) connection. Ask your administrator to enable HTTPS on this address, or use Upload Photo instead.',
    error: errorDetail
      ? `Could not start the camera (${errorDetail}). Try again, or use Upload Photo instead.`
      : 'Could not start the camera. Try again, or use Upload Photo instead.',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(13,38,48,0.45)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex w-full flex-col overflow-hidden bg-white"
        style={{ maxWidth: 480, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <h2
            className="font-display font-semibold"
            style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
          >
            Take Photo
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[rgba(0,0,0,0.06)] ${FOCUS_RING}`}
          >
            <X style={{ width: 20, height: 20, color: '#4A7080' }} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-6 py-5">
          <div className="flex flex-col items-center gap-4">
            {devices.length > 1 && !capturedDataUrl && (
              <div className="w-full max-w-[320px]">
                <FormSelect
                  id="take-photo-device"
                  value={selectedDeviceId}
                  onChange={handleDeviceChange}
                  options={devices}
                  placeholder="Select camera"
                />
              </div>
            )}

            <div
              className="flex w-full items-center justify-center overflow-hidden"
              style={{
                aspectRatio: '1 / 1',
                borderRadius: 12,
                background: '#0D2630',
                maxWidth: 320,
              }}
            >
              {cameraState === 'requesting' && (
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
                  Requesting camera access…
                </p>
              )}
              {(cameraState === 'denied' ||
                cameraState === 'unavailable' ||
                cameraState === 'insecure' ||
                cameraState === 'error') && (
                <div className="flex flex-col items-center gap-3 px-6 text-center">
                  <AlertTriangle style={{ width: 24, height: 24, color: '#F59E0B' }} />
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>
                    {stateMessage[cameraState]}
                  </p>
                  {cameraState !== 'insecure' && (
                    <button
                      type="button"
                      onClick={handleRetry}
                      className={`flex h-9 items-center gap-1.5 rounded-[8px] px-3 font-sans font-medium transition-colors duration-150 hover:bg-white/10 ${FOCUS_RING}`}
                      style={{
                        fontSize: 14,
                        color: '#FFFFFF',
                        border: '1px solid rgba(255,255,255,0.35)',
                      }}
                    >
                      <RefreshCw style={{ width: 13, height: 13 }} />
                      Try Again
                    </button>
                  )}
                </div>
              )}
              {capturedDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={capturedDataUrl} alt="" className="size-full object-cover" />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="size-full object-cover"
                  style={{
                    display: cameraState === 'live' ? 'block' : 'none',
                    transform: 'scaleX(-1)',
                  }}
                />
              )}
            </div>

            {cameraState === 'live' && (
              <p className="flex items-center gap-1.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                <Video style={{ width: 14, height: 14 }} />
                {capturedDataUrl ? 'Review the photo below.' : 'Centre the face in the frame.'}
              </p>
            )}
          </div>
        </div>

        <div
          className="flex shrink-0 items-center justify-end gap-2.5 px-6 py-4"
          style={{ borderTop: '1px solid rgba(0,100,130,0.12)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
            style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
          >
            Cancel
          </button>
          {capturedDataUrl ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium transition-colors duration-150 hover:bg-[#F5FBFD] ${FOCUS_RING}`}
                style={{ fontSize: 14, color: '#0D2630', border: '1px solid rgba(0,100,130,0.2)' }}
              >
                <RefreshCw style={{ width: 14, height: 14 }} />
                Retake
              </button>
              <button
                type="button"
                onClick={handleUsePhoto}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                Use Photo
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleCapture}
              disabled={cameraState !== 'live'}
              className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
              style={{ fontSize: 14, background: '#00B4D8' }}
            >
              <Camera style={{ width: 14, height: 14 }} />
              Capture
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
