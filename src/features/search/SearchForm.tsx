/**
 * SearchForm — the catalogue search input.
 *
 * Used both in the hero and on the results page. It is a real `<form>`, so
 * `Enter` submits it and mobile keyboards get a "Search" return key via
 * `enterKeyHint`. The input has a visible `<label>`, which the original app
 * lacked — a placeholder is not an accessible name.
 *
 * Submission is controlled: the component owns no query state of its own, so
 * the parent (and the URL) stay the single source of truth.
 */

import { useEffect, useId, useRef } from 'react';
// Aliased because `SubmitEvent` also names a global DOM interface, which would
// shadow React's generic synthetic-event type of the same name.
import type { JSX, SubmitEvent as ReactSubmitEvent } from 'react';
import classNames from 'classnames';
import { Icon } from '@/assets/icons/Icon';
import styles from './SearchForm.module.css';

/** Props accepted by {@link SearchForm}. */
export interface SearchFormProps {
  /** Current query value. */
  value: string;
  /** Called on every keystroke. */
  onChange: (value: string) => void;
  /** Called when the form is submitted. */
  onSubmit: (value: string) => void;
  /** Visible label text. Defaults to a descriptive sentence. */
  label?: string | undefined;
  /** Input placeholder. */
  placeholder?: string | undefined;
  /** Whether the control should receive focus on mount. */
  autoFocus?: boolean | undefined;
  /** Visual size. */
  size?: 'md' | 'lg' | undefined;
  /** Extra classes on the root. */
  className?: string | undefined;
}

/**
 * Renders the search form.
 *
 * @param props - Form props.
 * @returns A `<form>` with a labelled input and a submit button.
 */
export function SearchForm({
  value,
  onChange,
  onSubmit,
  label = 'Search for movies, TV shows and people',
  placeholder = 'Try “Neon Meridian”, “thriller”…',
  autoFocus = false,
  size = 'md',
  className,
}: SearchFormProps): JSX.Element {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  /**
   * Handles submission. An empty query is ignored rather than submitting a
   * pointless request.
   *
   * @param event - The submit event.
   */
  const handleSubmit = (event: ReactSubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
  };

  return (
    <form
      role="search"
      className={classNames(
        styles.form,
        size === 'lg' ? styles.formLg : styles.formMd,
        className,
      )}
      onSubmit={handleSubmit}
    >
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>

      <div className={styles.field}>
        <span className={styles.leadingIcon} aria-hidden="true">
          <Icon name="search" size={20} />
        </span>

        <input
          ref={inputRef}
          // Autofocus is deliberate on the search route: the user navigated
          // here to type. The field is labelled, and the prop is opt-in, so
          // the hero instance never steals focus on page load.
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus}
          id={inputId}
          className={styles.input}
          type="search"
          name="query"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-describedby={hintId}
          // Suggests the on-screen keyboard's return key label on mobile.
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          // Longest reasonable query; guards against absurd payloads.
          maxLength={120}
        />

        <button type="submit" className={styles.submit}>
          Search
        </button>
      </div>

      <p id={hintId} className={styles.hint}>
        Press Enter to search. Results come from The Movie Database.
      </p>
    </form>
  );
}
