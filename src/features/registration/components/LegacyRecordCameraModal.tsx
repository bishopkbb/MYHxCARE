'use client';

import { AlertTriangle, Camera, Check, RefreshCw, SwitchCamera, Video, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { FormSelect } from '@components/shared/FormSelect';

const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-[#00B4D8]/50 focus-visible:outline-none';

// A legacy paper record is a rectangular document, not a face — unlike
// TakePhotoModal's CAPTURE_SIZE square crop (correct for a circular avatar),
// cropping a document page to a square would cut off its edges. Captured at
// the camera's native aspect ratio instead, only capped on the long edge so
// a 4K webcam frame doesn't produce an unnecessarily huge data URL before
// Pass 3's byte-budget compression exists.
const MAX_CAPTURE_EDGE = 1600;

type CameraState = 'requesting' | 'live' | 'denied' | 'unavailable' | 'insecure' | 'error';
type FacingMode = 'user' | 'environment';

/** Waits for the video element to actually have a frame ready — see
 * TakePhotoModal.tsx for the full rationale (same root cause, same fix). */
async function playWhenReady(video: HTMLVideoElement): Promise<void> {
  if (video.readyState < 1) {
    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => resolve();
    });
  }
  await video.play();
}

/** Multi-shot camera capture for legacy paper record pages — adapted from
 * TakePhotoModal's proven permission/device state machine (same requesting/
 * live/denied/unavailable/insecure/error handling, same device picker and
 * facing-mode switch), but stays open across captures so an officer can
 * photograph several pages of a patient's paper file in one sitting instead
 * of re-opening the modal per page. Each accepted page is handed back via
 * `onCapture` immediately — the modal holds no list of its own, the caller
 * (`LegacyRecordUpload.tsx`) owns that. */
