import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import type { Provider } from './provider';
import { importXtreamLink } from './provider';
import type { Profile } from './vault';
import { Button, Field, Notice, colors, u } from './ui';
const blank: Provider = { kind: 'xtream', name: '', address: '', username: '', password: '' };
export default function ProviderSheet({ profile, busy, error, onSave }: { profile?: Profile; busy: boolean; error: string; onSave: (provider: Provider, profile?: Profile) => void }) {
  const [reveal, setReveal] = useState(false);
  const [imported, setImported] = useState(false);
  const [form, setForm] = useState<Provider>(profile?.provider || blank);
  const detected = form.kind === 'xtream' ? importXtreamLink(form.address) : null;
  const change = (key: keyof Provider, value: string) => setForm(old => ({ ...old, [key]: value }));
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={u.content}>
    <View style={{ gap: 10 }}><Text style={u.h1}>{profile ? 'Profile details' : 'Connect your playlist'}</Text><Text style={u.body}>Choose how you connect. We’ll save your details securely on this iPhone.</Text></View>
    <View style={{ flexDirection: 'row', padding: 5, borderRadius: 18, backgroundColor: '#EAE9EE', gap: 5 }}>{(['xtream', 'm3u'] as const).map(kind => <Pressable key={kind} accessibilityRole="button" disabled={busy} onPress={() => change('kind', kind)} style={{ flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 14, backgroundColor: form.kind === kind ? '#fff' : 'transparent' }}><Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{kind === 'xtream' ? 'Xtream Codes' : 'M3U link'}</Text></Pressable>)}</View>
    <Field label="Profile name" placeholder="My living room" value={form.name} onChangeText={v => change('name', v)} editable={!busy} />
    <Field label={form.kind === 'xtream' ? 'Server address' : 'Playlist link'} placeholder={form.kind === 'xtream' ? 'https://your-provider.com:8080' : 'https://your-provider.com/playlist.m3u'} value={form.address} onChangeText={v => change('address', v)} editable={!busy} keyboardType="url" />
    {detected && <Notice><Text>We found login details in this provider link. </Text><Text accessibilityRole="button" onPress={() => { setForm(current => ({ ...current, ...detected })); setImported(true); }} style={u.link}>Fill the fields for me</Text></Notice>}
    {imported && <Text style={u.small}>Login details filled on this device. Check them below before connecting.</Text>}
    {form.kind === 'xtream' && <><Field label="Username" placeholder="Your provider username" value={form.username} onChangeText={v => change('username', v)} editable={!busy} textContentType="username" /><Field label="Password" placeholder="Your provider password" value={form.password} onChangeText={v => change('password', v)} secureTextEntry={!reveal} editable={!busy} textContentType="password" /><Pressable accessibilityRole="button" accessibilityLabel={reveal ? 'Hide password' : 'Show password'} onPress={() => setReveal(value => !value)} style={{ alignSelf: 'flex-end', paddingVertical: 4 }}><Text style={u.link}>{reveal ? 'Hide password' : 'Show password'}</Text></Pressable></>}
    {!!error && <Notice danger>{error}</Notice>}
    <Button title={busy ? 'Connecting to your provider…' : 'Connect playlist'} busy={busy} onPress={() => onSave(form, profile)} icon="arrow-forward" />
    <Notice>{Platform.OS === 'web' ? 'Browser preview keeps provider details in memory only. Use Expo Go to securely save profiles on your iPhone.' : 'Saved on this iPhone using iOS secure storage. No account or cloud upload. Your details are only sent to your IPTV provider when connecting.'}</Notice>
    <Text style={u.small}>Use HTTPS when available. HTTP connections send details without encryption. You’ll need your own IPTV subscription or playlist.</Text>
  </ScrollView></KeyboardAvoidingView>;
}
