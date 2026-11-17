import fs from 'node:fs/promises';
import {selectDownloads} from './release-selection.mjs';
const snapshot=JSON.parse(await fs.readFile(new URL('../src/data/downloads-snapshot.json',import.meta.url),'utf8'));
let result={...snapshot,verification:'Saved public GitHub release metadata'};
try{
 const response=await fetch('https://api.github.com/repos/nhshajib/NodeCast/releases?per_page=100',{headers:{Accept:'application/vnd.github+json',...(process.env.GITHUB_TOKEN?{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`}:{})},signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new Error(`GitHub returned ${response.status}`);
 const releases=await response.json();if(!Array.isArray(releases))throw new Error('Invalid GitHub release response');
 result={checkedAt:new Date().toISOString(),platforms:selectDownloads(releases,snapshot),verification:'Public GitHub release metadata'};
 // Metadata is optional for minimum OS; size and digest must match the actual asset.
 for(const release of releases.filter(r=>!r.draft)){
  const metadata=release.assets?.find(a=>a.name==='release-metadata.json');
  if(!metadata||!Object.values(result.platforms).some(p=>p?.tag===release.tag_name))continue;
  try{const response=await fetch(metadata.browser_download_url,{signal:AbortSignal.timeout(12000)});if(!response.ok)continue;const details=await response.json();
   for(const item of Object.values(result.platforms)){const entry=item&&details.assets?.[item.file];if(item?.tag===release.tag_name&&entry?.size===item.size&&entry?.sha256===item.sha256&&typeof entry.minimumOS==='string')item.minimumOS=entry.minimumOS;}
  }catch{/* Unknown requirements remain explicitly unlisted. */}
 }
}catch{console.log('GitHub is unavailable; using the checked public-release snapshot.');}
await fs.writeFile(new URL('../src/data/release.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log('Public downloads: '+Object.entries(result.platforms).map(([platform,item])=>`${platform} ${item?.version||'unavailable'}`).join(', '));
