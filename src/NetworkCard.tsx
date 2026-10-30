import Pressable from './FocusPressable';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScreenFocus } from './NavigationMotion';
import { compareIP, lookupExitIP } from './network';
import type { ExitIP } from './network';
import type { Preferences } from './storage';
import { Button, Icon, IconButton, Notice, colors, u } from './ui';
export default function NetworkCard({ baseline, onBaseline, onOpenDetails, detailsOnly=false, onCloseDetails }: { baseline: Preferences['baseline']; onBaseline: (value: Preferences['baseline']) => Promise<void>; onOpenDetails?:()=>void; detailsOnly?:boolean; onCloseDetails?:()=>void }) {
  const focused = useScreenFocus();
  const [result, setResult] = useState<ExitIP | null>(null);
  const [busy, setBusy] = useState(true);
  const [clock, setClock] = useState(Date.now());
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
    if (!focused) return;
    void refresh();
    const timer = setInterval(() => setClock(Date.now()), 15000);
    const sub = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { controller.current?.abort(); clearInterval(timer); sub.remove(); };
  }, [focused]);
  const comparison = compareIP(result, baseline?.ip || null, busy || !!error || !!result && clock - Date.parse(result.checkedAt) > 60000);
  const label = comparison === 'changed' ? 'Different from home' : comparison === 'same' ? 'Using home IP' : 'VPN unverified';
  const place = result ? [result.city, result.country].filter(Boolean).join(', ') || 'Location unavailable' : busy ? 'Finding your exit location…' : 'Location unavailable';
  async function storeBaseline() {
    if (!result || busy || error) return;
    setSaving(true); setSaveError('');
    try { await onBaseline({ ip: result.ip, savedAt: new Date().toISOString() }); setConfirm(false); }
    catch { setSaveError('Could not save your reference IP. Try again.'); }
    finally { setSaving(false); }
  }
  const refreshControl = <Pressable accessibilityRole="button" accessibilityLabel="Refresh public IP" disabled={busy} onPress={() => { void refresh(); }} hitSlop={12} style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}>{busy ? <ActivityIndicator size="small" color={colors.accent} /> : <Icon name="refresh-outline" size={18} color={colors.secondary} />}</Pressable>;
  const detailsBody = <SafeAreaView style={u.root}><View style={u.modalHeader}><Text style={u.label}>Connection details</Text><IconButton name="close" label="Close connection details" disabled={saving} onPress={() => { if(onCloseDetails)onCloseDetails();else setDetails(false); setConfirm(false); }} /></View><ScrollView contentContainerStyle={u.content}>
      <View style={{ gap: 7 }}><Text style={u.h1}>Know your connection.</Text><Text style={u.body}>Your public IP and approximate exit location. Updated when you return to the app.</Text></View>
      <View style={u.card}><View style={u.between}><Text style={u.eyebrow}>{error ? 'LAST KNOWN PUBLIC IP' : 'PUBLIC IP ADDRESS'}</Text>{refreshControl}</View><Text selectable style={{ fontSize: result?.ip.includes(':') ? 19 : 30, fontWeight: '600', color: colors.text, letterSpacing: -.7 }}>{result?.ip || 'Unavailable'}</Text><Text style={u.body}>{place}</Text>{!!result?.isp && <Text style={u.small}>Network · {result.isp}</Text>}<Text style={u.small}>{result ? `Checked ${new Date(result.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'No successful lookup yet.'}</Text></View>
      {!!error && <Notice danger>{error} Previous results do not describe your current connection.</Notice>}
      <View style={u.card}><View style={u.row}><Icon name="shield-outline" color={colors.accent} /><Text style={u.label}>VPN status is unverified</Text></View><Text style={u.body}>An IP comparison cannot confirm whether your VPN is connected. Check your VPN app or device settings for its actual status.</Text><Text style={u.body}>{comparison === 'changed' ? 'Your current IP differs from your saved home IP. A VPN is one possible reason, but it is not confirmed.' : comparison === 'same' ? 'Your current IP matches your saved home IP. This does not prove a VPN is off.' : 'Save an IP you know was used with your VPN off to compare it with future checks.'}</Text><Text style={u.small}>Wi-Fi changes, mobile networks, dynamic addresses, and IPv4/IPv6 switching can also change an IP. This checks one lookup request, not every app’s traffic.</Text></View>
      {baseline && <View style={{ gap: 6 }}><Text style={u.eyebrow}>YOUR SAVED HOME IP</Text><Text selectable style={u.label}>{baseline.ip}</Text></View>}
      {confirm ? <View style={u.card}><Text style={u.h2}>Save this home IP?</Text><Text style={u.body}>Turn your VPN off first, return here, and refresh. Only save when you know your VPN is off. This is a comparison aid, not a VPN detector.</Text><Text selectable style={u.label}>{result?.ip}</Text><Button title="Save this home IP" busy={saving} disabled={busy || !!error} onPress={() => { void storeBaseline(); }} /><Button title="Cancel" variant="secondary" disabled={saving} onPress={() => setConfirm(false)} /></View> : <Button title={baseline ? 'Replace home IP' : 'Save home IP'} variant="secondary" disabled={!result || busy || !!error} onPress={() => { setSaveError(''); setConfirm(true); }} />}
      {baseline && !confirm && <Pressable accessibilityRole="button" accessibilityLabel="Remove reference IP" onPress={() => { void onBaseline(null).catch(() => setSaveError('Could not remove the reference IP.')); }}><Text style={[u.link, { textAlign: 'center' }]}>Remove reference IP</Text></Pressable>}
      {!!saveError && <Notice danger>{saveError}</Notice>}
      <Text style={u.small}>IP lookup by ipwho.is. Your public IP is visible to that service. Location is approximate and does not use GPS. IPTV details are never sent.</Text>
    </ScrollView></SafeAreaView>;
  if(detailsOnly)return detailsBody;
  return <View style={[u.card, { padding: 18, gap: 10 }]}>
    <View style={u.between}><View style={[u.row, { gap: 8 }]}><Icon name="shield-outline" size={19} color={colors.accent} /><Text style={[u.label, { fontSize: 14 }]}>Your connection</Text></View>{refreshControl}</View>
    <View style={{ flexDirection: result?.ip.includes(':') ? 'column' : 'row', alignItems: result?.ip.includes(':') ? 'stretch' : 'center', gap: 12 }}><View style={{ flex: 1, gap: 4 }}><Text style={u.eyebrow}>{error ? 'LAST KNOWN PUBLIC IP' : 'PUBLIC IP ADDRESS'}</Text><Text selectable adjustsFontSizeToFit={!result?.ip.includes(':')} minimumFontScale={.85} numberOfLines={result?.ip.includes(':') ? undefined : 1} style={{ fontSize: result?.ip.includes(':') ? 18 : 25, lineHeight: result?.ip.includes(':') ? 26 : 32, fontWeight: '600', letterSpacing: -.6, color: colors.text }}>{result?.ip || (busy ? 'Checking…' : 'Unavailable')}</Text><View style={[u.row, { gap: 4, alignItems: 'flex-start' }]}><Icon name="location-outline" size={14} color={colors.secondary} /><Text style={[u.small, { flex: 1, fontSize: 12 }]}>{place}</Text></View></View>
    <Pressable accessibilityRole="button" accessibilityLabel="VPN & IP details" onPress={() => { if(onOpenDetails)onOpenDetails();else setDetails(true); setSaveError(''); }} style={{ minHeight: 60, paddingHorizontal: 12, paddingVertical: 10, gap: 6, alignItems: result?.ip.includes(':') ? 'flex-start' : 'flex-end', justifyContent: 'center', backgroundColor: colors.pale, borderRadius: 14, maxWidth: result?.ip.includes(':') ? undefined : 124 }}><Text style={{ color: colors.text, fontWeight: '600', fontSize: 11 }}>{label}</Text><View style={[u.row, { gap: 4 }]}><Text style={[u.link, { fontSize: 12 }]}>Details</Text><Icon name="chevron-forward" size={13} color={colors.accent} /></View></Pressable></View>
    {comparison === 'same' && <View style={{ padding: 14, gap: 6, backgroundColor: '#FAE7C8', borderRadius: 16 }}><View style={[u.row, { gap: 7 }]}><Icon name="warning-outline" size={18} color="#7D5520" /><Text style={[u.label, { fontSize: 14, color: colors.ink }]}>You’re using your home IP</Text></View><Text style={[u.small, { color: '#65523E' }]}>This matches your saved home connection. If you expected a VPN, check it before watching. An IP match alone does not confirm VPN status.</Text></View>}
    {!!error && <Text style={u.errorText}>Refresh failed. Previous results may be out of date.</Text>}
    <Modal visible={details} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { if (!saving) { setDetails(false); setConfirm(false); } }}>{detailsBody}</Modal>
  </View>;
}
