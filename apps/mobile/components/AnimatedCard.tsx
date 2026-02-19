'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { Animated, StyleSheet, Platform, type StyleProp, type ViewStyle } from 'react-native'

const useNativeDriver = Platform.OS !== 'web'

interface AnimatedCardProps {
  children: ReactNode
  /** Índice para stagger (delay = index * 80ms) */
  index?: number
  style?: StyleProp<ViewStyle>
}

/**
 * Card com animação de entrada em sequência (Animated API nativo).
 */
export function AnimatedCard({ children, index = 0, style }: AnimatedCardProps) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(16)).current
  const scale = useRef(new Animated.Value(0.96)).current

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 350,
          useNativeDriver,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 350,
          useNativeDriver,
        }),
      ]).start()
    }, index * 80)
    return () => clearTimeout(timer)
  }, [opacity, translateY, scale, index])

  return (
    <Animated.View
      style={[
        styles.card,
        style,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      {children}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
})
