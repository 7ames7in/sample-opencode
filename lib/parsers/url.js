/**
 * URL 스크래퍼 — cheerio로 HTML → 텍스트
 */
import * as cheerio from 'cheerio';

export async function parseUrl(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NotebookLM-Clone/1.0)' },
  });

  if (!res.ok) {
    throw new Error(`URL 가져오기 실패: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  $('script, style, nav, footer, header, aside, .sidebar, .ads').remove();

  let content = '';
  const mainSelectors = ['article', 'main', '[role="main"]', '.content', '.post-content', '#content'];
  for (const selector of mainSelectors) {
    const el = $(selector);
    if (el.length && el.text().trim().length > 200) {
      content = el.text();
      break;
    }
  }

  if (!content) content = $('body').text();

  content = content.replace(/\s+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim();
  const title = $('title').text().trim() || $('h1').first().text().trim() || new URL(url).hostname;

  return {
    content,
    name: title,
    metadata: { type: 'url', url, title },
    charCount: content.length,
  };
}
