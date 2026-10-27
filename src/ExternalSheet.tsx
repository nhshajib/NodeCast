import React, { useState } from 'react';
import { Linking, Platform, Text, View } from 'react-native';
import type { Media } from './provider';
import type { ExternalPlayer } from './players';
import { androidVLCIntent, externalPlayerURL } from './players';
import { streamFormat } from './livePlayback';
import { Button, Icon, Notice, u } from './ui';
export default function ExternalSheet({ item, preferred, onInternal, onOpened }: { item: Media; preferred?: ExternalPlayer; onInternal: () => void; onOpened: () => void }) {
  const [error, setError] = useState('');
  const [opening, setOpening] = useState(false);
  async function open(player: ExternalPlayer) {
    setError('');
    if (Platform.OS === 'web') { setError('External players open from the iPhone app. Use Expo Go with VLC or Infuse installed.'); return; }
    if (!item.url) { setError('No playable stream URL was returned.'); return; }
    setOpening(true);
    try {
      // Do not use canOpenURL: custom-scheme queries are restricted in Expo Go's
      // own native manifest. Attempt the requested handoff and handle rejection.
      if (Platform.OS === 'android') {
        const { startActivityAsync } = await import('expo-intent-launcher');
        await startActivityAsync('android.intent.action.VIEW', androidVLCIntent(item.externalURL || item.url));
      } else await Linking.openURL(externalPlayerURL(player, item.externalURL || item.url));
      onOpened();
    } catch { setError(`Couldn’t open ${player === 'vlc' ? 'VLC' : 'Infuse'}. Install it on your device and try again, or use the NodeCast player. Expo Go can also restrict some app handoffs.`); }
    finally { setOpening(false); }
  }
  const order: ExternalPlayer[] = Platform.OS === 'android' ? ['vlc'] : preferred === 'infuse' ? ['infuse', 'vlc'] : ['vlc', 'infuse'];
  return <View style={[u.content, { paddingTop: 8 }]}><View style={{ gap: 10 }}><Text style={u.h1}>Choose a player</Text><Text style={u.body}>{item.name}</Text></View>{item.kind === 'live' && <Text style={u.small}>Live format: {streamFormat(item.externalURL || item.url)}. You can change the format in Settings → Playback.</Text>}<Notice>The selected app receives the stream URL. That URL may include your IPTV username, password, or access token. Only continue with a player you trust.</Notice>{order.map(player => <Button key={player} title={`Open in ${player === 'vlc' ? 'VLC' : 'Infuse'}`} busy={opening} onPress={() => { void open(player); }} icon="open-outline" />)}<Button title="Use NodeCast player" variant="secondary" disabled={opening} onPress={onInternal} />{!!error && <Notice danger>{error}</Notice>}<Text style={u.small}>Resume progress is saved only by the NodeCast player. External apps manage their own playback position. External apps must be installed separately. Playback and any charges are controlled by those apps. Returning to NodeCast may require switching apps manually.</Text></View>;
}
