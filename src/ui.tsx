import Pressable from './FocusPressable';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
export { colors } from './theme';
import { colors, themedStyles, isDarkTheme } from './theme';

export type IconName = keyof typeof Ionicons.glyphMap;
export function Icon({ name, size = 22, color = colors.text }: { name: IconName; size?: number; color?: string }) { return <Ionicons accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" name={name} size={size} color={color} />; }
export function Button({ title, onPress, variant = 'primary', busy = false, disabled = false, icon }: {
  title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'mint' | 'ink'; busy?: boolean; disabled?: boolean; icon?: IconName;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [u.button, variant === 'secondary' && u.secondaryButton, variant === 'mint' && { backgroundColor: colors.mint }, variant === 'ink' && { backgroundColor: colors.ink }, variant === 'danger' && { backgroundColor: isDarkTheme() ? '#482431' : '#fff0f0' }, (pressed || disabled || busy) && { opacity: .6 }]}>
    {busy ? <ActivityIndicator color={variant === 'ink' ? '#fff' : variant === 'primary' ? colors.primaryText : variant === 'mint' ? colors.onAccent : colors.text} /> : icon && <Icon name={icon} size={19} color={variant === 'danger' ? colors.danger : variant === 'ink' ? '#fff' : variant === 'primary' ? colors.primaryText : variant === 'mint' ? colors.onAccent : colors.text} />}
    <Text style={[u.buttonText, variant !== 'primary' && { color: variant === 'ink' ? '#fff' : variant === 'mint' ? colors.onAccent : colors.text }, variant === 'danger' && { color: colors.danger }]}>{title}</Text>
  </Pressable>;
}
export function IconButton({ name, label, onPress, disabled, dark = false }: { name: IconName; label: string; onPress: () => void; disabled?: boolean; dark?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [u.iconButton, dark && { backgroundColor: '#241D39' }, pressed && { opacity: .6 }]}><Icon name={name} color={dark ? '#fff' : colors.text} /></Pressable>;
}
export function Field({ label, style, onFocus, onBlur, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) {
  const [focused, setFocused] = useState(false);
  return <View style={{ gap: 8 }}><Text style={u.fieldLabel}>{label}</Text><TextInput {...props} accessibilityLabel={props.accessibilityLabel || label} onFocus={event => { setFocused(true); onFocus?.(event); }} onBlur={event => { setFocused(false); onBlur?.(event); }} autoCapitalize="none" autoCorrect={false} placeholderTextColor="#827A90" style={[u.input, focused && { borderColor: colors.accent, backgroundColor: colors.panel }, props.editable === false && { opacity: .65 }, style]} /></View>;
}
export function Empty({ icon, title, message, children }: { icon: IconName; title: string; message: string; children?: React.ReactNode }) {
  return <View style={u.empty}><View style={u.emptyIcon}><Icon name={icon} size={30} color={colors.accent} /></View><Text style={[u.h2, { textAlign: 'center' }]}>{title}</Text><Text style={[u.body, { textAlign: 'center', maxWidth: 330 }]}>{message}</Text>{children}</View>;
}
export function Notice({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) {
  return <View style={[u.notice, danger && { backgroundColor: isDarkTheme() ? '#482431' : '#fff0f0' }]}><Text style={[u.small, danger && { color: colors.danger }]}>{children}</Text></View>;
}
export function SectionHeading({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View style={u.between}><Text style={u.h2}>{title}</Text>{action && <Pressable accessibilityRole="button" hitSlop={4} style={{ minHeight: 44, justifyContent: 'center', paddingLeft: 8 }} onPress={onAction}><Text style={u.link}>{action}</Text></Pressable>}</View>;
}
export const u = themedStyles(() => ({
  root: { flex: 1, backgroundColor: colors.bg }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  body: { color: colors.secondary, fontSize: 15, lineHeight: 23 }, small: { color: colors.secondary, fontSize: 13, lineHeight: 20 },
  h1: { fontSize: 34, lineHeight: 39, fontWeight: '400', fontFamily: 'CrimsonText', color: colors.text, letterSpacing: -.65 }, h2: { fontSize: 19, lineHeight: 25, color: colors.text, fontWeight: '700', letterSpacing: -.5 },
  label: { fontSize: 16, lineHeight: 22, color: colors.text, fontWeight: '600' }, eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: colors.secondary },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: { backgroundColor: colors.panel, borderRadius: 24, padding: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, gap: 18 },
  button: { minHeight: 52, paddingVertical: 15, paddingHorizontal: 22, backgroundColor: colors.primary, borderRadius: 28, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 9 },
  buttonText: { fontSize: 15, color: colors.primaryText, fontWeight: '600', textAlign: 'center', flexShrink: 1 }, secondaryButton: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
  iconButton: { width: 44, height: 44, borderRadius: 24, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' },
  input: { backgroundColor: colors.panel, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 16, color: colors.text, fontSize: 16, minHeight: 54 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.text }, link: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 }, emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.pale },
  notice: { backgroundColor: colors.pale, borderRadius: 16, padding: 16 }, divider: { height: 1, backgroundColor: colors.line },
  modalHeader: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 128, gap: 24 }, errorText: { color: colors.danger, fontSize: 13, lineHeight: 20 },
}));
