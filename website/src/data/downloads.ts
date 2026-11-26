import type {DownloadPlatform} from './release';
export const editionFolders:Record<DownloadPlatform,string>={ios:'iphone',android:'android-mobile',tv:'android-tv'};
const shared=[
 ['Your playlists, together','Paste your provider’s details to fill the form, or connect with Xtream Codes, an M3U link or a local playlist file. Keep multiple profiles on your device.'],
 ['A full TV guide','Load XMLTV schedules, fix unmatched channels, shift a guide that runs early or late, and use catch-up when your provider supports it.'],
 ['Movies and series','Browse your provider’s library, choose seasons and continue with the next episode.'],
 ['Favorites, lists and history','Save channels, build your own lists, hide titles you never watch and resume where you left off.'],
 ['Playback your way','Adjust playback over the video, choose supported player options and set a sleep timer.'],
 ['Take your settings with you','Export and import an encrypted backup of profiles and preferences. Use family controls for protected categories.'],
];
export const features:Record<DownloadPlatform,string[][]>={
 ios:[...shared.slice(0,4),['Built for iPhone and iPad','Watch in portrait or landscape. Compatible native playback supports AirPlay and picture-in-picture; availability depends on the stream and engine.'],shared[5]],
 android:[...shared],
 tv:[['Made for your remote','Browse with D-pad, Select and Back on Android TV, Google TV and Fire TV.'],...shared.slice(0,3),['A lighter channel library','Use the default text list, enable grid or logos when you want them, and organize each media library separately.'],shared[5]],
};
export function editionFeatures(platform:DownloadPlatform,version:string):string[][] {
 if(version.localeCompare('1.0.2',undefined,{numeric:true})<0)return features[platform];
 return features[platform].map(([title,text])=>title==='Favorites, lists and history'?['Your favorites first','Keep a favorite live channel on Home, pin Live TV categories, build lists and resume recent viewing.']:title==='A lighter channel library'?[title,'Keep favorite Live TV categories first. Use a text list, enable logos or a grid, and hold OK or press Menu on a category to pin it.']:title==='Playback your way'?['Playback, in focus','Centered transport controls and a bottom timeline keep the picture clear. Audio, subtitles and supported player options stay close.']:title==='Your playlists, together'?[title,text+(platform==='tv'?'':' Pull to refresh Home or a library without leaving the screen.')]:[title,text]);
}
export function versionHighlights(platform:DownloadPlatform,version:string):string[]{
 if(version==='1.0.3')return [
  'The old native splash logo is removed. GlowTV’s launch film starts after the system handoff, while fonts load alongside it.',
  'Previous and Next channel controls are visible during normal playback on both native and VLC players.',
  'VLC uses a quieter header, centered transport and bottom audio, player and fullscreen actions.',
  'Prepared search data is reused between queries, with fewer catalogue rebuilds for recent channels.',
  'Existing playlists, favorites, signing, backups and playback engines are retained.',
 ];
 if(version==='1.0.2')return [
  platform==='tv'?"Animated loading placeholders respect reduced motion; refresh stays available through the remote toolbar.":"Pull to refresh on Home and library lists, with animated loading placeholders and reduced-motion support.",
  "Favorite Live TV categories stay at the start of the category list, separately for each playlist, and transfer with encrypted backups.",
  "Home features an available favorite live channel; without one, it shows a greeting.",
  "Centered playback controls, a bottom timeline and quieter actions preserve the existing player engines.",
  "Public-IP/connection screens and lookups removed; older settings and backups remain readable.",
  "Four-second portrait and landscape launch films, with decoded-frame handoff and still-image fallbacks.",
 ];
 if(version==='1.0.1')return platform==='tv'?[
  'The on-screen keyboard now opens when you select a text box with the remote.',
  'Streams that never start show a clear card after 15 seconds with Retry, Try other player and Next channel, instead of spinning forever.',
  'Steadier remote focus: Left always returns to the current page in the menu, lists remember your place, and the menu fits on screen.',
  'Channel logos are on by default and stay after a restart; channels with several categories appear under each one.',
  'A fuller Home with Last watched, Continue watching and Favorites, plus a channel list over live video (press Left).',
  'Leaving the playlist form asks before discarding what you typed. The IP lookup only runs when you ask.',
  'A smaller download for 32-bit Fire TV and Android TV devices (armeabi-v7a), and fewer permissions.',
 ]:[
  'Streams that never start show a clear card with Retry, Try other player and Next channel, instead of spinning forever.',
  'Channels listed under several categories now appear in each of them, and empty categories read "Other".',
  'Clearer messages for missing streams (404) and region-blocked channels.',
  'Existing playlists, profiles, signing and identifiers are retained.',
 ];
 if(version==='1.0.0')return [
  'Faster, ranked search: exact names first, then names that start with what you typed.',
  'Your own lists, hidden titles, and series shown latest-first or unwatched-only, with autoplay of the next episode.',
  'Guide repair: suggested channel matches, a health summary, per-guide time offsets and recent history.',
  'Previous channel, return to live, and audio and subtitles that follow your preferred language.',
  'Paste your provider details to set up in seconds. Backups now carry lists and new preferences, and import lets you add or update.',
  platform==='tv'?'Library options open with focus on the current choice, so every option is reachable with the remote.':'Native navigation, sheets and press feedback across the app.',
  'Existing playlists, profiles, signing and identifiers are retained; 0.7.x backups still import.',
 ];
 if(version==='0.7.4')return [
  'A tidier guide: the filter sits beside the day picker, channels show logos and more rows fit.',
  platform==='tv'?'Focused poster titles no longer clip, and small labels are larger on the big screen.':'An inline show/hide password button and sheets that clear the gesture bar.',
  'Easier-to-read LIVE badges and small labels.',
  'Existing playlists, profiles, playback engines and transitions are retained.',
 ];
 if(version==='0.7.3')return [
  'Native startup handles devices whose JavaScript runtime omits plural-rule support.',
  'Clearer control states, accessible messages and confirmations for destructive actions.',
  'Responsive tablet layouts, readable text and improved guide navigation.',
  ...(platform==='ios'?['Fixed controls respect the native header, search bar and adaptive tab-bar insets.']:platform==='tv'?['Remote Back reaches app handlers; entering a library restores focus without reflowing the poster grid.']:[]),
  platform==='tv'?'More visible remote focus, restored library focus, consistent Back behavior and on-screen playback controls.':'Five focused library tabs, native sheets and measured mini-player placement above navigation.',
  'Existing playlists, profiles, playback engines and transitions are retained.',
 ];
 if(version==='0.7.1'||version==='0.7.2')return [
  'A calmer interface with consistent Lucide icons and an 8px spacing grid.',
  ...(version==='0.7.2'?['Consistent spacing extends to player controls, track menus, TV switches and guide cells.']:[]),
  'Simpler information sections, clearer primary actions and fewer repeated controls.',
  'Theme-safe neutral surfaces with green actions and meaningful LIVE/error indicators.',
  platform==='tv'?'Remote focus and virtualized list measurements stay aligned with the updated spacing.':'Native navigation, existing profiles and playback behavior are retained.',
  ...(platform==='ios'?[]:['Android keeps playback running through unchanged player settings.']),
  ...(platform==='android'?['A compact movie and series header leaves more room for titles on small phones.']:[]),
 ];
 if(version==='0.7.0')return [
  'GlowTV branding, launcher icons, Inter typography and a leaf-green design system.',
  platform==='tv'?'A dedicated TV icon rail, featured live-channel Home and compact guide with remote focus.':platform==='ios'?'Warm iPhone and iPad surfaces, native tabs and sheets, a timeline guide and full-width portrait playback.':'Dark Android surfaces, native pill navigation, checked filters and an Add playlist sheet.',
  platform==='android'?'Fixed Android 13–15 Back navigation from details and settings, including after reopening the app.':'Existing playlists, profiles, playback engines, backups and transition settings remain compatible.',
  ...(platform==='ios'?[]:['Repeated identical player updates keep the existing VLC decoder alive instead of restarting playback.']),
 ];
 if(version!=='0.6.7')return ['Read the version-specific GitHub release notes for the complete list of changes.'];
 const notes=['Compact playback settings stay over the video instead of opening a separate page.','Playing controls hide after four idle seconds; settings dismiss after eight while keeping unsaved edits and accessibility needs in mind.'];
 return [...notes,platform==='tv'?'A lightweight channel list, optional grid/logos and cached category/favorite restoration after restart.':platform==='ios'?'Portrait and landscape playback share the same controls and touch seek timeline.':'Portrait and landscape playback share the same controls; local profiles and settings are retained.'];
}
