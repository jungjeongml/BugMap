import { Bug, CircleAlert } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, useWindowDimensions, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { contours, wordmark } from './nicknameBrand';

const palette = {
  background: '#101C16', text: '#F3F7EE', secondary: '#BDCDC2', hint: '#A7BBAD',
  accent: '#C5EE79', onAccent: '#202E13', field: '#1C2C23', border: '#6D8677',
  error: '#FFA99B', disabled: '#23332A', disabledBorder: '#3D5044', disabledText: '#8FA496',
  brand: '#18271F', brandBorder: '#354B3C',
};

function nicknameError(value: string): string | undefined {
  const length = [...value.trim().normalize('NFC')].length;
  if (length < 2) return '닉네임을 2자 이상 입력해 주세요';
  if (length > 12) return '닉네임을 12자 이하로 입력해 주세요';
  if (/[\p{Cc}\p{Cs}\p{Zl}\p{Zp}]/u.test(value.trim())) return '닉네임은 한 줄로 입력해 주세요';
}

type Props = {
  pending: boolean;
  notice?: string;
  onEdit: () => void;
  onSave: (value: string) => void;
  onSignOut: () => void;
};

export function NicknameScreen({ pending, notice, onEdit, onSave, onSignOut }: Props) {
  const { width } = useWindowDimensions();
  const compact = width < 375;
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const composing = useRef(false);
  const saveAfterEditing = useRef(false);
  const deferredValidation = useRef(false);
  const [isComposing, setIsComposing] = useState(false);
  const [raw, setRaw] = useState('');
  const [acceptedInput, setAcceptedInput] = useState('');
  const [focused, setFocused] = useState(false);
  const [checked, setChecked] = useState(false);
  const invalid = nicknameError(acceptedInput);
  const fieldError = checked && acceptedInput !== '' ? invalid : undefined;
  const disabled = pending || isComposing || Boolean(invalid);

  const update = useCallback((value: string) => {
    setRaw(value);
    if (!composing.current) setAcceptedInput(value);
    if (!value) setChecked(false);
    onEdit();
  }, [onEdit]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const element = input.current as unknown as HTMLInputElement | null;
    if (!element?.addEventListener) return;
    function start() {
      composing.current = true;
      setIsComposing(true);
    }
    function end(event: Event) {
      composing.current = false;
      setIsComposing(false);
      update((event.currentTarget as HTMLInputElement).value);
      if (deferredValidation.current) {
        deferredValidation.current = false;
        setChecked(true);
      }
    }
    element.addEventListener('compositionstart', start);
    element.addEventListener('compositionend', end);
    return () => {
      element.removeEventListener('compositionstart', start);
      element.removeEventListener('compositionend', end);
    };
  }, [update]);

  function validate() {
    if (composing.current) deferredValidation.current = true;
    else setChecked(true);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={styles.keyboardArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
          <View style={styles.content}>
            <View aria-hidden accessible={false} importantForAccessibility="no-hide-descendants"
              style={[styles.brand, compact && styles.compactBrand]}>
              <View style={styles.contours}>
                <SvgXml xml={contours} width="100%" height="100%" />
                <View style={styles.markerIcon}><Bug color={palette.onAccent} size={18} /></View>
              </View>
              <SvgXml xml={wordmark} width={103} height={32} />
            </View>
            <Text accessibilityRole="header" style={styles.title}>닉네임을 정해 주세요</Text>
            <Text style={styles.description}>공개 기록에 작성자 이름으로 표시돼요.</Text>
            <View style={[styles.field, compact && styles.compactField]}>
              <Text style={styles.label} nativeID="nickname-label">닉네임</Text>
              <TextInput
                ref={input}
                accessibilityLabel={Platform.OS === 'web' ? undefined : '닉네임'}
                aria-labelledby={Platform.OS === 'web' ? 'nickname-label' : undefined}
                aria-describedby="nickname-help"
                aria-invalid={Boolean(fieldError)}
                accessibilityHint={fieldError ?? '닉네임 2~12자'}
                value={raw}
                onChangeText={update}
                placeholder="예: 숲길관찰자"
                placeholderTextColor={palette.hint}
                selectionColor={palette.accent}
                editable={!pending}
                autoFocus
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="done"
                submitBehavior="submit"
                blurOnSubmit={Platform.OS === 'web' ? false : undefined}
                onFocus={() => setFocused(true)}
                onBlur={() => { setFocused(false); validate(); }}
                onEndEditing={event => {
                  if (!saveAfterEditing.current) return;
                  saveAfterEditing.current = false;
                  const value = event.nativeEvent.text;
                  update(value);
                  if (!nicknameError(value)) onSave(value.trim().normalize('NFC'));
                  else setChecked(true);
                }}
                onSubmitEditing={() => {
                  if (composing.current) return;
                  validate();
                  if (raw === '' || !invalid) {
                    input.current?.blur();
                    Keyboard.dismiss();
                  }
                }}
                style={[styles.input, focused && styles.focus, fieldError && styles.invalid]}
              />
              <View style={styles.helper}>
                {fieldError && <CircleAlert size={14} color={palette.error} />}
                <Text nativeID="nickname-help" accessibilityLiveRegion="polite" style={[styles.hint, fieldError && styles.error]}>
                  {fieldError ?? '닉네임 2~12자'}
                </Text>
              </View>
            </View>
            <View style={[styles.actions, compact && styles.compactActions]}>
              {notice && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
              <Pressable accessibilityRole="button" accessibilityState={{ disabled, busy: pending }}
                disabled={disabled} style={[styles.start, disabled && styles.disabled]}
                onPress={() => {
                  if (composing.current) return;
                  if (Platform.OS !== 'web' && focused && input.current) {
                    saveAfterEditing.current = true;
                    input.current.blur();
                    return;
                  }
                  onSave(acceptedInput.trim().normalize('NFC'));
                }}>
                <Text style={[styles.startLabel, disabled && styles.disabledLabel]}>{pending ? '저장 중' : '시작하기'}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityState={{ disabled: pending }}
                disabled={pending} style={styles.signOut} onPress={onSignOut}>
                <Text style={styles.hint}>로그아웃</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  keyboardArea: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center' },
  content: { width: '100%', maxWidth: 430, paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 64 : 16, paddingBottom: 12 },
  brand: {
    height: 96, borderRadius: 18, borderWidth: 1, borderColor: palette.brandBorder,
    backgroundColor: palette.brand, overflow: 'hidden', justifyContent: 'center', paddingLeft: 17,
  },
  compactBrand: { height: 72 },
  contours: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '70%' },
  markerIcon: { position: 'absolute', left: '72.54%', top: '45.74%', marginLeft: -9, marginTop: -9 },
  title: { marginTop: 14, color: palette.text, fontSize: 28, fontWeight: '700', lineHeight: 36, letterSpacing: -0.55 },
  description: { marginTop: 6, color: palette.secondary, fontSize: 15, fontWeight: '500', lineHeight: 22 },
  field: { marginTop: 26 },
  compactField: { marginTop: 24 },
  label: { color: palette.text, fontSize: 14, fontWeight: '700', lineHeight: 26, marginBottom: 6 },
  input: {
    minHeight: 52, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 16, borderWidth: 1,
    borderColor: palette.border, backgroundColor: palette.field, color: palette.text,
    fontSize: 16, fontWeight: '500', lineHeight: 24,
    ...(Platform.OS === 'web' ? { outlineWidth: 0 } : {}),
  },
  focus: { borderColor: palette.accent, borderWidth: 2, paddingHorizontal: 14 },
  invalid: { borderColor: palette.error, borderWidth: 2, paddingHorizontal: 14 },
  helper: { minHeight: 28, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  hint: { color: palette.hint, fontSize: 13, lineHeight: 18, fontWeight: '500', flexShrink: 1 },
  error: { color: palette.error },
  actions: { marginTop: 90 },
  compactActions: { marginTop: 86 },
  notice: { color: palette.error, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  start: {
    minHeight: 48, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', backgroundColor: palette.accent,
  },
  disabled: { borderWidth: 1, borderColor: palette.disabledBorder, backgroundColor: palette.disabled },
  startLabel: { color: palette.onAccent, fontSize: 16, fontWeight: '700', lineHeight: 24 },
  disabledLabel: { color: palette.disabledText },
  signOut: { minHeight: 44, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 12 },
});
