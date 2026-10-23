import { SITE_URL } from '@/lib/site';
// Only public, canonical pages. Authenticated URLs never belong in this list.
export default function sitemap() {
  return [{ url: SITE_URL }, { url: SITE_URL + '/privacidade' }];
}
