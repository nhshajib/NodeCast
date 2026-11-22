import {downloadCount} from '../src/lib/download-counts.mjs';
const root='https://github.com/nhshajib/NodeCast';
const patterns={ios:/^(?:NodeCast|GlowTV)(?:-[\d.]+)?-unsigned\.ipa$|^GlowTV\.ipa$/,android:/^NodeCast-mobile-[\d.]+\.apk$|^GlowTV\.apk$/,tv:/^NodeCast-tv-[\d.]+\.apk$|^GlowTV-TV\.apk$/};
export function selectDownloads(releases,snapshot){
 const platforms={ios:null,android:null,tv:null};
 const candidates=releases.filter(r=>!r.draft&&r.published_at&&/^(?:glowtv-(?:(?:ios|android)-)?v|ios-v|android-v)\d+\.\d+\.\d+$/.test(r.tag_name)).sort((a,b)=>{
  const av=a.tag_name.match(/\d+/g).map(Number),bv=b.tag_name.match(/\d+/g).map(Number);
  for(let i=0;i<3;i++)if(av[i]!==bv[i])return bv[i]-av[i];
  return Date.parse(b.published_at)-Date.parse(a.published_at);
 });
 for(const platform of Object.keys(platforms))for(const release of candidates){
  const asset=release.assets.find(a=>patterns[platform].test(a.name)&&a.state==='uploaded');
  if(!asset||!Number.isSafeInteger(asset.size)||asset.size<=0)continue;
  const expected=`${root}/releases/download/${release.tag_name}/${asset.name}`;
  if(asset.browser_download_url!==expected||!/^sha256:[a-f0-9]{64}$/.test(asset.digest||''))continue;
  const checksum=release.assets.find(a=>a.name===asset.name+'.sha256'||a.name==='SHA256SUMS.txt');
  const saved=snapshot.platforms?.[platform];
  const same=saved?.url===expected&&saved?.sha256===asset.digest.slice(7)&&saved?.size===asset.size;
  platforms[platform]={assetId:Number.isSafeInteger(asset.id)&&asset.id>0?asset.id:null,downloadCount:downloadCount(asset.download_count),version:release.tag_name.match(/\d+\.\d+\.\d+$/)[0],tag:release.tag_name,publishedAt:release.published_at,source:`${root}/releases/tag/${release.tag_name}`,prerelease:!!release.prerelease,legacy:asset.name.startsWith('NodeCast'),file:asset.name,url:expected,size:asset.size,sha256:asset.digest.slice(7),checksumUrl:checksum?.browser_download_url?.startsWith(`${root}/releases/download/${release.tag_name}/`)?checksum.browser_download_url:null,minimumOS:same?saved.minimumOS:null};
  // Downloads of every earlier published version of this edition, so the total
  // never resets when a new release replaces the current file.
  let previous=0;
  for(const other of candidates){if(other===release)continue;for(const a of other.assets||[])if(patterns[platform].test(a.name)&&a.state==='uploaded'){const n=downloadCount(a.download_count);if(n!==null)previous+=n;}}
  platforms[platform].previousDownloadCount=previous;
  break;
 }
 return platforms;
}
