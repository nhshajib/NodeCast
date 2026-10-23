import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { compareIP, lookupExitIP } from './network';
import type { ExitIP } from './network';
import type { Preferences } from './storage';
import { Button, Icon, IconButton, Notice, colors, u } from './ui';
export default function NetworkCard({ baseline, onBaseline }: { baseline: Preferences['baseline']; onBaseline: (value: Preferences['baseline']) => Promise<void> }) {
  const [result, setResult] = useState<ExitIP | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [details, setDetails] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const controller = useRef<AbortController | null>(null);
  async function refresh() {
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setBusy(true); setError('');
    try { const value = await lookupExitIP(request.signal); if (!request.signal.aborted) setResult(value); }
    catch (err) { if (!request.signal.aborted) setError((err as Error).message); }
    finally { if (!request.signal.aborted) setBusy(false); }
  }
  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { controller.current?.abort(); sub.remove(); };
  }, []);
  const comparison = compareIP(result, baseline?.ip || null, busy || !!error);
  const label = comparison === 'changed' ? 'IP changed' : comparison === 'same' ? 'Matches saved IP' : 'VPN unverified';
  const place = result ? [result.city, result.country].filter(Boolean).join(', ') || 'Location unavailable' : busy ? 'Finding your exit location…' : 'Location unavailable';
  async function storeBaseline() {
    if (!result || busy || error) return;
    setSaving(true); setSaveError('');
    try { await onBaseline({ ip: result.ip, savedAt: new Date().toISOString() }); setConfirm(false); }
    catch { setSaveError('Could not save your reference IP. Try again.'); }
    finally { setSaving(false); }
  }
  const refreshControl = <Pressable accessibilityRole="button" accessibilityLabel="Refresh public IP" disabled={busy} onPress={() => { void refresh(); }} hitSlop={12} style={{ padding: 5 }}>{busy ? <ActivityIndicator size="small" color={colors.accent} /> : <Icon name="refresh-outline" size={18} color={colors.secondary} />}</Pressable>;
  return <View style={{ backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 16, gap: 12 }}>
    <View style={u.between}><View style={[u.row, { gap: 7 }]}><Icon name="shield-outline" size={17} color={colors.accent} /><Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Your connection</Text></View>{refreshControl}</View>
    <View style={u.between}><View style={{ flex: 1, gap: 5 }}><Text style={[u.eyebrow, { fontSize: 8, letterSpacing: 1.2 }]}>{error ? 'LAST KNOWN PUBLIC IP' : 'PUBLIC IP ADDRESS'}</Text><Text selectable style={{ fontSize: result?.ip.includes(':') ? 16 : 23, fontWeight: '600', letterSpacing: -.5, color: colors.text }}>{result?.ip || (busy ? 'Checking…' : 'Unavailable')}</Text><View style={[u.row, { gap: 4 }]}><Icon name="location-outline" size={11} color={colors.secondary} /><Text numberOfLines={1} style={[u.small, { fontSize: 11, flex: 1 }]}>{place}</Text></View></View><Pressable accessibilityRole="button" accessibilityLabel="VPN & IP details" onPress={() => { setDetails(true); setSaveError(''); }} style={{ alignItems: 'flex-end', gap: 8 }}><View style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, backgroundColor: '#EEEDFB' }}><Text style={{ fontSize: 10, fontWeight: '600', color: colors.secondary }}>{label}</Text></View><View style={[u.row, { gap: 3 }]}><Text style={[u.link, { fontSize: 11 }]}>Details</Text><Icon name="arrow-up-outline" size={11} color={colors.accent} /></View></Pressable></View>
    {!!error && <Text style={[u.errorText, { fontSize: 11 }]}>Refresh failed. Previous results may be out of date.</Text>}
    <Modal visible={details} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { if (!saving) { setDetails(false); setConfirm(false); } }}><SafeAreaView style={u.root}><View style={u.modalHeader}><Text style={u.label}>Connection details</Text><IconButton name="close" label="Close connection details" disabled={saving} onPress={() => { setDetails(false); setConfirm(false); }} /></View><ScrollView contentContainerStyle={u.content}>
      <View style={{ gap: 7 }}><Text style={u.h1}>Know your connection.</Text><Text style={u.body}>Your public IP and approximate exit location. Updated when you return to the app.</Text></View>
      <View style={u.card}><View style={u.between}><Text style={u.eyebrow}>{error ? 'LAST KNOWN PUBLIC IP' : 'PUBLIC IP ADDRESS'}</Text>{refreshControl}</View><Text selectable style={{ fontSize: result?.ip.includes(':') ? 19 : 30, fontWeight: '600', color: colors.text, letterSpacing: -.7 }}>{result?.ip || 'Unavailable'}</Text><Text style={u.body}>{place}</Text>{!!result?.isp && <Text style={u.small}>Network · {result.isp}</Text>}<Text style={u.small}>{result ? `Checked ${new Date(result.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'No successful lookup yet.'}</Text></View>
      {!!error && <Notice danger>{error} Previous results do not describe your current connection.</Notice>}
      <View style={u.card}><View style={u.row}><Icon name="shield-outline" color={colors.accent} /><Text style={u.label}>VPN status is unverified</Text></View><Text style={u.body}>Expo Go cannot confirm whether your VPN is connected. Check your VPN app or iPhone settings for its actual status.</Text><Text style={u.body}>{comparison === 'changed' ? 'Your current IP differs from your saved non-VPN reference. A VPN is one possible reason, but it is not confirmed.' : comparison === 'same' ? 'Your current IP matches your saved non-VPN reference. This does not prove a VPN is off.' : 'Save an IP you know was used with your VPN off to compare it with future checks.'}</Text><Text style={u.small}>Wi-Fi changes, mobile networks, dynamic addresses, and IPv4/IPv6 switching can also change an IP. This checks one lookup request, not every app’s traffic.</Text></View>
      {baseline && <View style={{ gap: 6 }}><Text style={u.eyebrow}>YOUR NON-VPN REFERENCE</Text><Text selectable style={u.label}>{baseline.ip}</Text></View>}
      {confirm ? <View style={u.card}><Text style={u.h2}>Save this reference IP?</Text><Text style={u.body}>Turn your VPN off first, return here, and refresh. Only save when you know your VPN is off. This is a comparison aid, not a VPN detector.</Text><Text selectable style={u.label}>{result?.ip}</Text><Button title="Save this reference IP" busy={saving} disabled={busy || !!error} onPress={() => { void storeBaseline(); }} /><Button title="Cancel" variant="secondary" disabled={saving} onPress={() => setConfirm(false)} /></View> : <Button title={baseline ? 'Replace non-VPN reference IP' : 'Save non-VPN reference IP'} variant="secondary" disabled={!result || busy || !!error} onPress={() => { setSaveError(''); setConfirm(true); }} />}
      {baseline && !confirm && <Pressable accessibilityRole="button" onPress={() => { void onBaseline(null).catch(() => setSaveError('Could not remove the reference IP.')); }}><Text style={[u.link, { textAlign: 'center' }]}>Remove reference IP</Text></Pressable>}
      {!!saveError && <Notice danger>{saveError}</Notice>}
      <Text style={u.small}>IP lookup by ipwho.is. Your public IP is visible to that service. Location is approximate and does not use GPS. IPTV details are never sent.</Text>
    </ScrollView></SafeAreaView></Modal>
  </View>;
}
