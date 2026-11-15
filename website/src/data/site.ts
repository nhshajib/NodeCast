export const origin = 'https://glowtv.app';
export const disclaimer = 'GlowTV is a media player only. It does not sell, host or provide channels, subscriptions or content. Add your own legally obtained playlists.';
export const faqs = [
 ['Does GlowTV include TV channels?', 'No. GlowTV is a player only. You add a playlist or server account from a provider you are entitled to use. No channels or subscriptions are included.'],
 ['Is GlowTV free?', 'Yes. The player is free. Optional support helps its development and does not unlock channels or features. Your content provider may charge separately.'],
 ['Which playlists can I add?', 'You can connect with an M3U or M3U8 playlist URL, import an M3U file, or sign in to your provider with Xtream Codes. A stream manifest is not a channel playlist.'],
 ['Do I need a GlowTV account?', 'No. Your provider profiles and settings stay on your device. You can transfer them with an encrypted backup protected by a password you choose.'],
 ['How do I load the TV guide?', 'Add your provider’s XMLTV URL in the Guide. Programme information depends on your provider and matching channel IDs. Empty schedules do not mean the player is broken.'],
 ['Can I watch past programmes?', 'Catch-up is available for completed programmes when your Xtream provider explicitly supports it and the programme is inside its archive window.'],
 ['Does a different public IP prove my VPN is connected?', 'No. GlowTV can compare your public IP with a home reference. A changed address is not proof of a VPN or a secure connection.'],
 ['Can I cast to another screen?', 'Compatible native playback on iOS supports AirPlay and picture-in-picture. Availability depends on the stream and playback engine. Chromecast is not currently supported.'],
];
export const features = [
 ['A guide that makes sense', 'Browse live channels beside their XMLTV schedules. See what is on now and plan what to watch next.'],
 ['Movies and series, together', 'Keep provider movies, seasons and episodes in one library, with progress and a next-episode action.'],
 ['Catch up when you can', 'Open completed programmes when your provider includes an eligible catch-up archive.'],
 ['Your favorites, close by', 'Save the channels and titles you return to. Pick up your recent viewing without searching again.'],
 ['Room for every playlist', 'Keep separate M3U, file and Xtream profiles, then switch between them without entering details again.'],
 ['Made for the remote', 'A dedicated TV layout, readable rows and clear D-pad focus help you watch comfortably from the sofa.'],
 ['No account needed', 'Profiles stay on your device. Encrypted export and import help you bring your settings to a new one.'],
];
export const screens = ['home','guide','player','movies','series','playlists','search','settings'];
export const screenLabel: Record<string,string> = {home:'Home and continue watching',guide:'TV guide and programme details',player:'Live player and controls',movies:'Movie library',series:'Series details and episodes',playlists:'Add a playlist',search:'Search your library',settings:'Settings and profiles'};
export const platformLabel: Record<string,string> = {ios:'iPhone',android:'Android',tv:'Android TV and Fire TV'};
