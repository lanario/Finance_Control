import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Component, type ReactNode } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { theme } from '../lib/theme'

/** Rota inicial no native (Expo Go) para o Stack reconhecer a navegação a partir de /. */
export const unstable_settings = {
  initialRouteName: 'index',
}

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Algo deu errado</Text>
          <Text style={styles.errorText}>{this.state.error.message}</Text>
          <Text style={styles.errorHint}>
            Abra o Console (F12 → Console) para mais detalhes.
          </Text>
        </View>
      )
    }
    return this.props.children
  }
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.background }}>
      <ErrorBoundary>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.background, flex: 1 },
          }}
        />
      </ErrorBoundary>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: theme.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorHint: {
    fontSize: 12,
    color: theme.textMuted,
  },
})
