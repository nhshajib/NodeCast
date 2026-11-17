import type {DownloadPlatform} from './release';
export const editionFolders:Record<DownloadPlatform,string>={ios:'iphone',android:'android-mobile',tv:'android-tv'};
const shared=[
 ['Your playlists, together','Connect with Xtream Codes, an M3U link or a local playlist file. Keep multiple profiles on your device.'],
 ['A full TV guide','Load XMLTV schedules, search programmes and use catch-up when your provider supports it.'],
 ['Movies and series','Browse your provider’s library, choose seasons and continue with the next episode.'],
 ['Favorites and history','Save channels, resume watching and clear recents without deleting your profiles.'],
 ['Playback your way','Adjust playback over the video, choose supported player options and set a sleep timer.'],
 ['Take your settings with you','Export and import an encrypted backup of profiles and preferences. Use family controls for protected categories.'],
];
export const features:Record<DownloadPlatform,string[][]>={
 ios:[...shared.slice(0,4),['Built for iPhone and iPad','Watch in portrait or landscape. Compatible native playback supports AirPlay and picture-in-picture; availability depends on the stream and engine.'],shared[5]],
 android:[...shared],
 tv:[['Made for your remote','Browse with D-pad, Select and Back on Android TV, Google TV and Fire TV.'],...shared.slice(0,3),['A lighter channel library','Use the default text list, enable grid or logos when you want them, and organize each media library separately.'],shared[5]],
};
export function versionHighlights(platform:DownloadPlatform,version:string):string[]{
 if(version!=='0.6.7')return ['Read the version-specific GitHub release notes for the complete list of changes.'];
 const notes=['Compact playback settings stay over the video instead of opening a separate page.','Playing controls hide after four idle seconds; settings dismiss after eight while keeping unsaved edits and accessibility needs in mind.'];
 return [...notes,platform==='tv'?'A lightweight channel list, optional grid/logos and cached category/favorite restoration after restart.':platform==='ios'?'Portrait and landscape playback share the same controls and touch seek timeline.':'Portrait and landscape playback share the same controls; local profiles and settings are retained.'];
}
