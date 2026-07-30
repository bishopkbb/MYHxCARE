'use client';

import { Star, StarHalf } from 'lucide-react';

/** Renders a 0–5 star rating (0.5 increments) as 5 icons — full, half, or
 * empty. A rating of 0 (not yet rated) renders all 5 empty. */
export function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;

  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => {
        if (i < full) {
          return (
            <Star key={i} style={{ width: size, height: size, color: '#F59E0B' }} fill="#F59E0B" />
          );
        }
        if (i === full && hasHalf) {
          return (
            <StarHalf
              key={i}
              style={{ width: size, height: size, color: '#F59E0B' }}
              fill="#F59E0B"
            />
          );
        }
        return <Star key={i} style={{ width: size, height: size, color: '#D1D9DC' }} />;
      })}
    </div>
  );
}
