import test from 'node:test';
import assert from 'node:assert/strict';
const base = process.env.TEST_BASE_URL || 'http://localhost:3010';
const publicOrigin = 'https://psicanalistagerlane.com.br';
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base)) throw new Error('Run against a local production build only.');
const request = (pathname, options = {}) => fetch(base + pathname, { redirect: 'manual', signal: AbortSignal.timeout(30000), ...options });
const decode = value => value.replaceAll('&amp;', '&');
const attributes = (html, tag) => [...html.matchAll(new RegExp('<' + tag + '\\b[^>]*>', 'g'))].map(match => Object.fromEntries([...match[0].matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], decode(m[2])])));

test('public HTML has unique metadata, one H1 and consistent canonical/social URLs', async () => {
  const pages = [];
  for (const pathname of ['/', '/privacidade']) {
    const response = await request(pathname); assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /<html[^>]+lang="pt-BR"/);
    assert.equal([...html.matchAll(/<h1(?:\s|>)/g)].length, 1);
    assert.equal([...html.matchAll(/<title>/g)].length, 1);
    const title = html.match(/<title>(.*?)<\/title>/)[1];
    const metas = attributes(html, 'meta');
    const get = name => metas.find(m => m.name === name || m.property === name)?.content;
    assert.ok(get('description')?.length > 60);
    assert.match(get('robots'), /^index, follow$/);
    assert.match(get('viewport'), /width=device-width/);
    const canonical = attributes(html, 'link').filter(l => l.rel === 'canonical');
    assert.equal(canonical.length, 1);
    assert.equal(new URL(canonical[0].href).href, new URL(pathname, publicOrigin).href);
    assert.equal(get('og:url'), canonical[0].href);
    for (const field of ['og:title','og:description','og:type','og:site_name','og:image','twitter:image','twitter:card']) assert.ok(get(field), field);
    assert.equal(get('og:locale'), 'pt_BR');
    assert.equal(get('og:image'), publicOrigin + '/opengraph-image');
    pages.push({ title, description: get('description') });
  }
  assert.notEqual(pages[0].title, pages[1].title); assert.notEqual(pages[0].description, pages[1].description);
});
test('JSON-LD is valid, references real sections and contains no invented ratings or prices', async () => {
 const html = await (await request('/')).text();
 const scripts = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)];
 assert.equal(scripts.length, 1);
 const data = JSON.parse(scripts[0][1]);
 assert.equal(data['@context'], 'https://schema.org');
 assert.deepEqual(data['@graph'].map(n => n['@type']), ['Organization','Person','WebSite','WebPage','Service']);
 const ids = new Set(data['@graph'].map(n => n['@id']));
 for (const node of data['@graph']) for (const value of Object.values(node)) if (value && typeof value === 'object' && value['@id']) assert.ok(ids.has(value['@id']));
 assert.doesNotMatch(scripts[0][1], /aggregateRating|reviewCount|priceCurrency|streetAddress/);
 for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(html.includes('id="' + match[1] + '"'), 'broken anchor: ' + match[1]);
});
test('sitemap and robots contain only intended public URLs and permit rendering resources', async () => {
 const robots = await (await request('/robots.txt')).text();
 assert.match(robots, /Allow: \//); assert.match(robots, /Sitemap: https:\/\/psicanalistagerlane.com.br\/sitemap.xml/);
 assert.doesNotMatch(robots, /Disallow: (?:\/_next|\/images|\/$)/m);
 const response = await request('/sitemap.xml'); assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /xml/);
 const xml = await response.text();
 const locations = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
 assert.deepEqual(locations, [publicOrigin, publicOrigin + '/privacidade']);
 for (const location of locations) assert.doesNotMatch(location, /dashboard|login|cadastro|localhost|\?/);
});
test('auth pages carry noindex and anonymous dashboards redirect to login', async () => {
 for (const pathname of ['/login','/cadastro','/recuperar-senha','/redefinir-senha']) {
  const response = await request(pathname); assert.match(response.headers.get('x-robots-tag'), /noindex/);
  assert.match(await response.text(), /name="robots" content="noindex/);
 }
 for (const pathname of ['/dashboard/admin','/dashboard/paciente']) {
  const response = await request(pathname); assert.ok([302,303,307,308].includes(response.status)); assert.match(response.headers.get('location'), /\/login/);
 }
 const missing = await request('/pagina-inexistente-seo-check'); assert.equal(missing.status,404); assert.match(await missing.text(),/noindex/);
});
test('share image really exists at 1200x630; local images and links resolve', async () => {
 const response = await request('/opengraph-image'); assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /image\/png/);
 const png = Buffer.from(await response.arrayBuffer()); assert.equal(png.readUInt32BE(16),1200); assert.equal(png.readUInt32BE(20),630);
 const html = await (await request('/')).text();
 const paths = new Set([...attributes(html,'img').map(i=>i.src), ...attributes(html,'a').map(a=>a.href)].filter(p=>p?.startsWith('/')&&!p.startsWith('//')));
 for (const pathname of paths) assert.equal((await request(pathname)).status, 200, pathname);
 assert.match(html, /fetchPriority="high"/); assert.match(html, /loading="lazy"/);
 assert.doesNotMatch(html, /googletagmanager\.com\/gtag/);
});
