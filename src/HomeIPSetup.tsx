import Switch from './RemoteSwitch';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, ScrollView, Text, View } from 'react-native';
import { lookupExitIP } from './network';
import type { ExitIP } from './network';
import type { Preferences } from './storage';
import { Button, Icon, Notice, colors, u } from './ui';
export default function HomeIPSetup({ onSave, onSkip }: { onSave: (value: NonNullable<Preferences['baseline']>) => Promise<void>; onSkip: () => Promise<void> }) {
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<ExitIP | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(Date.now());
  const request = useRef<AbortController | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    const timer = setInterval(() => setClock(Date.now()), 5000);
    const app = AppState.addEventListener('change', value => { if (value !== 'active') { request.current?.abort(); setResult(null); setConfirmed(false); setBusy(false); } });
    return () => { alive.current = false; request.current?.abort(); clearInterval(timer); app.remove(); };
  }, []);
  async function check() {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(''); setResult(null);
    try { const ip = await lookupExitIP(controller.signal); if (!controller.signal.aborted && alive.current) { setClock(Date.now()); setResult(ip); } }
    catch (e) { if (!controller.signal.aborted && alive.current) setError((e as Error).message); }
    finally { if (!controller.signal.aborted && alive.current) setBusy(false); }
  }
  async function finish(save: boolean) {
    setSaving(true); setError('');
    try { if (save && result) await onSave({ ip: result.ip, savedAt: new Date().toISOString() }); else await onSkip(); }
    catch { if (alive.current) setError('Could not save your preference. Please try again.'); }
    finally { if (alive.current) setSaving(false); }
  }
  const fresh = result && clock - Date.parse(result.checkedAt) < 60000;
  return <ScrollView contentContainerStyle={u.content}><View style={{ gap: 12 }}><View style={{ width: 58, height: 58, borderRadius: 20, backgroundColor: colors.pale, alignItems: 'center', justifyContent: 'center' }}><Icon name="home-outline" size={28} color={colors.accent} /></View><Text style={u.h1}>Know when you’re home.</Text><Text style={u.body}>Save your home public IP. Later, we’ll warn you when your connection matches it.</Text></View><View style={[u.card, { backgroundColor: '#FAE7C8', borderColor: '#EED9B7' }]}><Text style={[u.label,{color:colors.ink}]}>Before you check</Text><Text style={[u.body,{color:'#65523E'}]}>Connect to your home Wi-Fi and disconnect any VPN. Return here, then confirm below. We never change your VPN settings.</Text></View><View style={[u.row, { alignItems: 'center', minHeight: 56 }]}><Text style={[u.label, { flex: 1, fontSize: 15 }]}>I’m on home Wi-Fi with my VPN disconnected</Text><Switch accessibilityLabel="Home Wi-Fi and VPN disconnected" value={confirmed} onValueChange={value => { setConfirmed(value); setResult(null); }} disabled={busy || saving} trackColor={{ true: colors.mint }} /></View><Button title={result ? 'Check home IP again' : 'Check my home IP'} busy={busy} disabled={!confirmed || saving} onPress={() => { void check(); }} />{result && <View style={u.card}><Text style={u.eyebrow}>HOME IP TO SAVE</Text><Text selectable style={[u.label, { fontSize: result.ip.includes(':') ? 18 : 27, lineHeight: 32 }]}>{result.ip}</Text><Text style={u.small}>{[result.city, result.country].filter(Boolean).join(', ') || 'Approximate location unavailable'}</Text>{!fresh && <Text style={u.errorText}>Please check again before saving this IP.</Text>}<Button title="Save home IP" disabled={!confirmed || !fresh || busy} busy={saving} onPress={() => { void finish(true); }} /></View>}{!!error && <Notice danger>{error}</Notice>}<Button title="Not now" variant="secondary" disabled={busy || saving} onPress={() => { void finish(false); }} /><Text style={u.small}>An IP match is a reminder, not proof that a VPN is off. Home IPs can change; you can update this in Settings. IP lookup is provided by ipwho.is.</Text></ScrollView>;
}
