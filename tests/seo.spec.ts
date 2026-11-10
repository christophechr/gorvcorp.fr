import { expect, test } from '@playwright/test';

test.use({ javaScriptEnabled: false });

test('serves canonical metadata and structured data in the initial HTML', async ({ page }) => {
  await page.goto('/?utm_source=seo-test');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://www.gorvcorp.fr/',
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    'https://www.gorvcorp.fr/',
  );
  const description = await page.locator('meta[name="description"]').getAttribute('content');
  expect(description).toContain('League of Legends');
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    'content',
    description!,
  );
  await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute(
    'content',
    description!,
  );
  await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute('content', /noindex/);
  const image = new URL((await page.locator('meta[property="og:image"]').getAttribute('content'))!);
  expect(image.origin).toBe('https://www.gorvcorp.fr');
  const response = await page.request.get(image.pathname);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('image/png');

  const data = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent())!,
  );
  expect(data['@context']).toBe('https://schema.org');
  expect(data['@graph'].map((item: { '@type': string }) => item['@type'])).toEqual([
    'Organization',
    'WebSite',
    'WebPage',
  ]);
  const organization = data['@graph'][0];
  expect(organization.name).toBe('GorvCorp');
  expect(organization.sameAs).toContain('https://x.com/Gorvcorp');
  expect(data['@graph'][1].publisher['@id']).toBe(organization['@id']);
  expect(data['@graph'][2].url).toBe('https://www.gorvcorp.fr/');
});

test('publishes a discoverable sitemap containing only canonical pages', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain('User-agent: *\nAllow: /');
  expect(await robots.text()).toContain('Sitemap: https://www.gorvcorp.fr/sitemap-index.xml');
  const index = await request.get('/sitemap-index.xml');
  expect(index.status()).toBe(200);
  const sitemapUrl = (await index.text()).match(/<loc>([^<]+)<\/loc>/)?.[1];
  expect(sitemapUrl).toBe('https://www.gorvcorp.fr/sitemap-0.xml');
  const sitemap = await request.get(new URL(sitemapUrl!).pathname);
  expect(sitemap.status()).toBe(200);
  const locations = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => match[1],
  );
  expect(locations).toEqual(['https://www.gorvcorp.fr/']);
});

test('returns a non-indexable 404 instead of duplicating the homepage', async ({ page }) => {
  const response = await page.goto('/page-qui-nexiste-pas');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Page introuvable.');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  await page.getByRole('link', { name: 'Retour à l’accueil GorvCorp' }).click();
  await expect(page.locator('h1')).toContainText('GorvCorp.');
});

test('prioritizes the local hero image and loads the local font', async ({ page }) => {
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).hostname !== '127.0.0.1') externalRequests.push(request.url());
  });
  await page.goto('/');
  const hero = page.locator('.hero-image img');
  await expect(hero).toHaveAttribute('loading', 'eager');
  await expect(hero).toHaveAttribute('fetchpriority', 'high');
  await expect(hero).toHaveAttribute('width', '2000');
  await expect(hero).toHaveAttribute('src', /^\/_astro\//);
  await expect(page.locator('.hero-image source[type="image/avif"]')).toHaveAttribute(
    'srcset',
    /640w.*2000w/,
  );
  await expect(page.locator('.lineup img')).toHaveAttribute('loading', 'lazy');
  await expect(page.locator('.lineup img')).toHaveAttribute('width', '750');
  const font = (await page.locator('link[rel="preload"][as="font"]').getAttribute('href'))!;
  expect(font).toMatch(/^\/_astro\/.+\.woff2$/);
  expect((await page.request.get(font)).status()).toBe(200);
  expect(externalRequests).toEqual([]);
});
