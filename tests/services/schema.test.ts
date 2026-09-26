/**
 * Tests for the TMDB runtime validator.
 *
 * This is the app's network boundary. Every case here is a payload shape TMDB
 * actually returns, or a malformed response that would otherwise reach a
 * component and throw during render.
 */

import { describe, expect, it } from 'vitest';
import { parseMediaItem, parseMediaPage, SchemaError } from '@/services/tmdb/schema';

describe('parseMediaItem', () => {
  it('normalises a movie payload', () => {
    const item = parseMediaItem(
      {
        id: 1,
        media_type: 'movie',
        title: 'Neon Meridian',
        original_title: 'Neon Meridian',
        overview: 'A courier smuggles a memory.',
        poster_path: '/abc.jpg',
        backdrop_path: '/bg.jpg',
        release_date: '2025-03-12',
        vote_average: 8.3,
        vote_count: 1240,
        popularity: 512.4,
        genre_ids: [878, 28],
        original_language: 'en',
        adult: false,
      },
      'movie',
    );

    expect(item).toEqual({
      id: 1,
      mediaType: 'movie',
      title: 'Neon Meridian',
      originalTitle: 'Neon Meridian',
      overview: 'A courier smuggles a memory.',
      posterPath: '/abc.jpg',
      backdropPath: '/bg.jpg',
      releaseDate: '2025-03-12',
      voteAverage: 8.3,
      voteCount: 1240,
      popularity: 512.4,
      genreIds: [878, 28],
      originalLanguage: 'en',
      adult: false,
    });
  });

  it('maps TV fields (name / first_air_date) onto the shared shape', () => {
    const item = parseMediaItem(
      {
        id: 2,
        name: 'Harbour Lights',
        first_air_date: '2024-11-02',
        overview: '',
        vote_average: 7.1,
      },
      'tv',
    );

    expect(item?.title).toBe('Harbour Lights');
    expect(item?.releaseDate).toBe('2024-11-02');
    expect(item?.mediaType).toBe('tv');
  });

  it('applies the fallback type when media_type is absent', () => {
    // `/movie/top_rated` does not include media_type at all.
    const item = parseMediaItem({ id: 3, title: 'Saltwater Kings' }, 'movie');
    expect(item?.mediaType).toBe('movie');
  });

  it('rejects an entry with no usable id', () => {
    expect(parseMediaItem({ title: 'No id' }, 'movie')).toBeNull();
    expect(parseMediaItem({ id: 'not-a-number', title: 'Bad id' }, 'movie')).toBeNull();
  });

  it('rejects an entry with no title in any of the four fields', () => {
    expect(parseMediaItem({ id: 4, overview: 'nameless' }, 'movie')).toBeNull();
  });

  it('drops people, which this app does not render', () => {
    expect(
      parseMediaItem({ id: 5, media_type: 'person', name: 'Someone' }, 'movie'),
    ).toBeNull();
  });

  it('filters non-numeric genre ids instead of crashing', () => {
    const item = parseMediaItem(
      { id: 6, title: 'Mixed genres', genre_ids: [28, 'nope', null, 35] },
      'movie',
    );
    expect(item?.genreIds).toEqual([28, 35]);
  });

  it('coerces numeric strings and defaults missing numbers', () => {
    const item = parseMediaItem(
      { id: '7', title: 'Stringy', vote_average: '6.5' },
      'movie',
    );
    expect(item?.id).toBe(7);
    expect(item?.voteAverage).toBe(6.5);
    expect(item?.voteCount).toBe(0);
  });

  it('treats NaN and Infinity as absent', () => {
    const item = parseMediaItem({ id: 8, title: 'Odd', popularity: Number.NaN }, 'movie');
    expect(item?.popularity).toBe(0);
  });

  it('trims whitespace and treats blank strings as null', () => {
    const item = parseMediaItem(
      { id: 9, title: '  Spaced  ', poster_path: '   ', overview: '' },
      'movie',
    );
    expect(item?.title).toBe('Spaced');
    expect(item?.posterPath).toBeNull();
    expect(item?.overview).toBe('');
  });

  it('rejects non-object input', () => {
    expect(parseMediaItem(null, 'movie')).toBeNull();
    expect(parseMediaItem('nope', 'movie')).toBeNull();
    expect(parseMediaItem([], 'movie')).toBeNull();
    expect(parseMediaItem(42, 'movie')).toBeNull();
  });
});

describe('parseMediaPage', () => {
  it('parses a full envelope and drops invalid entries', () => {
    const page = parseMediaPage(
      {
        page: 1,
        total_pages: 3,
        total_results: 4,
        results: [
          { id: 1, title: 'Good', media_type: 'movie' },
          { id: 'bad', title: 'Rejected' },
          { id: 3, name: 'Also good', media_type: 'tv' },
        ],
      },
      'movie',
    );

    expect(page.results).toHaveLength(2);
    expect(page.results.map((i) => i.title)).toEqual(['Good', 'Also good']);
    expect(page.totalPages).toBe(3);
  });

  it('returns an empty page rather than throwing when results is empty', () => {
    const page = parseMediaPage({ page: 1, results: [] }, 'movie');
    expect(page.results).toEqual([]);
    expect(page.totalResults).toBe(0);
  });

  it('throws a SchemaError when the envelope is not an object', () => {
    expect(() => parseMediaPage(null, 'movie')).toThrow(SchemaError);
    expect(() => parseMediaPage('nope', 'movie')).toThrow(SchemaError);
  });

  it('throws a SchemaError when results is missing or not an array', () => {
    expect(() => parseMediaPage({ page: 1 }, 'movie')).toThrow(/results/);
    expect(() => parseMediaPage({ page: 1, results: {} }, 'movie')).toThrow(/results/);
  });

  it('defaults pagination fields when absent', () => {
    const page = parseMediaPage({ results: [{ id: 1, title: 'Only' }] }, 'movie');
    expect(page.page).toBe(1);
    expect(page.totalPages).toBe(1);
    expect(page.totalResults).toBe(1);
  });
});
