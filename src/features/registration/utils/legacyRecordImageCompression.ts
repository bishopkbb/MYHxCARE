import { estimateDataUrlBytes } from '@providers/AvatarProvider';

/** Final on-disk budget for a legacy paper record image, per the UNIZIK
 * legacy-record spec: every uploaded/captured page must end up ≤2MB after
 * client-side compression. */
export const LEGACY_RECORD_MAX_BYTES = 2 * 1024 * 1024;

// A document needs to stay legible at a much larger minimum size than a
// small circular avatar, and a higher quality floor — these are deliberately
// less aggressive than `resizeImageToDataUrl`'s own MIN_QUALITY (0.4) /
// MIN_SIZE (96) floors.
const INITIAL_MAX_EDGE = 2000;
const MIN_QUALITY = 0.5;
const MIN_EDGE = 600;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read that image'));
    img.src = src;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(reader.error instanceof Error ? reader.error : new Error('Read failed'));
    reader.readAsDataURL(file);
  });
}

/**
 * Draws `img` at up to `edge` px on its longest side — never larger than the
 * image's own natural resolution, so a small source is never upscaled —
 * preserving its full aspect ratio. Unlike `resizeImageToDataUrl`'s square
 * "cover" crop (correct for a circular avatar), a legacy record is a
 * rectangular document: cropping it would cut off part of the page.
 */
function drawContain(img: HTMLImageElement, edge: number, quality: number): string {
  const naturalLongEdge = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = Math.min(1, edge / naturalLongEdge);
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Same quality-first-then-dimension byte-budget loop `resizeImageToDataUrl`
 * uses, adapted for a rectangular document. Best-effort, like its avatar
 * counterpart: at the quality/size floor it returns the smallest legible
 * result rather than mathematically guaranteeing the budget — in practice a
 * real document photo clears `maxBytes` well before hitting the floor.
 */
function compressImageElement(img: HTMLImageElement, maxBytes: number): string {
  const naturalLongEdge = Math.max(img.naturalWidth, img.naturalHeight);
  let edge = Math.min(naturalLongEdge, INITIAL_MAX_EDGE);
  let quality = 0.9;
  let dataUrl = drawContain(img, edge, quality);

  while (estimateDataUrlBytes(dataUrl) > maxBytes && (quality > MIN_QUALITY || edge > MIN_EDGE)) {
    if (quality > MIN_QUALITY) quality = Math.max(MIN_QUALITY, quality - 0.1);
    else edge = Math.max(MIN_EDGE, Math.floor(edge * 0.85));
    dataUrl = drawContain(img, edge, quality);
  }
  return dataUrl;
}

/**
 * Upload entry point for `LegacyRecordUpload.tsx`. If the source file is
 * already at or under `maxBytes`, it's returned untouched — no re-encode, no
 * resize. Compressing an already-small file would only degrade it for no
 * size benefit, and the UNIZIK spec explicitly forbids inflating a small
 * image up to the budget.
 */
export async function compressUploadedImageToDataUrl(
  file: File,
  maxBytes: number = LEGACY_RECORD_MAX_BYTES,
): Promise<string> {
  if (file.size <= maxBytes) return readFileAsDataUrl(file);
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    return compressImageElement(img, maxBytes);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Camera-capture entry point for `LegacyRecordUpload.tsx`. `LegacyRecordCameraModal`'s
 * own canvas capture already produces a reasonably small JPEG, so this is
 * usually a same-size pass-through; it only re-compresses when a capture
 * (e.g. from a high-resolution external camera) still exceeds `maxBytes`.
 */
export async function compressCapturedImageToDataUrl(
  dataUrl: string,
  maxBytes: number = LEGACY_RECORD_MAX_BYTES,
): Promise<string> {
  if (estimateDataUrlBytes(dataUrl) <= maxBytes) return dataUrl;
  const img = await loadImage(dataUrl);
  return compressImageElement(img, maxBytes);
}
