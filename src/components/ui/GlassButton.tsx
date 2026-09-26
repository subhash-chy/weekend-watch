/**
 * GlassButton — the single button primitive.
 *
 * Every interactive control in the app routes through here so that focus rings,
 * disabled states, motion timings and glass refraction behave identically
 * everywhere. It renders a real `<button>` (or an `<a>` when given `href`) and
 * never a `<div>` with an `onClick`.
 */

import classNames from 'classnames';
import { Link } from 'react-router-dom';
import type { LinkProps } from 'react-router-dom';
import { cls } from '@/utils/cx';
import type { JSX, ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react';
import { Icon } from '@/assets/icons/Icon';
import type { IconName } from '@/assets/icons/Icon';
import styles from './GlassButton.module.css';

/** Visual treatments. */
export type GlassButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/** Vertical sizes, all on the 8px grid. */
export type GlassButtonSize = 'sm' | 'md' | 'lg';

/** Props shared by the button and anchor forms. */
interface BaseProps {
  /** Visual treatment. Defaults to `secondary`. */
  variant?: GlassButtonVariant | undefined;
  /** Vertical size. Defaults to `md`. */
  size?: GlassButtonSize | undefined;
  /** Optional leading icon. */
  icon?: IconName | undefined;
  /**
   * Renders as a square icon-only button. When set, `children` is used as the
   * accessible label rather than as visible text.
   */
  iconOnly?: boolean | undefined;
  /** Shows a spinner and disables interaction, for optimistic/pending states. */
  loading?: boolean | undefined;
  /** Stretches the button to its container's width. */
  fullWidth?: boolean | undefined;
  /**
   * Declared on the shared base because both forms need it: on a `<button>` it
   * is the native attribute, and on an `<a>` it maps to `aria-disabled` plus
   * pointer suppression (anchors cannot be natively disabled).
   */
  disabled?: boolean | undefined;
  children?: ReactNode | undefined;
}

/** Button-flavoured props. */
export type GlassButtonProps = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & {
    href?: undefined;
  };

/** Anchor-flavoured props, used when the action is actually a navigation. */
export type GlassLinkProps = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> & {
    href: string;
  };

/**
 * Props for the client-side navigation form.
 *
 * `href` renders a plain anchor, which reloads the document. Internal
 * destinations should use `to` instead so navigation stays inside the SPA and
 * the route chunk loads on demand.
 */
export type GlassRouteProps = BaseProps &
  Omit<LinkProps, keyof BaseProps | 'to'> & {
    to: string;
  };

/**
 * Builds the class list for a glass button.
 *
 * @param variant - Visual treatment.
 * @param size - Vertical size.
 * @param iconOnly - Whether the button is icon-only.
 * @param fullWidth - Whether the button fills its container.
 * @param className - Caller-supplied extra classes.
 * @returns A `classnames` string.
 */
function classesFor(
  variant: GlassButtonVariant,
  size: GlassButtonSize,
  iconOnly: boolean,
  fullWidth: boolean,
  className?: string,
): string {
  return classNames(
    cls(styles, 'button'),
    cls(styles, `variant-${variant}`),
    cls(styles, `size-${size}`),
    iconOnly && cls(styles, 'iconOnly'),
    fullWidth && cls(styles, 'fullWidth'),
    className,
  );
}

/**
 * Renders a frosted-glass button or link.
 *
 * @param props - Button, link or route props. `to` selects the router `Link`
 *   form, `href` the plain anchor form, and neither a `<button>`.
 * @returns A `<button>` or `<a>` element.
 */
export function GlassButton(
  props: GlassButtonProps | GlassLinkProps | GlassRouteProps,
): JSX.Element {
  const {
    variant = 'secondary',
    size = 'md',
    icon,
    iconOnly = false,
    loading = false,
    fullWidth = false,
    children,
    className,
    disabled,
    ...rest
  } = props;

  const isLink = 'href' in props && props.href !== undefined;
  const classes = classesFor(variant, size, iconOnly, fullWidth, className);

  const content = (
    <>
      {loading ? (
        <Icon
          name="spinner"
          size={size === 'lg' ? 20 : 16}
          className={cls(styles, 'spinner')}
        />
      ) : icon !== undefined ? (
        <Icon
          name={icon}
          size={size === 'lg' ? 20 : 16}
          className={cls(styles, 'icon')}
        />
      ) : null}
      {iconOnly ? <span className="ww-sr-only">{children}</span> : children}
    </>
  );

  // Checked before `href`: an internal route must not fall through to a
  // document-reloading anchor.
  if ('to' in props) {
    const { to, ...linkRest } = props as Omit<GlassRouteProps, keyof BaseProps>;
    return (
      <Link
        to={to}
        className={classes}
        aria-disabled={disabled === true || undefined}
        {...linkRest}
      >
        {content}
      </Link>
    );
  }

  if (isLink) {
    const { href, ...anchorRest } = rest as Omit<GlassLinkProps, keyof BaseProps>;
    // Links cannot be truly disabled; `aria-disabled` plus pointer suppression
    // is the correct pattern and keeps them focusable for screen readers.
    return (
      <a
        href={href}
        className={classes}
        aria-disabled={disabled === true || undefined}
        {...anchorRest}
      >
        {content}
      </a>
    );
  }

  const buttonRest = rest as Omit<GlassButtonProps, keyof BaseProps>;
  return (
    <button
      type="button"
      className={classes}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      {...buttonRest}
    >
      {content}
    </button>
  );
}
