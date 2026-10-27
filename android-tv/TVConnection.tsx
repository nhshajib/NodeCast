import React, { useEffect, useRef, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { compareIP, lookupExitIP } from '../src/network';
import type { ExitIP } from '../src/network';
import type { Preferences } from '../src/storage';
import Pressable from '../src/FocusPressable';
import { colors } from '../src/ui';
// Compact Home status; an IP change is a comparison, never proof of an active VPN.
export default function TVConnection({ baseline, onPress }: { baseline: Preferences['baseline']; onPress: () => void }) {
  const [result, setResult] = useState<ExitIP | null>(null);
  const [pending, setPending] = useState(true);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(Date.now());
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    let alive = true;
    async function refresh() {
      request.current?.abort(); const controller = new AbortController(); request.current = controller;
      setPending(true); setFailed(false); setNow(Date.now());
      try { const next = await lookupExitIP(controller.signal); if (alive && !controller.signal.aborted) { setResult(next); setNow(Date.now()); } }
      catch { if (alive && !controller.signal.aborted) setFailed(true); }
      finally { if (alive && !controller.signal.aborted) setPending(false); }
    }
    void refresh();
    const interval = setInterval(() => { setNow(Date.now()); if (AppState.currentState === 'active') void refresh(); }, 60000);
    const clock = setInterval(() => setNow(Date.now()), 15000);
    const sub = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); else request.current?.abort(); });
    return () => { alive = false; request.current?.abort(); clearInterval(interval); clearInterval(clock); sub.remove(); };
  }, []);
  const state = compareIP(result, baseline?.ip || null, pending || failed || !!result && now - Date.parse(result.checkedAt) > 60000);
  return <Pressable accessibilityRole="button" accessibilityLabel="Connection details in Settings" onPress={onPress} style={{ padding: 12, borderRadius: 16, backgroundColor: state === 'same' ? '#FAE7C8' : '#EEEDFB', gap: 5 }}><View><Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{state === 'same' ? 'Using home IP' : state === 'changed' ? 'Different from home' : 'VPN unverified'}</Text></View><Text numberOfLines={1} style={{ color: colors.secondary, fontSize: 12 }}>{pending ? 'Checking public IP…' : failed ? 'IP check unavailable' : result?.ip || 'IP unavailable'}</Text>{!pending && !failed && result && <Text numberOfLines={1} style={{ color: colors.secondary, fontSize: 11 }}>{[result.city, result.country].filter(Boolean).join(', ') || 'Location unavailable'}</Text>}</Pressable>;
}
