export {};

const navigation = document.querySelector<HTMLElement>('#main-navigation')!;
const menuToggle = document.querySelector<HTMLButtonElement>('.menu-toggle')!;

function setMenuOpen(open: boolean) {
  navigation.classList.toggle('open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.textContent = open ? '✕' : '☰';
}

menuToggle.addEventListener('click', () => {
  setMenuOpen(menuToggle.getAttribute('aria-expanded') !== 'true');
});

navigation.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => setMenuOpen(false));
});

const form = document.querySelector<HTMLFormElement>('#contact-form')!;
const subject = form.querySelector<HTMLSelectElement>('[name="subject"]')!;
const status = form.querySelector<HTMLParagraphElement>('.form-status')!;

document.querySelectorAll<HTMLAnchorElement>('[data-contact-subject]').forEach((link) => {
  link.addEventListener('click', () => {
    subject.value = link.dataset.contactSubject!;
    status.hidden = true;
  });
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  status.hidden = false;
});

form.addEventListener('input', () => {
  status.hidden = true;
});
form.addEventListener('change', () => {
  status.hidden = true;
});
form.querySelector<HTMLButtonElement>('[type="submit"]')!.disabled = false;

// Resolve Twitch's parent in the browser so one static build works on every host.
const player = document.querySelector<HTMLIFrameElement>('.twitch-player')!;
player.src =
  'https://player.twitch.tv/?' +
  new URLSearchParams({
    channel: 'GorvCorptv',
    parent: window.location.hostname,
    autoplay: 'false',
    muted: 'false',
  }).toString();
