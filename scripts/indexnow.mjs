#!/usr/bin/env node
// Pings IndexNow (Bing, Yandex, Seznam, Naver and others share submissions) with
// changed startupcookie.com URLs. Google doesn't use IndexNow; use Search Console.
//
// Usage: node scripts/indexnow.mjs https://startupcookie.com/about/ https://startupcookie.com/industries/fintech/
//
// The key is public by design: IndexNow checks that https://startupcookie.com/{key}.txt
// returns the same key. Don't delete that file, or submissions start failing.

const HOST = 'startupcookie.com';
const KEY = 'f486dc847fefe9bf4325b14b315d3917';
const urls = process.argv.slice(2);

if (urls.length === 0) {
  console.error('Usage: node scripts/indexnow.mjs <url> [url...]');
  process.exit(1);
}
const bad = urls.filter((u) => new URL(u).host !== HOST);
if (bad.length) {
  console.error('Only ' + HOST + ' URLs can be submitted: ' + bad.join(', '));
  process.exit(1);
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: 'https://' + HOST + '/' + KEY + '.txt', urlList: urls }),
});
console.log('IndexNow ' + res.status + ' for ' + urls.length + ' URL(s)');
if (res.status !== 200 && res.status !== 202) process.exit(1);
