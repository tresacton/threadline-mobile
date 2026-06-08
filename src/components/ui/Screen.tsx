import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  contentStyle?: ViewStyle;
}

/** Standard screen container: themed background, safe-area bottom inset, an
 *  optional keyboard-aware scroll, and a centered max-width column for tablets. */
export function Screen({ children, scroll = false, padded = true, contentStyle }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const inner = (
    <View
      style={[
        styles.column,
        padded && styles.padded,
        { paddingBottom: insets.bottom + Spacing.four },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  if (scroll) {
    return (
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return <View style={[styles.flex, { backgroundColor: theme.background }]}>{inner}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  padded: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four },
});
