import { Text } from './Typography';
import React from 'react';
import { ScrollView, View } from 'react-native';
import Pressable from './FocusPressable';
import { useThemeChoice } from './theme';
import type { ThemeChoice } from './theme';
import { Icon, colors, u } from './ui';
export default function AppearanceSettings({ onSave }: { onSave: (theme: ThemeChoice) => Promise<void> }) {
  const { choice } = useThemeChoice(); const [error, setError] = React.useState('');
  return <ScrollView contentContainerStyle={u.content}><Text style={u.h1}>Appearance</Text><Text style={u.body}>The same calm space, in your preferred light.</Text><View style={u.card}>{(['light','dark','system'] as const).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${value} appearance`} accessibilityState={{ checked: choice === value }} onPress={() => { void onSave(value).catch(() => setError('Could not save appearance.')); }} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 16 }}><Icon name={choice === value ? 'radio-button-on' : 'radio-button-off'} color={choice === value ? colors.link : colors.secondary} /><Text style={[u.label, choice === value && { color: colors.link }]}>{value === 'system' ? 'Follow device' : value === 'dark' ? 'Dark' : 'Light'}</Text></Pressable>)}</View>{!!error && <Text style={u.errorText}>{error}</Text>}</ScrollView>;
}
