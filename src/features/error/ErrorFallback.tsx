import type { JSX } from 'react';
import classNames from 'classnames';
import { cls } from '@/utils/cx';
/**
 * ErrorFallback — the last-resort recovery screen.
 *
 * Rendered by `react-error-boundary` when a render throws. Without it, any
 * unexpected error in the tree unmounts the entire app and leaves a blank white
 * page — exactly the failure mode a boundary exists to prevent.
 *
 * The user is offered two ways out: retry (which remounts the subtree and
 * resets component state) or go home. Both are reachable by keyboard, and the
 * panel is `role="alert"` so it is announced rather than silently appearing.
 */

import { useNavigate } from 'react-router-dom';
import type { FallbackProps } from 'react-error-boundary';
import { GlassButton } from '@/components/ui/GlassButton';
import { describeError } from '@/services/catalog';
import { ROUTES } from '@/utils/constants';
import styles from './ErrorFallback.module.css';

/**
 * Props supplied by `react-error-boundary`.
 *
 * Re-exported from the library rather than redeclared: its `error` is typed
 * `unknown` (anything can be thrown in JavaScript), and narrowing it here with
 * {@link describeError} is safer than assuming an `Error` instance.
 */
export type ErrorFallbackProps = FallbackProps;

/**
 * Renders the crash recovery screen.
 *
 * The raw error message is shown only inside a `<details>` disclosure so the
 * default view stays friendly while the detail is still available for a bug
 * report.
 *
 * @param props - Boundary props.
 * @returns A full-width recovery panel.
 */
export function ErrorFallback({
  error,
  resetErrorBoundary,
}: ErrorFallbackProps): JSX.Element {
  const navigate = useNavigate();

  return (
    <main id="main" className={classNames(cls(styles, 'page'), 'ww-shell')}>
      <div className={classNames(cls(styles, 'panel'), 'ww-glass')} role="alert">
        <span className={styles.badge} aria-hidden="true">
          !
        </span>
        <h1 className={styles.title}>This page hit an unexpected error</h1>
        <p className={styles.message}>
          The rest of the site is fine. You can try this section again, or head back to
          browsing.
        </p>

        <div className={styles.actions}>
          <GlassButton variant="primary" icon="retry" onClick={resetErrorBoundary}>
            Try again
          </GlassButton>
          <GlassButton
            variant="secondary"
            icon="film"
            onClick={() => {
              void navigate(ROUTES.home);
            }}
          >
            Back to home
          </GlassButton>
        </div>

        <details className={styles.details}>
          <summary className={styles.summary}>Technical details</summary>
          <code className={styles.code}>{describeError(error)}</code>
        </details>
      </div>
    </main>
  );
}
