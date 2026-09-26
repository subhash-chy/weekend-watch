/**
 * Component accessibility and behaviour tests.
 *
 * These assert the properties Lighthouse and a keyboard/screen-reader user
 * actually depend on: accessible names, semantic roles, ARIA state, and the
 * explicit image dimensions that keep CLS at zero.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Rating } from '@/components/ui/Rating';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { GlassButton } from '@/components/ui/GlassButton';
import { MediaCard } from '@/features/discovery/MediaCard';
import type { MediaItem } from '@/types/media';

/**
 * Builds a media fixture.
 *
 * @param overrides - Fields to override.
 * @returns A complete media item.
 */
function makeItem(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: 1,
    mediaType: 'movie',
    title: 'Neon Meridian',
    originalTitle: 'Neon Meridian',
    overview: 'A courier smuggles a memory.',
    posterPath: null,
    backdropPath: null,
    releaseDate: '2025-03-12',
    voteAverage: 8.3,
    voteCount: 1240,
    popularity: 100,
    genreIds: [878],
    originalLanguage: 'en',
    adult: false,
    ...overrides,
  };
}

describe('Rating', () => {
  it('exposes one descriptive label instead of five anonymous stars', () => {
    render(<Rating voteAverage={8.3} voteCount={1240} />);
    const widget = screen.getByRole('img');
    expect(widget).toHaveAccessibleName('Rated 8.3 out of 10, from 1,240 votes');
  });

  it('hides the individual stars from assistive technology', () => {
    const { container } = render(<Rating voteAverage={5} />);
    // Every SVG carries aria-hidden, so nothing decorative is announced.
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('clips the fill to the score', () => {
    const { container } = render(<Rating voteAverage={8} />);
    const fill = container.querySelector('[class*="fill"]') as HTMLElement;
    expect(fill.style.width).toBe('80%');
  });

  it('clamps an out-of-range score so the bar cannot overflow', () => {
    const { container } = render(<Rating voteAverage={14} />);
    const fill = container.querySelector('[class*="fill"]') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });
});

describe('SegmentedControl', () => {
  const options = [
    { value: 'streaming', label: 'Streaming' },
    { value: 'tv', label: 'On TV' },
  ] as const;

  it('is a labelled radiogroup with one checked radio', () => {
    render(
      <SegmentedControl
        options={options}
        value="streaming"
        onChange={() => {}}
        label="Choose a catalogue"
      />,
    );
    const group = screen.getByRole('radiogroup');
    expect(group).toHaveAccessibleName('Choose a catalogue');

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');
    expect(radios[1]).toHaveAttribute('aria-checked', 'false');
  });

  it('keeps a single tab stop via roving tabindex', () => {
    render(
      <SegmentedControl options={options} value="tv" onChange={() => {}} label="l" />,
    );
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toHaveAttribute('tabindex', '-1');
    expect(radios[1]).toHaveAttribute('tabindex', '0');
  });

  it('moves the selection with ArrowRight and follows with focus', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        options={options}
        value="streaming"
        onChange={onChange}
        label="l"
      />,
    );

    // A keyboard user reaches the group by tabbing into it, which focuses the
    // selected radio; the keydown handler lives on the group and only receives
    // events from focused descendants.
    await user.tab();
    expect(screen.getByRole('radio', { name: 'Streaming' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('tv');
  });

  it('wraps from the last option back to the first', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl options={options} value="tv" onChange={onChange} label="l" />,
    );

    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('streaming');
  });

  it('jumps to the ends with Home and End', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        options={options}
        value="streaming"
        onChange={onChange}
        label="l"
      />,
    );

    await user.tab();
    await user.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith('tv');

    await user.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith('streaming');
  });
});

describe('GlassButton', () => {
  it('renders a real button with an accessible name', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<GlassButton onClick={onClick}>Save</GlassButton>);

    const button = screen.getByRole('button', { name: 'Save' });
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('names an icon-only button from its visually-hidden label', () => {
    render(
      <GlassButton icon="search" iconOnly aria-label="Search">
        Search
      </GlassButton>,
    );
    expect(screen.getByRole('button')).toHaveAccessibleName('Search');
  });

  it('suppresses clicks and reports busy state while loading', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <GlassButton onClick={onClick} loading>
        Save
      </GlassButton>,
    );
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders an anchor when given href, using aria-disabled instead of disabled', () => {
    render(
      <GlassButton href="/somewhere" disabled>
        Go
      </GlassButton>,
    );
    const link = screen.getByRole('link', { name: 'Go' });
    expect(link).toHaveAttribute('aria-disabled', 'true');
    // Anchors cannot be natively disabled; the attribute is the correct signal.
    expect(link).not.toHaveAttribute('disabled');
  });
});

describe('MediaCard', () => {
  it('declares explicit width and height so the poster cannot shift layout', () => {
    render(<MediaCard item={makeItem()} onSelect={() => {}} />);
    const image = document.querySelector('img');
    expect(image).not.toBeNull();
    expect(image).toHaveAttribute('width', '342');
    expect(image).toHaveAttribute('height', '513');
  });

  it('leaves the poster unnamed so the button label is announced once', () => {
    // alt="" makes the poster presentational; if it also carried alt text the
    // title would be announced twice — once by the image, once by the button.
    // The card's Rating does expose role="img", so assert on the poster itself.
    render(<MediaCard item={makeItem()} onSelect={() => {}} />);
    const poster = document.querySelector('img') as HTMLImageElement;
    expect(poster.alt).toBe('');
  });

  it('lazy-loads by default and loads eagerly when prioritised', () => {
    const { rerender } = render(<MediaCard item={makeItem()} onSelect={() => {}} />);
    expect(document.querySelector('img')).toHaveAttribute('loading', 'lazy');

    rerender(<MediaCard item={makeItem()} onSelect={() => {}} priority />);
    expect(document.querySelector('img')).toHaveAttribute('loading', 'eager');
    expect(document.querySelector('img')).toHaveAttribute('fetchpriority', 'high');
  });

  it('names the card button with title, kind, date and intent', () => {
    render(<MediaCard item={makeItem()} onSelect={() => {}} />);
    expect(screen.getByRole('button')).toHaveAccessibleName(
      'Neon Meridian — Film, released Mar 12, 2025. View details.',
    );
  });

  it('labels TV items as Series', () => {
    render(
      <MediaCard
        item={makeItem({ mediaType: 'tv', title: 'Harbour Lights' })}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByRole('button')).toHaveAccessibleName(
      'Harbour Lights — Series, released Mar 12, 2025. View details.',
    );
  });

  it('fires onSelect with the item', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const item = makeItem();
    render(<MediaCard item={item} onSelect={onSelect} />);

    await user.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(item);
  });

  it('falls back to generated artwork when TMDB has no poster', () => {
    render(<MediaCard item={makeItem({ posterPath: null })} onSelect={() => {}} />);
    const image = document.querySelector('img') as HTMLImageElement;
    expect(image.src).toContain('data:image/svg+xml');
    // Generated artwork has no alternate renditions.
    expect(image).not.toHaveAttribute('srcset');
  });

  it('emits a srcSet when a real poster path exists', () => {
    render(<MediaCard item={makeItem({ posterPath: '/abc.jpg' })} onSelect={() => {}} />);
    const image = document.querySelector('img') as HTMLImageElement;
    expect(image).toHaveAttribute('srcset');
    expect(image.getAttribute('srcset')).toContain('185w');
    expect(image.getAttribute('srcset')).toContain('500w');
  });
});
