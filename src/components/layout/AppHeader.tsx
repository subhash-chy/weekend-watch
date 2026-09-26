/**
 * AppHeader — sticky frosted navigation bar.
 *
 * The header floats over hero artwork that can be arbitrarily bright, so it
 * carries the strongest scrim in the system (`--glass-header-scrim`). That is
 * the worst-case surface in `scripts/contrast.mjs`: white ink on it measures
 * 11.57:1 even when the artwork behind is pure white.
 *
 * Navigation links point at routes that actually exist. The original app linked
 * to `/movies`, `/tv-show`, `/people` and `/more`, none of which were
 * registered — every one of them rendered a blank page.
 */

import { useState } from 'react';
import type { JSX } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import classNames from 'classnames';
import { cls } from '@/utils/cx';
import { Logo } from '@/assets/brand/Logo';
import { Icon } from '@/assets/icons/Icon';
import { NAV_LINKS, ROUTES } from '@/utils/constants';
import styles from './AppHeader.module.css';

/**
 * Renders the site header: brand, primary navigation and search.
 *
 * @returns A `<header>` landmark containing the main `<nav>`.
 */
export function AppHeader(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  /**
   * Whether a nav entry is the current destination.
   *
   * NavLink matches on pathname alone, which would mark Home, Films and Series
   * active at the same time because all three live on `/`. Comparing the full
   * href — path plus query — makes the highlight accurate.
   *
   * @param to - The link target, possibly including a query string.
   * @returns `true` when the link is the current location.
   */
  const isActive = (to: string): boolean => {
    const current = `${location.pathname}${location.search}`;
    return current === to || (to === ROUTES.home && current === ROUTES.home);
  };

  return (
    <header className={styles.header}>
      <div className={classNames(cls(styles, 'inner'), 'ww-shell')}>
        <Link to={ROUTES.home} className={styles.brand} aria-label="Weekend Watch — home">
          <Logo height={26} />
        </Link>

        {/* Primary navigation. Collapses into a disclosure below 880px. */}
        <nav
          aria-label="Primary"
          className={classNames(cls(styles, 'nav'), menuOpen && cls(styles, 'navOpen'))}
          id="primary-navigation"
        >
          <ul className={styles.navList}>
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.to === ROUTES.home}
                  aria-current={isActive(link.to) ? 'page' : undefined}
                  className={classNames(
                    cls(styles, 'navLink'),
                    isActive(link.to) && cls(styles, 'navLinkActive'),
                  )}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.searchButton}
            onClick={() => {
              void navigate(ROUTES.search);
            }}
            // Explicit name survives the responsive label being hidden; without
            // it the button would be nameless on small screens.
            aria-label="Search movies and TV shows"
          >
            <Icon name="search" size={20} aria-hidden="true" />
            <span className={styles.searchLabel} aria-hidden="true">
              Search
            </span>
          </button>

          {/* Menu toggle is only rendered where the nav is actually collapsed,
              so a keyboard user never tabs into a no-op control. */}
          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name={menuOpen ? 'close' : 'chevron-down'} size={22} />
            <span className="ww-sr-only">
              {menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
