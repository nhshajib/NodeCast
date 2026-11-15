import sizes from './screenshots.json';
export function screenshotSize(platform: string, screen: string) {
  return (sizes as Record<string, Record<string, {width:number;height:number;native:boolean}>>)[platform]?.[screen] || {width:720,height:1560,native:false};
}
