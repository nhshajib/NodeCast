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
// Use the checked release snapshot for optional public-counter requests. This
// keeps accessibility/layout checks independent of GitHub rate limits.
const countMetadata=JSON.parse(await fs.readFile('src/data/release.json','utf8')).platforms;
async function auditContext(options={}){
 const context=await browser.newContext(options);
 await context.route('https://api.github.com/repos/nhshajib/NodeCast/releases/assets/*',async route=>{
  const id=Number(route.request().url().split('/').at(-1));
  const item=Object.values(countMetadata).find(item=>item?.assetId===id);
  await route.fulfill({status:item?200:404,json:item?{id,browser_download_url:item.url,download_count:item.downloadCount}:{message:'No asset'}});
 });
 return context;
}
const validator=new HtmlValidate({extends:['html-validate:recommended'],rules:{'void-style':'off','no-trailing-whitespace':'off','long-title':'off','prefer-native-element':'off','wcag/h32':'off','no-inline-style':'off'}});
const report={time:new Date().toISOString(),origin:'local production Astro output',pages:[],errors:[]};const titles=new Set(),descriptions=new Set(),external=new Set();
try{
 for(const route of routes){
  const context=await auditContext({viewport:{width:360,height:900},reducedMotion:'reduce'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const failed=[];page.on('response',r=>{if(r.status()>=400)failed.push(`${r.status()} ${r.url()}`)});
  await page.goto(origin+route,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  const meta=await page.evaluate(()=>({title:document.title,description:document.querySelector('meta[name="description"]')?.getAttribute('content'),canonical:document.querySelector('link[rel="canonical"]')?.getAttribute('href'),h1:document.querySelectorAll('h1').length,images:[...document.images].filter(i=>!i.hasAttribute('alt')||!i.hasAttribute('width')||!i.hasAttribute('height')).map(i=>i.src),schemas:[...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent)),links:[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href'))}));
  assert.equal(meta.h1,1,route+' H1');assert(meta.title.length<60,route+' title length');assert(!titles.has(meta.title),route+' duplicate title');titles.add(meta.title);
  assert(meta.description.length>=140&&meta.description.length<=155,`${route} description ${meta.description.length}`);assert(!descriptions.has(meta.description),route+' duplicate description');descriptions.add(meta.description);if(route==='/404.html'){assert.equal(meta.canonical,undefined,'404 has no canonical');assert.equal(await page.evaluate(()=>document.querySelector('meta[name="robots"]')?.getAttribute('content')),'noindex, follow','404 is noindex');}else assert.equal(meta.canonical,`https://glowtv.app${route}`);assert.deepEqual(meta.images,[],route+' image attributes');
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
 const context=await auditContext();const page=await context.newPage();await page.goto(origin+'/support/');await page.locator('#help-search').fill('buffering');assert(await page.locator('[data-help]:visible').count()>0);assert(await page.locator('[data-help]:visible').count()<20);await context.close();
 const interactions=await auditContext({viewport:{width:360,height:900},reducedMotion:'reduce'});const home=await interactions.newPage();await home.goto(origin+'/');
 const summary=home.locator('.faq summary').first();await summary.focus();await home.keyboard.press('Enter');assert(await summary.evaluate(el=>el.parentElement.open),'FAQ must open from the keyboard');
 const gallery=home.locator('.gallery').first();await gallery.scrollIntoViewIfNeeded();await gallery.focus();await home.keyboard.press('ArrowRight');await home.waitForTimeout(250);assert(await gallery.evaluate(el=>el.scrollLeft>0),'Gallery must scroll from the keyboard');
 const tvTab=home.getByRole('tab',{name:'TV'});await tvTab.click();assert.equal(await tvTab.getAttribute('aria-selected'),'true','Gallery tab must select');assert(await home.locator('#screenshots-panel-tv').isVisible(),'TV screenshots must show');await tvTab.press('ArrowLeft');assert.equal(await home.getByRole('tab',{name:'Android'}).getAttribute('aria-selected'),'true','Arrow keys must move between gallery tabs');
 const next=home.locator('[data-next]');const visible=home.locator('#screenshots-panel-android .gallery');await next.click();await home.waitForTimeout(400);assert(await visible.evaluate(el=>el.scrollLeft>0),'Next button must scroll the gallery');
 assert.deepEqual(await home.evaluate(()=>[...document.querySelectorAll('a,button,summary,input')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&(r.width<24||r.height<24)&&getComputedStyle(e).visibility!=='hidden'}).map(e=>e.textContent?.trim()||e.getAttribute('aria-label'))),[],'Pointer targets must be at least 24px');
 assert.equal(await home.evaluate(()=>document.body.innerText.match(/\[[A-Z_]{5,}\]/g)),null,'No placeholder text on the page');await interactions.close();
 for(const [userAgent,target] of [['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)','/download/iphone/'],['Mozilla/5.0 (Linux; Android 11)','/download/android/'],['Mozilla/5.0 (Linux; Android 11; AFTMM)','/download/tv/']]){const c=await auditContext({userAgent});const p=await c.newPage();await p.goto(origin+'/');assert.equal(await p.locator('[data-platform-download]').first().getAttribute('href'),target);assert.equal(await p.locator('.hero [data-label]').innerText(),'Get GlowTV','Platform detection must not resize the hero label');assert((await p.locator('.hero [data-platform-download]').getAttribute('aria-label')).startsWith('Get GlowTV for '),'Platform destination needs an accessible label');await c.close();}
 const homeFeedbackContext=await auditContext({viewport:{width:393,height:852}});const homeFeedback=await homeFeedbackContext.newPage();await homeFeedback.goto(origin+'/');
 assert.equal(await homeFeedback.locator('.community-feedback figure').count(),9,'Homepage contains every user testimonial');
 assert((await homeFeedback.locator('.feedback-context').innerText()).includes('collected from GlowTV users across social media platforms'),'Accurate social feedback attribution');
 assert(await homeFeedback.locator('.community-feedback').evaluate(el=>Boolean(el.compareDocumentPosition(document.querySelector('#steps-title'))&Node.DOCUMENT_POSITION_FOLLOWING)),'Homepage testimonials appear before installation steps');
 await homeFeedbackContext.close();
 const downloads=JSON.parse(await fs.readFile('src/data/release.json','utf8')).platforms;
 const downloadContext=await auditContext();const downloadPage=await downloadContext.newPage();
 for(const [edition,item]of Object.entries(downloads)){
  if(!item)continue;
  await downloadPage.goto(origin+'/download/'+(edition==='ios'?'iphone':edition)+'/');
  assert(await downloadPage.locator(`a.button[href="${item.url}"]`).count()===1,'One correct primary file per edition: '+edition);
  const details=await downloadPage.locator('.release-grid').innerText();
  for(const value of [item.version,item.file,item.sha256])assert(details.includes(value),'Missing release detail '+edition+' '+value);
  assert(await downloadPage.locator('.download-features article').count()>=6,'Platform features: '+edition);
  const counter=downloadPage.locator('[data-download-count]');
  assert.equal(await counter.count(),1,'One file counter per platform');
  for(const width of [393,1280]){await downloadPage.setViewportSize({width,height:900});assert(await counter.locator('[data-count-value]').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=28),'Download total is prominent on mobile and desktop');}

  assert.equal(await counter.getAttribute('data-asset-url'),item.url,'Counter belongs to the actual download');
  assert((await counter.innerText()).includes('not unique users or installs'),'Counter must explain its scope');
  const feedback=downloadPage.locator('.community-feedback');
  assert.equal(await feedback.locator('figure').count(),9,'All supplied comments remain available');
  const nextReview=feedback.locator('[data-review-next]');for(let i=0;i<12&&!(await feedback.getByText('Rachel Bennett',{exact:true}).evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth}));i++){await nextReview.click();await downloadPage.waitForTimeout(250);}assert(await feedback.getByText('Rachel Bennett',{exact:true}).evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth}),'Every review is reachable with the next button, not only by swiping');
  assert(!(await feedback.innerText()).includes('4.7'),'No invented aggregate rating');
  if(item.legacy)assert((await downloadPage.locator('.download-notice').innerText()).includes('not included'),'Legacy design notice: '+edition);
 }
 await downloadPage.goto(origin+'/download/');
 for(const item of Object.values(downloads))if(item)assert(await downloadPage.locator(`.direct-download-card a[href="${item.url}"]`).count()===1,'Download index must link every edition');
 await downloadContext.close();
 const countItem=downloads.ios;
 if(countItem?.assetId){
  const context=await auditContext({viewport:{width:360,height:900}});let requests=0;
  await context.route('https://api.github.com/repos/nhshajib/NodeCast/releases/assets/*',async route=>{
   requests++;await route.fulfill({json:{id:countItem.assetId,browser_download_url:countItem.url,download_count:1234567}});
  });
  const page=await context.newPage();await page.goto(origin+'/download/iphone/');
  const live=(1234567+(countItem.previousDownloadCount||0)).toLocaleString('en')+' downloads';await page.getByText(live,{exact:true}).waitFor();
  for(const width of [360,393,412,768,1280]){await page.setViewportSize({width,height:915});assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'Large live count must wrap on phones');}
  await page.reload();await page.getByText(live,{exact:true}).waitFor();assert.equal(requests,1,'Fresh session cache prevents repeated API calls');await context.close();
  const offline=await auditContext({viewport:{width:360,height:900}});await offline.route('https://api.github.com/repos/nhshajib/NodeCast/releases/assets/*',route=>route.fulfill({status:429,json:{message:'Rate limit'}}));
  const page2=await offline.newPage();await page2.goto(origin+'/download/iphone/');
  const totalSnap=Number.isSafeInteger(countItem.downloadCount)?countItem.downloadCount+(countItem.previousDownloadCount||0):null;const expected=totalSnap!==null?`${totalSnap.toLocaleString('en')} ${totalSnap===1?'download':'downloads'}`:'Download count unavailable';
  assert.equal(await page2.locator('[data-count-value]').innerText(),expected,'Rate limits retain the honest dated snapshot');await offline.close();
 }
 report.interactions=['Per-edition direct download links, features, checksums and legacy notices','Per-file live download counts, rate-limit fallback, caching and mobile large numbers','Supplied feedback, excerpt attribution and expandable comments; no invented aggregate rating','FAQ keyboard toggle','gallery arrow-key scrolling, tabs and previous/next buttons','24px pointer targets on home','no visible placeholders','iPhone, Android and Fire TV download detection'];
 report.externalLinks=[...external];assert.deepEqual(report.errors,[],'See audit-results/pages.json');
}finally{await fs.writeFile(path.join(output,'pages.json'),JSON.stringify(report,null,2)+'\n');await browser.close();server.close();}
