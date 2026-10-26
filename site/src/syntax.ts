/**
 * Keeps the syntax index aligned with the section currently being read.
 */

/**
 * Index links paired with their document headings, in reading order.
 */
const sections = Array.from(document.querySelectorAll<HTMLAnchorElement>('.syntax-index a')).map(
  (link) => ({ link, heading: document.getElementById(link.hash.slice(1))! }),
);

/**
 * Scrollable index container, independent of the document scroll position.
 */
const index = document.querySelector<HTMLElement>('.syntax-index')!;

/**
 * Coalesces scroll events into one update per animation frame.
 */
let scheduled = false;

window.addEventListener('scroll', scheduleUpdate, { passive: true });
window.addEventListener('resize', scheduleUpdate);
window.addEventListener('hashchange', scheduleUpdate);
updateCurrentSection();

function scheduleUpdate() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    updateCurrentSection();
  });
}

function updateCurrentSection() {
  const headerHeight = document.querySelector('header')!.getBoundingClientRect().height;
  document.documentElement.style.setProperty('--syntax-header-height', `${headerHeight}px`);
  const offset = Number.parseFloat(getComputedStyle(sections[0]!.heading).scrollMarginTop) + 10;
  let current = sections[0];
  for (const section of sections) {
    if (section.heading.getBoundingClientRect().top > offset) break;
    current = section;
  }
  if (!current || current.link.getAttribute('aria-current') === 'location') return;
  for (const { link } of sections) link.removeAttribute('aria-current');
  current.link.setAttribute('aria-current', 'location');
  const bounds = index.getBoundingClientRect();
  const linkBounds = current.link.getBoundingClientRect();
  if (linkBounds.top < bounds.top) index.scrollTop += linkBounds.top - bounds.top;
  if (linkBounds.bottom > bounds.bottom) index.scrollTop += linkBounds.bottom - bounds.bottom;
}
