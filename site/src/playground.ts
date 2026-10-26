/**
 * Connects native playground controls to worker evaluation and shareable URLs.
 */

import type { Evaluation } from './evaluate.ts';

/**
 * Examples covering the most useful expression features.
 */
const examples = [
  ['I have :count{int} cucumber(s)', 'I have 2 cucumbers'],
  ['I create :item( as :owner)', 'I create "report"'],
  ['I (click/tap on/press and hold) :target', 'I tap on "Save"'],
  ['Set :status{pending/approved/rejected}', 'Set approved'],
  ['Account :id{biginteger}', 'Account 12345678901234567890'],
] as const;

/**
 * Native controls and output regions owned by the playground.
 */
const expression = document.querySelector<HTMLTextAreaElement>('#expression')!;
/**
 * Step text to match against the expression.
 */
const input = document.querySelector<HTMLTextAreaElement>('#input')!;
/**
 * Preset selector for the editable fields.
 */
const example = document.querySelector<HTMLSelectElement>('#example')!;
/**
 * Compact evaluation outcome.
 */
const status = document.querySelector<HTMLElement>('#status')!;
/**
 * Evaluation explanation or syntax error.
 */
const message = document.querySelector<HTMLElement>('#message')!;
/**
 * Accessible feedback after copying a link.
 */
const shareStatus = document.querySelector<HTMLElement>('#share-status')!;

/**
 * Pending work is cancelled whenever the input changes.
 */
let worker: Worker | undefined;
let debounce: ReturnType<typeof setTimeout>;
let timeout: ReturnType<typeof setTimeout>;

initialize();

function initialize() {
  restoreLink();
  expression.addEventListener('input', schedule);
  input.addEventListener('input', schedule);
  example.addEventListener('change', () => {
    const selected = examples[Number(example.value)];
    if (!selected) return;
    [expression.value, input.value] = selected;
    schedule();
  });
  document.querySelector('#share')!.addEventListener('click', () => {
    void share();
  });
  window.addEventListener('hashchange', () => {
    restoreLink();
    schedule();
  });
  schedule();
}

function schedule() {
  clearTimeout(debounce);
  clearTimeout(timeout);
  worker?.terminate();
  shareStatus.textContent = '';
  render({ state: 'match', message: 'Evaluating…', positional: '—', named: '—', regexp: '—' });
  status.textContent = 'Evaluating…';
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
  status.textContent = { match: 'Match', miss: 'No match', error: 'Error' }[result.state];
  status.dataset.state = result.state;
  message.textContent = result.message;
  for (const key of ['positional', 'named', 'regexp'] as const) {
    document.getElementById(key)!.textContent = result[key];
  }
}

function restoreLink() {
  const params = new URLSearchParams(location.hash.slice(1));
  if (params.has('expression')) expression.value = params.get('expression')!;
  if (params.has('input')) input.value = params.get('input')!;
}

async function share() {
  const url = new URL(location.href);
  url.hash = new URLSearchParams({ expression: expression.value, input: input.value }).toString();
  history.replaceState(null, '', url);
  try {
    await navigator.clipboard.writeText(url.href);
    shareStatus.textContent = 'Link copied';
  } catch {
    shareStatus.textContent = 'Copy the link from the address bar';
  }
}
