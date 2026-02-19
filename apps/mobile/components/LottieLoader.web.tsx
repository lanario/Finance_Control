'use client'

import { View, StyleSheet, ActivityIndicator } from 'react-native'

/**
 * Loader para web: ActivityIndicator (evita lottie-react-native e @lottiefiles/dotlottie-react).
 */
export function LottieLoader() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#10b981" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
