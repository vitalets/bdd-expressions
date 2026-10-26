/**
 * Connects native playground controls to worker evaluation and shareable URLs.
 */

import type { Evaluation } from './evaluate.ts';

/**
 * Examples covering the most useful expression features.
 */
const examples = [
  ['I have :count{int} cucumber(s)', 'I have 2 cucumbers'],
  ['I (search for/look up) {string}', 'I search for "red shoes"'],
  ['I create :item( as :owner)', 'I create "report" as "admin"'],
  ['Set {pending/approved/rejected} status', 'Set approved status'],
] as const;

/**
 * Native controls and output regions owned by the playground.
 */
const expression = document.querySelector<HTMLInputElement>('#expression')!;
/**
 * Step text to match against the expression.
 */
const input = document.querySelector<HTMLInputElement>('#input')!;
/**
 * Example buttons that populate both editable fields.
 */
const exampleButtons = document.querySelectorAll<HTMLButtonElement>('[data-example]');
/**
 * Compact evaluation outcome.
 */
const status = document.querySelector<HTMLElement>('#status')!;
/**
 * Evaluation explanation or syntax error.
 */
const message = document.querySelector<HTMLElement>('#message')!;
/**
 * Share button displays clipboard feedback without changing the header layout.
 */
const shareButton = document.querySelector<HTMLButtonElement>('#share')!;

/**
 * Clear actions paired with the editable fields.
 */
const clearButtons = document.querySelectorAll<HTMLButtonElement>('[data-clear]');

/**
 * Pending work is cancelled whenever the input changes.
 */
let worker: Worker | undefined;
let debounce: ReturnType<typeof setTimeout>;
let timeout: ReturnType<typeof setTimeout>;
/**
 * Restores the copy button label after temporary clipboard feedback.
 */
let copyFeedbackTimeout: ReturnType<typeof setTimeout>;

initialize();

function initialize() {
  restoreLink();
  shareButton.addEventListener('click', () => {
    void copyLink();
  });
  expression.addEventListener('input', schedule);
  input.addEventListener('input', schedule);
  exampleButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const selected = examples[Number(button.dataset.example)];
      if (!selected) return;
      [expression.value, input.value] = selected;
      schedule();
    });
  });
  clearButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const field = document.getElementById(button.dataset.clear!) as HTMLInputElement;
      field.value = '';
      field.focus();
      schedule();
    });
  });
  window.addEventListener('hashchange', () => {
    restoreLink();
    schedule();
  });
  schedule();
}

function schedule() {
  shareButton.querySelector('span')!.textContent = 'Copy link';
  updateLink();
  clearTimeout(debounce);
  clearTimeout(timeout);
  worker?.terminate();
  clearButtons.forEach((button) => {
    const field = document.getElementById(button.dataset.clear!) as HTMLInputElement;
    button.hidden = field.value.length === 0;
  });
  document.querySelector('.results')!.setAttribute('aria-busy', 'true');
  status.textContent = 'Evaluating…';
  status.dataset.state = 'pending';
  debounce = setTimeout(run, 180);
}

function run() {
  worker = new Worker(new URL('./evaluate.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent<Evaluation>) => {
    finish();
    render(event.data);
  };
  worker.onerror = () => {
    finish();
    fail('Evaluation could not start. Please reload and try again.');
  };
  timeout = setTimeout(() => {
    finish();
    fail('Evaluation took too long. Try a shorter expression or input.');
  }, 2000);
  worker.postMessage({ expression: expression.value, input: input.value });
}

function finish() {
  clearTimeout(timeout);
  worker?.terminate();
  worker = undefined;
}

function fail(text: string) {
  render({ state: 'error', message: text, positional: '—', named: '—', regexp: '—' });
}

function render(result: Evaluation) {
  document.querySelector('.results')!.setAttribute('aria-busy', 'false');
  status.textContent = { match: 'Match', miss: 'No match', error: 'Error' }[result.state];
  status.dataset.state = result.state;
  input.dataset.state = result.state;
  message.hidden = result.state !== 'error';
  message.textContent = result.state === 'error' ? result.message : '';
  for (const key of ['positional', 'named', 'regexp'] as const) {
    document.getElementById(key)!.textContent = result[key];
  }
}

function restoreLink() {
  const params = new URLSearchParams(location.hash.slice(1));
  if (params.has('expression')) expression.value = params.get('expression')!;
  if (params.has('input')) input.value = params.get('input')!;
}

function updateLink() {
  const url = new URL(location.href);
  url.hash = new URLSearchParams({ expression: expression.value, input: input.value }).toString();
  history.replaceState(null, '', url);
}

async function copyLink() {
  clearTimeout(copyFeedbackTimeout);
  try {
    await navigator.clipboard.writeText(location.href);
    shareButton.querySelector('span')!.textContent = 'Copied';
  } catch {
    shareButton.querySelector('span')!.textContent = 'Retry copy';
  }
  copyFeedbackTimeout = setTimeout(() => {
    shareButton.querySelector('span')!.textContent = 'Copy link';
  }, 2000);
}
