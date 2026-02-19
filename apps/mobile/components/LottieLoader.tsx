'use client'

import { useState } from 'react'
import { View, StyleSheet, Dimensions, ActivityIndicator } from 'react-native'
import LottieView from 'lottie-react-native'

const { width } = Dimensions.get('window')
const SIZE = Math.min(width * 0.4, 160)

/**
 * Loader animado com Lottie (React Native). Fallback para ActivityIndicator
 * se o JSON falhar ou não existir.
 */
export function LottieLoader() {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <LottieView
        source={require('../assets/animations/loader.json')}
        autoPlay
        loop
        style={styles.lottie}
        onAnimationFailure={() => setFailed(true)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: SIZE,
    height: SIZE,
  },
})
