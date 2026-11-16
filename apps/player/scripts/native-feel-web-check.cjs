// Web check for the "Does it feel native?" tests that a browser can run: tab re-tap scrolls
// to top, pressed state before release, and no visible control under 44x44.
// Serve a web export (npx expo export --platform web) on a port, then:
//   node scripts/native-feel-web-check.cjs <port> ios|android
const { chromium } = require('playwright');
const port = process.argv[2] || '8091'; const label = process.argv[3] || 'ios';
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 393, height: 852 }, hasTouch: true });
  const errors=[]; page.on('pageerror', e => errors.push(e.message));
  async function find(selector) {
    return page.evaluate(sel => { for (const el of document.querySelectorAll(sel)) { const r = el.getBoundingClientRect(); if (!r.width) continue; const x=r.left+r.width/2,y=r.top+r.height/2; if (x<0||y<0||x>innerWidth||y>innerHeight) continue; const hit=document.elementFromPoint(x,y); if (hit&&(el===hit||el.contains(hit))) return [x,y]; } return null; }, selector);
  }
  async function tap(selector) { const p = await find(selector); if (!p) throw new Error('no visible ' + selector); await page.mouse.click(p[0], p[1]); await wait(1200); }
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' }); await wait(6000);
  await page.getByText('Explore demo').last().click(); await wait(1500);
  const results = {};
  // Tab: scroll Home down, re-tap Home, expect top.
  const scroller = '[data-testid="home-content"]';
  await page.evaluate(sel => { for (const el of document.querySelectorAll(sel)) { const s = el.scrollHeight > el.clientHeight ? el : el.firstElementChild?.parentElement; } }, scroller);
  const scrolled = await page.evaluate(() => { const els=[...document.querySelectorAll('[data-testid="home-content"]')].filter(e=>e.getBoundingClientRect().width); const el=els[0]; el.scrollTop = 600; return el.scrollTop; });
  await wait(300);
  await tap('a[href="/home"]'); await wait(800);
  const after = await page.evaluate(() => { const el=[...document.querySelectorAll('[data-testid="home-content"]')].filter(e=>e.getBoundingClientRect().width)[0]; return el.scrollTop; });
  results.tabRetapScrollsToTop = { scrolledTo: scrolled, afterRetap: after, pass: scrolled > 0 && after === 0 };
  // Press: feedback visible while the pointer is still down.
  const p = await find(label === 'ios' ? '[aria-label="Settings"]' : '[aria-label="Your playlists"]');
  const before = await page.evaluate(([x,y]) => { let n=document.elementFromPoint(x,y); while(n&&!n.getAttribute('role'))n=n.parentElement; return getComputedStyle(n).opacity; }, p);
  await page.mouse.move(p[0], p[1]); await page.mouse.down(); await wait(150);
  const during = await page.evaluate(([x,y]) => { let n=document.elementFromPoint(x,y); while(n&&!n.getAttribute('role'))n=n.parentElement; return getComputedStyle(n).opacity; }, p);
  await page.mouse.up(); await wait(1200);
  results.pressFeedbackBeforeRelease = { before, during, pass: Number(during) < Number(before) };
  await page.goBack(); await wait(800);
  // 44 pt: every visible control on the screens we visit.
  const small = [];
  for (const href of ['/home', label === 'ios' ? '/movies' : '/live', '/guide']) {
    await tap(`a[href="${href}"]`);
    const found = await page.evaluate(() => [...document.querySelectorAll('[role=button],[role=link],[role=tab],[role=switch],[role=checkbox],[role=radio],a')].map(el => { const r = el.getBoundingClientRect(); const x=r.left+r.width/2,y=r.top+r.height/2; const hit=document.elementFromPoint(x,y); const visible = r.width && x>=0 && y>=0 && x<=innerWidth && y<=innerHeight && hit && (el===hit||el.contains(hit)); return visible && (r.width < 44 || r.height < 44) ? `${(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,30)} ${Math.round(r.width)}x${Math.round(r.height)}` : null; }).filter(Boolean));
    small.push(...found.map(f => `${href}: ${f}`));
  }
  results.under44 = small;
  results.pageErrors = errors;
  console.log(JSON.stringify(results, null, 1));
  await b.close();
})().catch(e => { console.error('FAILED', e.message.split('\n')[0]); process.exit(1); });
