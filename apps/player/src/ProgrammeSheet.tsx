import { Text } from './Typography';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { catchupAvailability, catchupMedia } from './catchup';
import { loadServerTimeZone } from './provider';
import type { Media } from './provider';
import type { Profile } from './vault';
import type { GuideProgramme } from './xmltv';
import { Button, Notice, u } from './ui';

/** Programme details in a native form sheet (phones). Drag it down, or past the top detent, with a finger. */
export default function ProgrammeSheet({ profile, item, programme, onPlay, onAuthorize }: { profile: Profile; item: Media; programme: GuideProgramme; onPlay: (item: Media) => void; onAuthorize?: () => boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const time = (value: number) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const catchup = catchupAvailability(profile.provider, item, programme);
  async function archive() {
    if (onAuthorize && !onAuthorize()) return;
    request.current?.abort(); const controller = new AbortController(); request.current = controller; setBusy(true); setError('');
    try {
      const zone = await loadServerTimeZone(profile.provider, controller.signal);
      if (controller.signal.aborted) return;
      const clip = catchupMedia(profile.provider, item, programme, zone);
      if (onAuthorize && !onAuthorize()) return;
      onPlay(clip);
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Could not open provider catch-up.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <ScrollView contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 32 }}>
    <Text numberOfLines={1} style={u.eyebrow}>{item.name}</Text>
    <Text style={u.h2}>{programme.title}</Text>
    <Text style={u.small}>{new Date(programme.start).toLocaleDateString()} · {time(programme.start)} – {time(programme.end)}</Text>
    {!!programme.description && <Text style={u.body}>{programme.description}</Text>}
    <Text style={u.small}>{catchup.reason}</Text>
    <Button title="Watch live" variant={catchup.available ? 'secondary' : 'primary'} disabled={busy} icon="play" onPress={() => onPlay(item)} />
    {catchup.available && <Button title="Watch catch-up" busy={busy} onPress={() => { void archive(); }} />}
    {!!error && <Notice danger>{error}</Notice>}
  </ScrollView>;
}
