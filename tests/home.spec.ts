import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Verify our embed configuration without depending on Twitch availability.
  await page.route('https://player.twitch.tv/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html></html>' }),
  );
});

test('renders the page, assets, and hostname-specific Twitch embed', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveTitle('GorvCorp — League of Legends & communauté esport');
  await expect(page.locator('h1')).toContainText('GorvCorp.');
  for (const id of ['accueil', 'equipe', 'webtv', 'recrutement', 'contact']) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  const lineupPath = (await page.locator('.lineup img').getAttribute('src'))!;
  for (const path of ['/gc-logo.webp', lineupPath]) {
    expect((await page.request.get(path)).ok()).toBeTruthy();
  }
  await expect(page.locator('.twitch-player')).toHaveAttribute('src', /parent=127\.0\.0\.1/);
  const playerUrl = new URL((await page.locator('.twitch-player').getAttribute('src'))!);
  expect(Object.fromEntries(playerUrl.searchParams)).toEqual({
    channel: 'GorvCorptv',
    parent: '127.0.0.1',
    autoplay: 'false',
    muted: 'false',
  });
  expect(errors).toEqual([]);
});

test('mobile menu toggles and closes after anchor navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Ouvrir ou fermer le menu' });
  const navigation = page.getByRole('navigation');
  await expect(navigation).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(navigation).toBeVisible();
  await navigation.getByRole('link', { name: 'Notre équipe' }).click();
  await expect(page).toHaveURL(/#equipe$/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(navigation).toBeHidden();
  await expect(page.locator('.twitch-player')).toBeHidden();
  await expect(page.locator('.twitch-mobile-fallback')).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
});

test('contact actions select subjects and validate without sending data', async ({ page }) => {
  await page.goto('/');
  const subject = page.getByLabel('Objet du message');
  const status = page.getByRole('status');
  const submit = page.getByRole('button', { name: 'Envoyer le message' });
  await page.locator('header .discord').click();
  await expect(subject).toHaveValue('Autre');
  await page.getByRole('link', { name: 'Déposer ma candidature' }).click();
  await expect(subject).toHaveValue('Candidature');
  await submit.click();
  await expect(status).toBeHidden();
  await page.getByLabel('Nom ou pseudo').fill('Test GorvCorp');
  await page.getByLabel('Adresse e-mail').fill('invalid');
  await page.getByLabel('Votre message').fill('Un message pour tester le prototype.');
  await submit.click();
  await expect(status).toBeHidden();
  await page.getByLabel('Adresse e-mail').fill('test@example.com');
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await submit.click();
  await expect(status).toBeVisible();
  await expect(status).toContainText('pas encore connecté');
  expect(requests).toEqual([]);
  await subject.selectOption('Partenariat');
  await expect(status).toBeHidden();
  await submit.click();
  await expect(status).toBeVisible();
  await page.getByLabel('Votre message').fill('Une modification du message.');
  await expect(status).toBeHidden();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('serves complete HTML and keeps the prototype form inert', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('GorvCorp.');
    await expect(page.locator('.lineup h3')).toHaveText('League of Legends');
    await expect(page.getByRole('button', { name: 'Envoyer le message' })).toBeDisabled();
    await expect(page.locator('noscript p')).toBeVisible();
    await expect(page.locator('noscript p')).toContainText('Activez JavaScript');
  });
});
