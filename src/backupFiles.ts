import {Platform,Share} from 'react-native';
import type {File as NativeFile} from 'expo-file-system';
import {backupLimit} from './backupModel';
export async function chooseBackup():Promise<{name:string;text:string}|null>{
 const Picker=await import('expo-document-picker');const {File,Paths}=await import('expo-file-system');
 let file:NativeFile|null=null;
 try{const result=await Picker.getDocumentAsync({type:'*/*',copyToCacheDirectory:true});if(result.canceled)return null;const asset=result.assets[0];if(Platform.OS!=='web')file=new File(asset.uri);if((asset.size||file?.size||0)>backupLimit)throw new Error('This backup is too large. Choose a NodeCast backup smaller than 12 MB.');const text=Platform.OS==='web'&&asset.file?await asset.file.text():await file!.text();if(text.length>backupLimit)throw new Error('This backup is too large.');return{name:asset.name,text};}
 catch(error){if(error instanceof Error&&error.message.includes('too large'))throw error;throw new Error('Could not open the backup picker. On Android TV, a compatible system file picker must be installed.');}
 finally{if(file?.uri.startsWith(Paths.cache.uri)&&file.exists)file.delete();}
}
export async function saveBackup(text:string):Promise<boolean>{
 const name=`NodeCast-backup-${new Date().toISOString().slice(0,10)}.nodecast`;
 if(Platform.OS==='web'){const url=URL.createObjectURL(new Blob([text],{type:'application/octet-stream'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return true;}
 if(Platform.OS==='android'){
  const {ResultCode,startActivityAsync}=await import('expo-intent-launcher');const Legacy=await import('expo-file-system/legacy');
  let result;
  try{result=await startActivityAsync('android.intent.action.CREATE_DOCUMENT',{category:'android.intent.category.OPENABLE',type:'application/octet-stream',flags:3,extra:{'android.intent.extra.TITLE':name}});}catch{throw new Error('Your device needs a system file picker to save backups. On Android TV, install a compatible file manager and try again.');}
  if(result.resultCode!==ResultCode.Success||!result.data)return false;
  if(!result.data.startsWith('content://'))throw new Error('Choose a writable location in the system file picker.');
  try{await Legacy.writeAsStringAsync(result.data,text,{encoding:Legacy.EncodingType.UTF8});return true;}catch{throw new Error('Could not save to that location. Try another folder.');}
 }
 const {File,Paths}=await import('expo-file-system');
 const file=new File(Paths.cache,`nodecast-backup-${Date.now()}.nodecast`);
 try{file.create();file.write(text);const result=await Share.share({url:file.uri,title:name});return result.action===Share.sharedAction;}finally{if(file.exists)file.delete();}
}