export function LegacyRecordCameraModal({
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
  const [capturedCount, setCapturedCount] = useState(0);
  const [devices, setDevices] = useState<{ value: string; label: string }[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const [errorDetail, setErrorDetail] = useState('');
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');
  const [activeFacing, setActiveFacing] = useState<FacingMode>('environment');

  function stopCurrentStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function refreshDeviceList(activeDeviceId?: string) {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const all = await navigator.mediaDevices.enumerateDevices();
    const cameras = all
      .filter((d) => d.kind === 'videoinput')
      .map((d, i) => ({ value: d.deviceId, label: d.label || `Camera ${i + 1}` }));
    setDevices(cameras);
    if (activeDeviceId) setSelectedDeviceId(activeDeviceId);
  }

  async function startStream(opts?: { deviceId?: string; facing?: FacingMode }) {
    const deviceId = opts?.deviceId;
    const facing = opts?.facing ?? facingMode;

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
          video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: facing },
          audio: false,
        });
      } catch (err) {
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
          // Autoplay blocked — stream is still live; Capture is itself a
          // user gesture and will resume playback then.
        }
      }
      setCameraState('live');
      const settings = stream.getVideoTracks()[0]?.getSettings();
      const reported = settings?.facingMode;
      setActiveFacing(
        reported === 'environment' || reported === 'user' ? reported : deviceId ? 'user' : facing,
      );
      const activeId = settings?.deviceId;
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

  useEffect(() => {
    let status: PermissionStatus | null = null;
    let cancelled = false;
    navigator.permissions
      ?.query({ name: 'camera' as PermissionName })
      .then((result) => {
        if (cancelled) return;
        status = result;
        result.onchange = () => {
          if (result.state === 'granted') setRetryToken((t) => t + 1);
        };
      })
      .catch(() => {
        // Permissions API doesn't support querying 'camera' here — getUserMedia's
        // own result is the only source of truth in that case.
      });
    return () => {
      cancelled = true;
      if (status) status.onchange = null;
    };
  }, []);

  function handleDeviceChange(deviceId: string) {
    setSelectedDeviceId(deviceId);
    startStream({ deviceId });
  }

  function handleRetry() {
    setRetryToken((t) => t + 1);
  }

  function handleSwitchCamera() {
    const next: FacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    setSelectedDeviceId('');
    startStream({ facing: next });
  }

  function handleCapture() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;

    // Full frame, native aspect ratio — a document page must never be
    // cropped, unlike TakePhotoModal's square avatar crop.
    const scale = Math.min(1, MAX_CAPTURE_EDGE / Math.max(vw, vh));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vw * scale);
    canvas.height = Math.round(vh * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (activeFacing === 'user') {
      // Mirror to match what the officer sees in the live feed — same
      // reasoning as TakePhotoModal. A back camera is never mirrored.
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    setCapturedDataUrl(canvas.toDataURL('image/jpeg', 0.85));
  }

  function handleRetake() {
    setCapturedDataUrl(null);
  }

  function handleUseThisPage() {
    if (!capturedDataUrl) return;
    onCapture(capturedDataUrl);
    setCapturedCount((c) => c + 1);
    setCapturedDataUrl(null);
  }

  const stateMessage: Partial<Record<CameraState, string>> = {
    denied:
      'Camera access is blocked for this site. Click the camera icon (or padlock) in your browser’s address bar → Camera → Allow, then this will reconnect automatically. If no icon appears, check Windows Settings → Privacy & security → Camera and make sure your browser is allowed.',
    unavailable: 'No camera or capture device was found. Use Upload Image instead.',
    insecure:
      'Camera access requires a secure (HTTPS) connection. Ask your administrator to enable HTTPS on this address, or use Upload Image instead.',
    error: errorDetail
      ? `Could not start the camera (${errorDetail}). Try again, or use Upload Image instead.`
      : 'Could not start the camera. Try again, or use Upload Image instead.',
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
        style={{ maxWidth: 560, maxHeight: 'calc(100vh - 64px)', borderRadius: 16 }}
      >
        <div
          className="flex shrink-0 items-start justify-between gap-3 px-6 py-5"
          style={{ borderBottom: '1px solid rgba(0,100,130,0.12)' }}
        >
          <div>
            <h2
              className="font-display font-semibold"
              style={{ fontSize: 20, lineHeight: '28px', color: '#0D2630' }}
            >
              Capture Legacy Record Page
            </h2>
            <p className="mt-0.5" style={{ fontSize: 14, color: '#8A98A3' }}>
              {capturedCount > 0
                ? `${capturedCount} page${capturedCount === 1 ? '' : 's'} added — capture another or click Done.`
                : "Photograph a page from the patient's paper file."}
            </p>
          </div>
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
              <div className="w-full max-w-[360px]">
                <FormSelect
                  id="legacy-camera-device"
                  value={selectedDeviceId}
                  onChange={handleDeviceChange}
                  options={devices}
                  placeholder="Select camera"
                />
              </div>
            )}

            <div
              className="relative flex w-full items-center justify-center overflow-hidden"
              style={{
                aspectRatio: '4 / 3',
                borderRadius: 12,
                background: '#0D2630',
                maxWidth: 480,
              }}
            >
              {cameraState === 'live' && !capturedDataUrl && (
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  aria-label="Switch camera"
                  className={`absolute top-2.5 right-2.5 z-10 flex size-11 items-center justify-center rounded-full transition-colors duration-150 hover:bg-white/20 ${FOCUS_RING}`}
                  style={{ background: 'rgba(13,38,48,0.55)' }}
                >
                  <SwitchCamera style={{ width: 18, height: 18, color: '#FFFFFF' }} />
                </button>
              )}
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
                <img src={capturedDataUrl} alt="" className="size-full object-contain" />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="size-full object-contain"
                  style={{
                    display: cameraState === 'live' ? 'block' : 'none',
                    transform: activeFacing === 'user' ? 'scaleX(-1)' : 'none',
                  }}
                />
              )}
            </div>

            {cameraState === 'live' && (
              <p className="flex items-center gap-1.5" style={{ fontSize: 14, color: '#8A98A3' }}>
                <Video style={{ width: 14, height: 14 }} />
                {capturedDataUrl
                  ? 'Review the page below.'
                  : 'Fit the whole page in the frame, then capture.'}
              </p>
            )}
          </div>
        </div>

        <div
          className="flex shrink-0 flex-wrap items-center justify-end gap-2.5 px-6 py-4"
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
                onClick={handleUseThisPage}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: '#00B4D8' }}
              >
                <Check style={{ width: 14, height: 14 }} />
                Use This Page
              </button>
            </>
          ) : (
            <>
              {capturedCount > 0 && (
                <button
                  type="button"
                  onClick={onClose}
                  className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 ${FOCUS_RING}`}
                  style={{ fontSize: 14, background: '#00B4D8' }}
                >
                  <Check style={{ width: 14, height: 14 }} />
                  Done
                </button>
              )}
              <button
                type="button"
                onClick={handleCapture}
                disabled={cameraState !== 'live'}
                className={`flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-sans font-medium text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                style={{ fontSize: 14, background: capturedCount > 0 ? '#0D2630' : '#00B4D8' }}
              >
                <Camera style={{ width: 14, height: 14 }} />
                Capture
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
