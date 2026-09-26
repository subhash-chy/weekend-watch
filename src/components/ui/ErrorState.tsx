/**
 * ErrorState — the inline "something went wrong" panel.
 *
 * Distinct from the app-level error boundary: this is used for a single failed
 * request inside an otherwise healthy page, so the rest of the UI stays usable
 * and the user gets a retry control right where the failure happened.
 */

import type { JSX, ReactNode } from 'react';
import classNames from 'classnames';
import { cls } from '@/utils/cx';
import { Icon } from '@/assets/icons/Icon';
import type { IconName } from '@/assets/icons/Icon';
import { GlassButton } from '@/components/ui/GlassButton';
import styles from './ErrorState.module.css';

/** Props accepted by {@link ErrorState}. */
export interface ErrorStateProps {
  /** Heading. Keep it short and non-technical. */
  title?: string | undefined;
  /** Explanation. Already sanitised to a single sentence by the service layer. */
  message: string;
  /** Called when the user asks to retry. Omit to hide the retry button. */
  onRetry?: (() => void) | undefined;
  /** Which glyph to show. Defaults to `error`. */
  icon?: IconName | undefined;
  /** Label for the retry button. */
  retryLabel?: string | undefined;
  /** Optional extra content, e.g. a "report this" link. */
  children?: ReactNode | undefined;
}

/**
 * Renders a recoverable error panel.
 *
 * The panel is `role="alert"` so the failure is announced immediately rather
 * than waiting for the user to browse into it.
 *
 * @param props - Error panel props.
 * @returns A glass panel with a heading, message and optional retry action.
 */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  icon = 'error',
  retryLabel = 'Try again',
  children,
}: ErrorStateProps): JSX.Element {
  return (
    <div className={classNames(cls(styles, 'panel'), 'ww-glass')} role="alert">
      <span className={styles.iconBadge} aria-hidden="true">
        <Icon name={icon} size={24} />
      </span>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.message}>{message}</p>
      {children}
      {onRetry !== undefined ? (
        <GlassButton
          variant="secondary"
          size="md"
          icon="retry"
          onClick={onRetry}
          className={styles.retry}
        >
          {retryLabel}
        </GlassButton>
      ) : null}
    </div>
  );
}
