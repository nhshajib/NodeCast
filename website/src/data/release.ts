import metadata from './release.json';
export type DownloadPlatform='ios'|'android'|'tv';
export interface DownloadRelease {assetId?:number|null;downloadCount?:number|null;previousDownloadCount?:number|null;version:string;tag:string;publishedAt:string;source:string;prerelease:boolean;legacy:boolean;file:string;url:string;size:number;sha256:string;checksumUrl:string|null;minimumOS:string|null}
export interface ReleaseMetadata {checkedAt:string;verification?:string;platforms:Record<DownloadPlatform,DownloadRelease|null>}
export default metadata as ReleaseMetadata;
