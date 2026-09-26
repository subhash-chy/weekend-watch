/**
 * SegmentedControl — a mutually exclusive choice rendered as a sliding pill.
 *
 * Implements the ARIA radiogroup pattern rather than a pair of toggle buttons,
 * because exactly one option is always selected. That means arrow keys move the
 * selection (roving tabindex keeps a single Tab stop), and `aria-checked`
 * reports state — behaviour a screen-reader user expects from a radio set.
 */

import classNames from 'classnames';
import { cls } from '@/utils/cx';
import { useRef } from 'react';
import type { JSX, KeyboardEvent } from 'react';
import styles from './SegmentedControl.module.css';

/** One selectable option. */
export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/** Props accepted by {@link SegmentedControl}. */
export interface SegmentedControlProps<T extends string> {
  /** Available options. */
  options: readonly SegmentedOption<T>[];
  /** Currently selected value. */
  value: T;
  /** Called with the new value when the user changes the selection. */
  onChange: (value: T) => void;
  /** Accessible name for the group. Required — it is what AT announces. */
  label: string;
  /** Extra classes on the root. */
  className?: string | undefined;
}

/**
 * Renders an accessible segmented control.
 *
 * @param props - Control props.
 * @returns A `radiogroup` element.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedControlProps<T>): JSX.Element {
  const listRef = useRef<HTMLDivElement>(null);

  /**
   * Moves the selection by a signed step, wrapping at both ends, and moves
   * DOM focus to the newly selected radio.
   *
   * @param fromIndex - Index of the currently focused option.
   * @param delta - Direction and distance to move.
   */
  const moveBy = (fromIndex: number, delta: number): void => {
    if (options.length === 0) return;
    const nextIndex = (fromIndex + delta + options.length) % options.length;
    const next = options[nextIndex];
    if (next === undefined) return;
    onChange(next.value);

    // Focus must follow selection in a radiogroup, otherwise the user tabs
    // into the old option and the arrow keys appear to do nothing.
    requestAnimationFrame(() => {
      const node = listRef.current?.querySelector<HTMLElement>(
        `[data-value="${next.value}"]`,
      );
      node?.focus();
    });
  };

  /**
   * Handles radiogroup keyboard navigation.
   *
   * Attached to each radio rather than to the group: buttons are natively
   * focusable, so the group itself stays out of the tab order and needs no
   * `tabIndex` of its own.
   *
   * @param event - The keydown event from a focused radio.
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    const currentIndex = options.findIndex((option) => option.value === value);
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        moveBy(currentIndex < 0 ? 0 : currentIndex, 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        moveBy(currentIndex < 0 ? 0 : currentIndex, -1);
        break;
      case 'Home':
        event.preventDefault();
        moveBy(currentIndex, -currentIndex);
        break;
      case 'End':
        event.preventDefault();
        moveBy(currentIndex, options.length - 1 - currentIndex);
        break;
      default:
        break;
    }
  };

  const selectedIndex = options.findIndex((option) => option.value === value);
  // The pill is positioned by index so it can slide without measuring text.
  const pillOffset = selectedIndex < 0 ? 0 : (100 / options.length) * selectedIndex;

  return (
    <div
      ref={listRef}
      role="radiogroup"
      aria-label={label}
      className={classNames(cls(styles, 'group'), className)}
    >
      <span
        className={styles.pill}
        aria-hidden="true"
        style={{
          width: `${100 / Math.max(options.length, 1)}%`,
          transform: `translate3d(${pillOffset * Math.max(options.length, 1)}%, 0, 0)`,
        }}
      />
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            // Roving tabindex: only the selected radio is in the tab order.
            tabIndex={selected ? 0 : -1}
            data-value={option.value}
            className={classNames(
              cls(styles, 'option'),
              selected && cls(styles, 'optionSelected'),
            )}
            onClick={() => onChange(option.value)}
            onKeyDown={handleKeyDown}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
