import React, { useState } from 'react';
import { Text, View } from 'react-native';
import Player from './Player';
import CompatibilityPlayer from './CompatibilityPlayer';
import { hasCompatibilityPlayer } from './nativePlayback';
import { chooseEngine } from './playbackPolicy';
import type { LiveEngine } from './playbackPolicy';
import { Button, u } from './ui';
type Props = React.ComponentProps<typeof Player> & { liveEngine?: LiveEngine };
export default function BuiltInPlayer({ liveEngine = 'auto', ...props }: Props) {
  const [override, setOverride] = useState<LiveEngine | null>(null);
  const available = hasCompatibilityPlayer();
  const engine = chooseEngine(props.item.kind, override || liveEngine, available);
  if (engine === 'vlc') return <CompatibilityPlayer item={props.item} onProgress={props.onProgress} onClose={props.onClose} onExternal={props.onExternal} />;
  if (engine === 'unavailable') return <View style={[u.center, { padding: 24, backgroundColor: '#090124' }]}><Text style={[u.h2, { color: '#fff' }]}>This build needs the VLC engine</Text><Text style={[u.body, { color: '#C4C0CF' }]}>Expo Go and older builds do not include built-in VLC. Install a new NodeCast development or standalone build. You can use external VLC in the meantime.</Text><Button title="Choose an external player" onPress={props.onExternal} /><Button title="Back to library" variant="secondary" onPress={props.onClose} /></View>;
  return <Player {...props} compatibilityAvailable={available} onCompatibility={available ? () => setOverride('vlc') : undefined} />;
}
