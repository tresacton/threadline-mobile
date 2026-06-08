import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
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

  // flex:1 only fills the viewport for the non-scroll case. Inside a ScrollView
  // it inflates the measured content height and leaves overscroll dead space, so
  // the scrolling column sizes to its content instead.
  const column = [
    styles.column,
    scroll ? null : styles.columnFill,
    padded && styles.padded,
    { paddingBottom: insets.bottom + Spacing.four },
    contentStyle,
  ];

  if (scroll) {
    return (
      <ScrollView
        style={[styles.flex, { backgroundColor: theme.background }]}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={column}>{children}</View>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <View style={column}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  column: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  columnFill: { flex: 1 },
  padded: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four },
});
