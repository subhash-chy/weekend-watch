/**
 * Application entry point.
 *
 * Global styles are imported here — and only here — so the CSS layering order
 * (fonts → tokens → animations → globals) is explicit in one place instead of
 * being implied by whichever component happens to import a stylesheet first.
 *
 * `StrictMode` is on. It double-invokes effects in development, which is what
 * surfaces the unmount-safety problems (uncleared timers, missing aborts) that
 * would otherwise only appear in production.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import '@/styles/globals.css';

/** The mount node declared in `index.html`. */
const container = document.getElementById('root');

if (container === null) {
  // This can only happen if index.html is malformed, and failing loudly is
  // better than silently rendering nothing.
  throw new Error('Missing #root element — index.html is malformed.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
