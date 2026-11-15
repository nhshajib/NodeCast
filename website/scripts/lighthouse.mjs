import fs from 'node:fs/promises';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import desktop from 'lighthouse/core/config/desktop-config.js';
import http from 'node:http';
import path from 'node:path';
const root=path.resolve('dist');
const server=http.createServer(async(req,res)=>{try{let file=path.join(root,new URL(req.url,'http://localhost').pathname);if(req.url.split('?')[0].endsWith('/'))file=path.join(file,'index.html');if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}const data=await fs.readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'application/javascript','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon','.xml':'application/xml','.webmanifest':'application/manifest+json'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const auditOrigin=process.env.AUDIT_URL||`http://127.0.0.1:${server.address().port}`;
const pages=JSON.parse(await fs.readFile('src/data/pages.json','utf8'));
const routes=process.env.LH_ROUTES?process.env.LH_ROUTES.split(','):['/',...pages.map(p=>`/${p.path}/`),'/404.html'];
const output='audit-results/lighthouse';await fs.mkdir(output,{recursive:true});
const results=[];
async function run(mode){
 const chrome=await chromeLauncher.launch({chromePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',chromeFlags:['--headless','--no-sandbox','--disable-dev-shm-usage']});
 try{for(const route of routes){
  const result=await lighthouse(auditOrigin+route,{port:chrome.port,output:'json',logLevel:'error',onlyCategories:['performance','accessibility','best-practices','seo']},mode==='desktop'?desktop:undefined);
  if(result.lhr.runtimeError)throw new Error(JSON.stringify(result.lhr.runtimeError));
  const lhr=result.lhr;const row={route,mode,scores:Object.fromEntries(Object.entries(lhr.categories).map(([key,value])=>[key,Math.round(value.score*100)])),lcp:lhr.audits['largest-contentful-paint'].numericValue,cls:lhr.audits['cumulative-layout-shift'].numericValue,tbt:lhr.audits['total-blocking-time'].numericValue,bytes:lhr.audits['total-byte-weight'].numericValue,failedAudits:Object.values(lhr.audits).filter(a=>a.score!==null&&a.score<1&&a.details).map(a=>({id:a.id,title:a.title,score:a.score,displayValue:a.displayValue}))};
  results.push(row);await fs.writeFile(`${output}/${mode}-${route==='/'?'home':route.replaceAll('/','-').replace('.html','')}.json`,result.report);await fs.writeFile(`${output}/scores-${mode}.json`,JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(row));
 }}finally{await chrome.kill();}
}
try{await run(process.env.LH_MODE||'mobile');}finally{server.close();}
