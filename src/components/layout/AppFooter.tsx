import type { JSX } from 'react';
import classNames from 'classnames';
import { cls } from '@/utils/cx';
/**
 * AppFooter — site footer.
 *
 * Every link here resolves to a route that exists or to a real external
 * resource. The original footer listed eight `<li>` items styled like links but
 * wired to nothing, which reads as a broken affordance to both mouse and
 * keyboard users; those are gone.
 *
 * External links carry `rel="noopener noreferrer"`: `noopener` severs
 * `window.opener` (a tabnabbing vector) and `noreferrer` keeps the origin out
 * of third-party logs.
 */

import { Link } from 'react-router-dom';
import { Logo } from '@/assets/brand/Logo';
import { Icon } from '@/assets/icons/Icon';
import { NAV_LINKS, ROUTES } from '@/utils/constants';
import styles from './AppFooter.module.css';

/**
 * Internal navigation.
 *
 * Shares the header's link table so the two navigations can never advertise
 * different destinations.
 */
const EXPLORE_LINKS = NAV_LINKS;

/** External resources. */
const RESOURCE_LINKS: readonly { href: string; label: string }[] = [
  { href: 'https://www.themoviedb.org/', label: 'The Movie Database' },
  {
    href: 'https://developer.themoviedb.org/docs',
    label: 'TMDB API documentation',
  },
  {
    href: 'https://www.themoviedb.org/privacy-policy',
    label: 'TMDB privacy policy',
  },
];

/**
 * Renders the site footer.
 *
 * @returns A `<footer>` landmark with navigation groups and attribution.
 */
export function AppFooter(): JSX.Element {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={classNames(cls(styles, 'inner'), 'ww-shell')}>
        <div className={styles.brandColumn}>
          <Link to={ROUTES.home} aria-label="Weekend Watch — home">
            <Logo height={34} />
          </Link>
          <p className={styles.blurb}>
            A glassmorphic front end for discovering what to watch this weekend. Catalogue
            data and artwork are provided by The Movie Database.
          </p>
        </div>

        <nav aria-labelledby="footer-explore" className={styles.column}>
          <h2 id="footer-explore" className={styles.heading}>
            Explore
          </h2>
          <ul className={styles.linkList}>
            {EXPLORE_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className={styles.link}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-resources" className={styles.column}>
          <h2 id="footer-resources" className={styles.heading}>
            Resources
          </h2>
          <ul className={styles.linkList}>
            {RESOURCE_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={styles.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className={styles.bottom}>
        <div className={classNames(cls(styles, 'bottomInner'), 'ww-shell')}>
          <p className={styles.copyright}>
            © {year} Weekend Watch. Demo project; not affiliated with The Movie Database.
          </p>
          <p className={styles.attribution}>
            <Icon name="film" size={16} aria-hidden="true" />
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
        </div>
      </div>
    </footer>
  );
}
