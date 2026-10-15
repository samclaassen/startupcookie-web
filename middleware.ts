// PromptWatch crawler logs (Vercel Routing Middleware).
//
// When an AI crawler (GPTBot, ClaudeBot, PerplexityBot, ...) requests a page, this
// sends one log line to PromptWatch so the visit shows up under Analytics → Crawler
// Logs. Human visitors are never logged here, and every request continues to the
// normal static file untouched.
//
// Setup: add PROMPTWATCH_LOGS_API_KEY (the Startup Cookie project key from
// PromptWatch → Settings → API Keys) in Vercel → startupcookie → Settings →
// Environment Variables. Without the key this file does nothing.
//
// Limitation: middleware runs before the page is served, so every logged visit is
// recorded with status 200 (PromptWatch won't see 404s or 403s from this source).

export const config = {
  // Skip images, fonts, CSS and JS. robots.txt, llms.txt and sitemap.xml stay
  // included because AI crawlers fetching them is useful to see.
  matcher: [
    '/((?!assets/|.*\\.(?:css|js|mjs|map|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|mp4|webm)$).*)',
  ],
};

const AI_CRAWLER =
  /GPTBot|OAI-SearchBot|ChatGPT-User|OAI-AdsBot|ClaudeBot|Claude-User|Claude-SearchBot|claude-web|anthropic-ai|Google-Extended|Google-Agent|GoogleOther|Googlebot|PerplexityBot|Perplexity-User|cohere-ai|MistralAI|DeepSeekBot|GrokBot|xAI-Grok|Grok-DeepSearch|bingbot|Applebot|Amazonbot|Meta-ExternalAgent|meta-externalfetcher|Bytespider|CCBot|DuckAssistBot|YouBot|promptwatch/i;

const INGEST_URL = 'https://logs.promptwatch.com/event';

type Context = { waitUntil?: (promise: Promise<unknown>) => void };

function contentTypeFor(pathname: string): string {
  if (pathname.endsWith('.txt')) return 'text/plain';
  if (pathname.endsWith('.xml')) return 'application/xml';
  if (pathname.endsWith('.json')) return 'application/json';
  return 'text/html';
}

function clientIp(request: Request): string | null {
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0].trim() : null;
}

// Same as next() from @vercel/functions: continue to the static file unchanged.
function continueRequest(): Response {
  return new Response(null, { headers: { 'x-middleware-next': '1' } });
}

export default async function middleware(request: Request, context?: Context) {
  const userAgent = request.headers.get('user-agent') || '';
  const apiKey = process.env.PROMPTWATCH_LOGS_API_KEY;

  if (apiKey && AI_CRAWLER.test(userAgent)) {
    const url = new URL(request.url);
    const event = {
      timestamp: new Date().toISOString(),
      status_code: 200,
      request_method: request.method,
      request_path: url.pathname,
      query_string: url.search ? url.search.slice(1) : null,
      content_type: contentTypeFor(url.pathname),
      client_ip: clientIp(request),
      hostname: url.hostname,
      user_agent: userAgent,
      referrer: request.headers.get('referer'),
    };

    const send = fetch(INGEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify([event]),
    }).catch(() => undefined);

    if (context && typeof context.waitUntil === 'function') {
      context.waitUntil(send);
    } else {
      await send;
    }
  }

  return continueRequest();
}
