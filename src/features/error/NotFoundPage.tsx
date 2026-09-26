import type { JSX } from 'react';
import classNames from 'classnames';
import { cls } from '@/utils/cx';
/**
 * NotFoundPage — the catch-all route.
 *
 * The original app had no catch-all, so every header link pointed at a blank
 * page. This gives an unknown path a real destination with a way back out.
 *
 * It also sets `document.title` and a `noindex` meta via `usePageSeo`, so a
 * mistyped URL is not indexed as a duplicate of the home page.
 */

import { Link, useNavigate } from 'react-router-dom';
import { GlassButton } from '@/components/ui/GlassButton';
import { usePageSeo } from '@/hooks/use-page-seo';
import { NAV_LINKS, ROUTES } from '@/utils/constants';
import styles from './NotFoundPage.module.css';

/**
 * Renders the 404 page.
 *
 * @returns A `<main>` with an explanation and navigation back to the app.
 */
export function NotFoundPage(): JSX.Element {
  const navigate = useNavigate();

  usePageSeo({
    title: 'Page not found',
    description:
      'That page does not exist on Weekend Watch. Browse trending films and series instead.',
    path: '/404',
  });

  return (
    <main id="main" className={classNames(cls(styles, 'page'), 'ww-shell')}>
      <div className={classNames(cls(styles, 'panel'), 'ww-glass')}>
        <p className={styles.code}>404</p>
        <h1 className={styles.title}>We could not find that page</h1>
        <p className={styles.message}>
          The link may be out of date, or the title you were after has moved. Try one of
          these instead.
        </p>

        <nav aria-label="Alternative destinations" className={styles.links}>
          <ul className={styles.linkList}>
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className={styles.link}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* A real <a> here would force a full document load; going through the
            router keeps the SPA alive. */}
        <GlassButton
          variant="primary"
          icon="film"
          onClick={() => {
            void navigate(ROUTES.home);
          }}
        >
          Back to home
        </GlassButton>
      </div>
    </main>
  );
}
