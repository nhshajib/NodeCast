import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import type { Provider } from './provider';
import { importXtreamLink } from './provider';
import type { Profile } from './vault';
import { Button, Field, Icon, Notice, colors, u } from './ui';
const blank: Provider = { kind: 'xtream', name: '', address: '', username: '', password: '' };
export default function ProviderSheet({ profile, busy, error, onSave }: { profile?: Profile; busy: boolean; error: string; onSave: (provider: Provider, profile?: Profile) => void }) {
  const [reveal, setReveal] = useState(false);
  const [imported, setImported] = useState(false);
  const [form, setForm] = useState<Provider>(profile?.provider || blank);
  const exportLogin = importXtreamLink(form.address);
  const detected = form.kind === 'xtream' ? exportLogin : null;
  const change = (key: keyof Provider, value: string) => setForm(old => ({ ...old, [key]: value }));
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={u.content}>
    <View style={{ gap: 10 }}><Text style={u.h1}>{profile ? 'Profile details' : 'Connect your playlist'}</Text><Text style={u.body}>Live channels, films, and series from your own provider.</Text></View>
    <View style={{ flexDirection: 'row', padding: 4, borderRadius: 16, backgroundColor: '#EAE9EE', gap: 5 }}>{(['xtream', 'm3u'] as const).map(kind => <Pressable key={kind} accessibilityRole="tab" accessibilityLabel={kind === 'xtream' ? 'Xtream Codes' : 'M3U link'} aria-selected={form.kind === kind} accessibilityState={{ selected: form.kind === kind }} disabled={busy} onPress={() => change('kind', kind)} style={{ flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 14, backgroundColor: form.kind === kind ? '#fff' : 'transparent' }}><Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{kind === 'xtream' ? 'Xtream Codes' : 'M3U link'}</Text></Pressable>)}</View>
    <Field label="Profile name" placeholder="My living room" value={form.name} onChangeText={v => change('name', v)} editable={!busy} />
    <Field label={form.kind === 'xtream' ? 'Server address' : 'Playlist link'} placeholder={form.kind === 'xtream' ? 'https://your-provider.com:8080' : 'https://your-provider.com/playlist.m3u'} value={form.address} onChangeText={v => change('address', v)} editable={!busy} keyboardType="url" />
    {detected && <View style={[u.notice, { gap: 12 }]}><Text style={u.small}>This provider link includes login details.</Text><Button title="Fill the fields for me" variant="secondary" onPress={() => { setForm(current => ({ ...current, ...detected })); setImported(true); }} /></View>}
    {imported && <Text style={u.small}>Login details filled on this device. Check them below before connecting.</Text>}
    {form.kind === 'xtream' && <><Field label="Username" placeholder="Your provider username" value={form.username} onChangeText={v => change('username', v)} editable={!busy} textContentType="username" /><Field label="Password" placeholder="Your provider password" value={form.password} onChangeText={v => change('password', v)} secureTextEntry={!reveal} editable={!busy} textContentType="password" /><Pressable accessibilityRole="button" accessibilityLabel={reveal ? 'Hide password' : 'Show password'} onPress={() => setReveal(value => !value)} style={{ alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}><Text style={u.link}>{reveal ? 'Hide password' : 'Show password'}</Text></Pressable></>}
    {!!error && <Notice danger>{error}</Notice>}
    {form.kind === 'm3u' && exportLogin && /HTTP 404/.test(error) && <View style={[u.card, { backgroundColor: colors.pale }]}><Text style={u.label}>Use the working server connection</Text><Text style={u.small}>This link includes Xtream login details. If your provider does not offer this playlist endpoint, connect directly with those details instead.</Text><Button title="Connect with Xtream instead" busy={busy} onPress={() => { const provider = { ...form, ...exportLogin, kind: 'xtream' as const }; setForm(provider); onSave(provider, profile); }} /></View>}
    <Button title={busy ? 'Connecting to your provider…' : 'Connect playlist'} busy={busy} onPress={() => onSave(form, profile)} icon="arrow-forward" />
    <View style={[u.row, { alignItems: 'flex-start', gap: 8 }]}><Icon name="lock-closed-outline" size={16} color={colors.accent} /><Text style={[u.small, { flex: 1 }]}>{Platform.OS === 'web' ? 'Preview only. Save profiles securely in the iPhone app.' : 'Saved securely on this iPhone. Shared only with your provider when connecting.'}</Text></View>
    <Text style={u.small}>Use HTTPS when available. HTTP connections send details without encryption. You’ll need your own IPTV subscription or playlist.</Text>
  </ScrollView></KeyboardAvoidingView>;
}
