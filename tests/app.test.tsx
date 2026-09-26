/**
 * Full-application integration tests.
 *
 * These render the real `App` — providers, router, data layer and all — against
 * the offline mock catalogue, then assert on the rendered DOM. That exercises
 * the composition root, SWR wiring, routing and the accessibility contract
 * together, which no unit test does.
 *
 * The mock catalogue is forced on explicitly so these tests are deterministic
 * and never depend on a TMDB key or network access.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Force the offline catalogue before any module reads the environment.
vi.stubEnv('VITE_USE_MOCK_CATALOGUE', '1');
vi.stubEnv('VITE_TMDB_READ_ACCESS_TOKEN', '');
vi.stubEnv('VITE_PUBLIC_TMDB_API_KEY', '');

const { App } = await import('@/app/App');

/**
 * Renders the app at a given path.
 *
 * @param path - Initial location. Defaults to `/`.
 * @returns The rendered container.
 */
function renderAppAt(path = '/'): HTMLElement {
  window.history.pushState({}, '', path);
  const { container } = render(<App />);
  return container;
}

describe('App — landmarks and document structure', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('exposes exactly one banner, main, contentinfo and primary nav', async () => {
    renderAppAt('/');
    await waitFor(() =>
      expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0),
    );

    expect(screen.getAllByRole('banner')).toHaveLength(1);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1);
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
  });

  it('provides a working skip link that targets the main element', () => {
    renderAppAt('/');
    const skip = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skip).toHaveAttribute('href', '#main');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });

  it('names every header control, including icon-only buttons', () => {
    renderAppAt('/');
    // The search button keeps a name even where its visible label is hidden.
    expect(
      screen.getByRole('button', { name: 'Search movies and TV shows' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open navigation menu' }),
    ).toBeInTheDocument();
  });

  it('renders footer navigation with real, resolvable links', () => {
    renderAppAt('/');
    const footer = screen.getByRole('contentinfo');
    const links = within(footer).getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const href = link.getAttribute('href');
      expect(href, 'every footer link must have an href').toBeTruthy();
      expect(href).not.toBe('#');
    }
  });
});

describe('App — discovery page data flow', () => {
  it('loads the offline catalogue and renders rails without crashing', async () => {
    renderAppAt('/');

    // The mock catalogue resolves after a short simulated latency, so the
    // skeletons appear first and real cards follow.
    await waitFor(
      () => {
        expect(screen.getAllByRole('article').length).toBeGreaterThan(0);
      },
      { timeout: 4000 },
    );

    // The heading uses a typographic apostrophe, so match either form.
    expect(
      screen.getByRole('heading', { level: 2, name: /what.s popular/i }),
    ).toBeInTheDocument();
  });

  it('tells the user it is showing the offline catalogue', async () => {
    renderAppAt('/');
    await waitFor(
      () => {
        expect(screen.getByText(/offline demo catalogue/i)).toBeInTheDocument();
      },
      { timeout: 4000 },
    );
  });

  it('switches catalogue via the segmented control and updates the URL', async () => {
    const user = userEvent.setup();
    renderAppAt('/');

    await waitFor(() => expect(screen.getAllByRole('radio')).toHaveLength(2), {
      timeout: 4000,
    });

    await user.click(screen.getByRole('radio', { name: 'On TV' }));
    await waitFor(() => {
      expect(window.location.search).toContain('catalogue=tv');
    });
  });
});

describe('App — routing', () => {
  it('renders the 404 page for an unknown path', async () => {
    renderAppAt('/this-route-does-not-exist');
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /could not find that page/i }),
      ).toBeInTheDocument();
    });
  });

  it('renders the search page and reports an empty state for no query', async () => {
    renderAppAt('/search');
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /search the catalogue/i }),
      ).toBeInTheDocument();
    });
  });

  it('returns results for a query taken from the URL', async () => {
    renderAppAt('/search?query=neon');
    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: /results for/i })).toBeInTheDocument();
      },
      { timeout: 4000 },
    );
    await waitFor(() => {
      expect(screen.getAllByRole('article').length).toBeGreaterThan(0);
    });
  });
});

describe('App — search interaction', () => {
  it('submits a query and updates the URL', async () => {
    const user = userEvent.setup();
    renderAppAt('/search');

    const input = await screen.findByLabelText(/search for movies, tv shows and people/i);
    await user.type(input, 'harbour');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(window.location.search).toContain('query=harbour');
    });
  });
});
