import React from 'react';
import './types';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// A refresh always starts at the top of the page. The browser would otherwise put you back where you were, and a
// `#work` or `#contact` left in the address by a link would scroll there again. A link opened fresh (a shared
// /#work, say) still goes to its section; only a reload is reset.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
if (navEntry?.type === 'reload') {
  if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
  window.scrollTo(0, 0);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);