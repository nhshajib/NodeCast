/** Translation foundation. Only English is complete; do not advertise partial languages. */
const en={home:'Home',library:'Library',favorites:'Favorites',settings:'Settings',live:'Live TV',movies:'Movies',series:'Series',back:'Back',cancel:'Cancel',save:'Save',search:'Search',guide:'TV guide',appearance:'Appearance',family:'Family controls',storage:'Library & storage',playback:'Playback',recent:'Recently watched',retry:'Try again',close:'Close'};
export type TranslationKey=keyof typeof en;
export function t(key:TranslationKey):string{return en[key]}
export const supportedInterfaceLanguages=['en'] as const;
