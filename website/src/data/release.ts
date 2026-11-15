import metadata from './release.json';
export interface ReleaseAsset { url:string; size:number; sha256:string; minimumOS:string }
export interface ReleaseMetadata { version:string|null; publishedAt:string|null; source:string; assets:Record<string,ReleaseAsset> }
export default metadata as ReleaseMetadata;
