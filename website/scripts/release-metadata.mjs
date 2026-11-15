import fs from 'node:fs/promises';
const repo='nhshajib/NodeCast';
// Offline/preview builds never disguise older binaries as a GlowTV release.
const unavailable={version:null,publishedAt:null,source:'No published GlowTV release was found',assets:{}};
let result=unavailable;
try{
 const response=await fetch(`https://api.github.com/repos/${repo}/releases/latest`,{headers:{Accept:'application/vnd.github+json',...(process.env.GITHUB_TOKEN?{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`}:{})},signal:AbortSignal.timeout(12000)});
 if(response.ok){const release=await response.json();if(/^glowtv-v/.test(release.tag_name)&&!release.draft&&!release.prerelease){
  const metadata=release.assets.find(a=>a.name==='release-metadata.json');
  if(metadata){const raw=await fetch(metadata.browser_download_url,{signal:AbortSignal.timeout(12000)});if(raw.ok){const data=await raw.json();
   const assets={};for(const name of ['GlowTV.apk','GlowTV-TV.apk']){const actual=release.assets.find(a=>a.name===name);const details=data.assets?.[name];if(actual&&details&&/^[a-f0-9]{64}$/.test(details.sha256)&&details.size===actual.size&&typeof details.minimumOS==='string')assets[name]={url:actual.browser_download_url,size:actual.size,sha256:details.sha256,minimumOS:details.minimumOS};}
   result={version:release.tag_name.replace('glowtv-v',''),publishedAt:release.published_at,source:release.html_url,assets};
  }}}
 }
}catch{/* Preview and first-release builds are intentionally valid before a public release exists. */}
await fs.mkdir(new URL('../src/data/',import.meta.url),{recursive:true});await fs.writeFile(new URL('../src/data/release.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(result.version?`Release metadata: ${result.version}`:'Release metadata: first GlowTV binaries are not published yet.');
