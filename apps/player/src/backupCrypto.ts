import type {BackupCrypto} from './backupModel';
export const backupCrypto:BackupCrypto={
 random:async count=>(await import('expo-crypto')).getRandomBytesAsync(count),
 encrypt:async(data,bytes,nonce,additionalData)=>{const Crypto=await import('expo-crypto');const key=await Crypto.AESEncryptionKey.import(bytes);const sealed=await Crypto.aesEncryptAsync(data,key,{nonce:{bytes:nonce},tagLength:16,additionalData});return sealed.combined();},
 decrypt:async(bytes,keyBytes,additionalData)=>{const Crypto=await import('expo-crypto');const key=await Crypto.AESEncryptionKey.import(keyBytes);return Crypto.aesDecryptAsync(Crypto.AESSealedData.fromCombined(bytes,{ivLength:12,tagLength:16}),key,{additionalData});},
};
