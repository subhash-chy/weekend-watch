/**
 * Tests for the pure formatting helpers.
 */

import { describe, expect, it } from 'vitest';
import {
  clamp,
  formatCompactCount,
  formatDuration,
  formatReleaseDate,
  formatYear,
  genreLabels,
  toPercent,
  toStars,
  truncate,
  UNKNOWN_DATE_LABEL,
} from '@/utils/format';

describe('formatReleaseDate', () => {
  it('formats a valid ISO date', () => {
    expect(formatReleaseDate('2024-03-12')).toBe('Mar 12, 2024');
  });

  it('returns the TBA label for the empty string TMDB sends', () => {
    expect(formatReleaseDate('')).toBe(UNKNOWN_DATE_LABEL);
  });

  it('returns the TBA label for null and undefined', () => {
    expect(formatReleaseDate(null)).toBe(UNKNOWN_DATE_LABEL);
    expect(formatReleaseDate(undefined)).toBe(UNKNOWN_DATE_LABEL);
  });

  it('returns the TBA label for an unparseable date instead of "NaN"', () => {
    // `new Date('garbage')` is an Invalid Date; formatting it naively renders
    // "NaN, NaN" in the UI.
    expect(formatReleaseDate('garbage')).toBe(UNKNOWN_DATE_LABEL);
    expect(formatReleaseDate('2024-13-45')).toBe(UNKNOWN_DATE_LABEL);
  });
});

describe('formatYear', () => {
  it('extracts the year', () => {
    expect(formatYear('2025-07-04')).toBe('2025');
  });

  it('returns an empty string when unavailable', () => {
    expect(formatYear(null)).toBe('');
    expect(formatYear('')).toBe('');
    expect(formatYear('nope')).toBe('');
  });
});

describe('genreLabels', () => {
  it('maps known ids to labels', () => {
    expect(genreLabels([28, 878])).toEqual(['Action', 'Science Fiction']);
  });

  it('drops unknown ids rather than emitting undefined', () => {
    expect(genreLabels([28, 999999, 35])).toEqual(['Action', 'Comedy']);
  });

  it('caps the result at the limit', () => {
    expect(genreLabels([28, 12, 16, 35], 2)).toEqual(['Action', 'Adventure']);
  });

  it('handles an empty list', () => {
    expect(genreLabels([])).toEqual([]);
  });
});

describe('toStars', () => {
  it('converts a 0–10 score to 0–5', () => {
    expect(toStars(8)).toBe(4);
    expect(toStars(0)).toBe(0);
    expect(toStars(10)).toBe(5);
  });

  it('clamps out-of-range values', () => {
    expect(toStars(11)).toBe(5);
    expect(toStars(-3)).toBe(0);
  });

  it('returns 0 for non-finite input', () => {
    expect(toStars(Number.NaN)).toBe(0);
    expect(toStars(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('clamp', () => {
  it('constrains to the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe('toPercent', () => {
  it('formats a fraction as a whole percentage', () => {
    expect(toPercent(0.83)).toBe('83%');
    expect(toPercent(1)).toBe('100%');
    expect(toPercent(0)).toBe('0%');
  });

  it('clamps values outside 0–1', () => {
    expect(toPercent(1.7)).toBe('100%');
    expect(toPercent(-0.5)).toBe('0%');
  });
});

describe('truncate', () => {
  it('returns short strings unchanged', () => {
    expect(truncate('short', 50)).toBe('short');
  });

  it('cuts on a word boundary and appends an ellipsis', () => {
    expect(truncate('the quick brown fox', 12)).toBe('the quick…');
  });

  it('handles a string with no spaces', () => {
    expect(truncate('supercalifragilistic', 8)).toBe('supercal…');
  });
});

describe('formatCompactCount', () => {
  it('abbreviates large counts', () => {
    expect(formatCompactCount(12_400)).toBe('12.4K');
    expect(formatCompactCount(950)).toBe('950');
  });

  it('is safe for non-finite input', () => {
    expect(formatCompactCount(Number.NaN)).toBe('0');
  });
});

describe('formatDuration', () => {
  it('renders sub-hour durations as M:SS with a padded second', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(7)).toBe('0:07');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(596)).toBe('9:56');
  });

  it('switches to H:MM:SS at an hour and pads the minutes', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
    expect(formatDuration(3661)).toBe('1:01:01');
    expect(formatDuration(7325)).toBe('2:02:05');
  });

  it('collapses the NaN a media element reports before metadata loads', () => {
    // `video.duration` is NaN until loadedmetadata fires; the transport must
    // show a clock value, not the literal string "NaN".
    expect(formatDuration(Number.NaN)).toBe('0:00');
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('0:00');
  });

  it('never renders a negative clock', () => {
    expect(formatDuration(-12)).toBe('0:00');
  });

  it('floors fractional seconds rather than rounding them up', () => {
    expect(formatDuration(59.9)).toBe('0:59');
  });
});
