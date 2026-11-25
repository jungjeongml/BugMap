import { useRef, useState } from 'react';
import { Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../theme/tokens';
import { openPolicyDocument, policyDocuments, type PolicyDocument } from './policyDocuments';

const messages = {
  pending: '문서 게시를 준비 중입니다.',
  failed: '문서를 열지 못했습니다. 잠시 후 다시 시도해 주세요.',
} as const;

async function openInBrowser(url: string) {
  if (Platform.OS !== 'web') {
    await Linking.openURL(url);
    return;
  }

  // React Native Web's Linking cannot report that the browser blocked a new tab.
  const tab = window.open('about:blank', '_blank');
  if (!tab) throw new Error('Browser blocked the new tab');

  try {
    tab.opener = null;
    tab.location.replace(url);
  } catch (error) {
    tab.close();
    throw error;
  }
}

export function PolicyLinks() {
  const [notice, setNotice] = useState<{ document: PolicyDocument; status: keyof typeof messages } | null>(null);
  const latestRequest = useRef(0);

  async function handlePress(document: PolicyDocument) {
    const request = ++latestRequest.current;
    const status = await openPolicyDocument(document, openInBrowser);
    if (request === latestRequest.current && status !== 'opened') {
      setNotice({ document, status });
    }
  }

  function dismiss() {
    setNotice(null);
  }

  return (
    <>
      <View style={styles.links}>
        {(['terms', 'privacy'] as const).map(document => (
          <Pressable
            key={document}
            accessibilityRole="link"
            accessibilityLabel={policyDocuments[document]}
            style={styles.linkTarget}
            onPress={() => handlePress(document)}
            onKeyDown={Platform.OS === 'web' ? event => {
              // A React Native Web Pressable with link semantics has no native Enter activation.
              if (event.nativeEvent.key === 'Enter' && !event.nativeEvent.repeat) {
                event.preventDefault();
                void handlePress(document);
              }
            } : undefined}
          >
            <Text style={styles.link}>{policyDocuments[document]}</Text>
          </Pressable>
        ))}
      </View>

      {notice && (
        <Modal
          animationType="fade"
          transparent
          visible
          accessibilityLabel={policyDocuments[notice.document]}
          onRequestClose={dismiss}
        >
          <View style={styles.scrim} accessibilityViewIsModal>
            <View style={styles.dialog}>
              <Text accessibilityRole="header" style={styles.title}>{policyDocuments[notice.document]}</Text>
              <Text style={styles.message}>{messages[notice.status]}</Text>
              <Pressable accessibilityRole="button" style={styles.dismiss} onPress={dismiss}>
                <Text style={styles.dismissLabel}>닫기</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  links: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 12 },
  linkTarget: { minWidth: 44, minHeight: 44, paddingHorizontal: 4, justifyContent: 'center', alignItems: 'center' },
  link: { fontSize: 11, lineHeight: 16, color: '#BACABF', textDecorationLine: 'underline' },
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17, 24, 39, 0.50)', padding: 24 },
  dialog: { width: '100%', maxWidth: 360, borderRadius: 20, backgroundColor: colors.surface, padding: 20 },
  title: { color: colors.text, fontSize: 18, lineHeight: 26, fontWeight: '700' },
  message: { color: colors.body, fontSize: 14, lineHeight: 21, marginTop: 8 },
  dismiss: { minHeight: 44, marginTop: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.primaryTint },
  dismissLabel: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});
