import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {HtmlValidate} from 'html-validate';
const root=path.resolve('dist'),output=path.resolve('audit-results');await fs.mkdir(output,{recursive:true});
const pages=JSON.parse(await fs.readFile('src/data/pages.json','utf8'));
const routes=['/',...pages.map(p=>`/${p.path}/`),'/404.html'];
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');let pathname=decodeURIComponent(url.pathname);let file=path.join(root,pathname);if(pathname.endsWith('/'))file=path.join(file,'index.html');if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}const data=await fs.readFile(file);const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2','.xml':'application/xml','.json':'application/json','.webmanifest':'application/manifest+json'})[ext]||'application/octet-stream');res.end(data);}catch{res.writeHead(404).end('Not found');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
const validator=new HtmlValidate({extends:['html-validate:recommended'],rules:{'void-style':'off','no-trailing-whitespace':'off','long-title':'off','prefer-native-element':'off','wcag/h32':'off','no-inline-style':'off'}});
const report={time:new Date().toISOString(),origin:'local production Astro output',pages:[],errors:[]};const titles=new Set(),descriptions=new Set(),external=new Set();
try{
 for(const route of routes){
  const context=await browser.newContext({viewport:{width:360,height:900},reducedMotion:'reduce'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const failed=[];page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`)});
  await page.goto(origin+route,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  const meta=await page.evaluate(()=>({title:document.title,description:document.querySelector('meta[name="description"]')?.getAttribute('content'),canonical:document.querySelector('link[rel="canonical"]')?.getAttribute('href'),h1:document.querySelectorAll('h1').length,images:[...document.images].filter(i=>!i.hasAttribute('alt')||!i.hasAttribute('width')||!i.hasAttribute('height')).map(i=>i.src),schemas:[...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent)),links:[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href'))}));
  assert.equal(meta.h1,1,route+' H1');assert(meta.title.length<60,route+' title length');assert(!titles.has(meta.title),route+' duplicate title');titles.add(meta.title);
  assert(meta.description.length>=140&&meta.description.length<=155,`${route} description ${meta.description.length}`);assert(!descriptions.has(meta.description),route+' duplicate description');descriptions.add(meta.description);assert.equal(meta.canonical,`https://glowtv.app${route}`);assert.deepEqual(meta.images,[],route+' image attributes');
  for(const schema of meta.schemas){assert.equal(schema['@context'],'https://schema.org');assert(schema['@type']);assert(!JSON.stringify(schema).includes('AggregateRating'));if(schema['@type']==='BreadcrumbList')assert(schema.itemListElement.every((e,i)=>e.position===i+1&&e.item.startsWith('https://glowtv.app/')));if(schema['@type']==='FAQPage')assert(schema.mainEntity.every(e=>e.name&&e.acceptedAnswer.text));}
  const geometries=[];for(const width of [360,768,1280,1920]){await page.setViewportSize({width,height:width<1000?1000:1080});await page.waitForTimeout(60);assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),`${route} overflow ${width}`);geometries.push(width);if(process.env.CAPTURE_ALL==='1'||route==='/')await page.screenshot({path:path.join(output,`${route==='/'?'home':route.replaceAll('/','-').replace('.html','')}-${width}.png`),fullPage:route!=='/'});}
  await page.setViewportSize({width:360,height:900});const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  const html=await fs.readFile(path.join(root,route==='/'?'index.html':route==='/404.html'?'404.html':route+'index.html'),'utf8');const validation=await validator.validateString(html);const htmlErrors=validation.results.flatMap(r=>r.messages.filter(m=>m.severity===2).map(m=>({rule:m.ruleId,message:m.message,selector:m.selector})));
  for(const href of meta.links){if(href.startsWith('/')){const pathname=new URL(href,origin).pathname;let target=path.join(root,pathname);if(pathname.endsWith('/'))target=path.join(target,'index.html');assert(await fs.stat(target).then(()=>true,()=>false),`${route} missing link ${href}`);}else if(href.startsWith('https:'))external.add(href);}
  const imageSources=await page.evaluate(()=>[...document.images].map(i=>i.currentSrc||i.src));for(const src of new Set(imageSources)){const res=await fetch(src);assert(res.ok,`${route} missing image ${src}`);}
  report.pages.push({route,title:meta.title,descriptionLength:meta.description.length,geometries,axeViolations:axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})),htmlErrors,schemas:meta.schemas.map(s=>s['@type']),runtimeErrors:errors,failedRequests:failed});
  if(axe.violations.length||htmlErrors.length||errors.length||failed.length)report.errors.push(route);
  console.log(`${route} axe:${axe.violations.length} html:${htmlErrors.length} runtime:${errors.length} requests:${failed.length}`);await context.close();
 }
 const context=await browser.newContext();const page=await context.newPage();await page.goto(origin+'/support/');await page.locator('#help-search').fill('buffering');assert(await page.locator('[data-help]:visible').count()>0);assert(await page.locator('[data-help]:visible').count()<20);await context.close();
 const interactions=await browser.newContext({viewport:{width:360,height:900},reducedMotion:'reduce'});const home=await interactions.newPage();await home.goto(origin+'/');
 const summary=home.locator('details summary').first();await summary.focus();await home.keyboard.press('Enter');assert(await summary.evaluate(el=>el.parentElement.open),'FAQ must open from the keyboard');
 const gallery=home.locator('.gallery').first();await gallery.scrollIntoViewIfNeeded();await gallery.focus();await home.keyboard.press('ArrowRight');await home.waitForTimeout(250);assert(await gallery.evaluate(el=>el.scrollLeft>0),'Gallery must scroll from the keyboard');
 assert.equal(await home.locator('.photo-card').first().evaluate(el=>getComputedStyle(el).animationName),'none','Reduced motion must disable floating cards');await interactions.close();
 for(const [userAgent,target] of [['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)','/download/iphone/'],['Mozilla/5.0 (Linux; Android 11)','/download/android/'],['Mozilla/5.0 (Linux; Android 11; AFTMM)','/download/tv/']]){const c=await browser.newContext({userAgent});const p=await c.newPage();await p.goto(origin+'/');assert.equal(await p.locator('[data-platform-download]').first().getAttribute('href'),target);await c.close();}
 report.interactions=['FAQ keyboard toggle','gallery arrow-key scrolling','reduced motion','iPhone, Android and Fire TV download detection'];
 report.externalLinks=[...external];assert.deepEqual(report.errors,[],'See audit-results/pages.json');
}finally{await fs.writeFile(path.join(output,'pages.json'),JSON.stringify(report,null,2)+'\n');await browser.close();server.close();}
