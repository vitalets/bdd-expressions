document.querySelectorAll('.copy-link').forEach((button) => {
  button.addEventListener('click', () => {
    void copyPlaygroundLink(button);
  });
});

async function copyPlaygroundLink(button) {
  const label = button.querySelector('span');
  try {
    await navigator.clipboard.writeText(new URL(import.meta.env.BASE_URL, location.origin).href);
    label.textContent = 'Copied';
  } catch {
    label.textContent = 'Retry copy';
  }
  setTimeout(() => {
    label.textContent = 'Copy link';
  }, 2000);
}
