'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { Animated, Platform } from 'react-native'

const useNativeDriver = Platform.OS !== 'web'

interface AnimatedFadeInProps {
  children: ReactNode
  /** Atraso em ms para efeito stagger */
  delay?: number
  /** Deslocamento vertical inicial (entrada de baixo) */
  fromY?: number
  /** Duração da animação em ms */
  duration?: number
}

/**
 * Envelope que anima a entrada do conteúdo com fade e translateY (Animated API nativo).
 * Evita Moti/Reanimated para prevenir mismatch de Worklets.
 */
export function AnimatedFadeIn({
  children,
  delay = 0,
  fromY = 24,
  duration = 400,
}: AnimatedFadeInProps) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(fromY)).current

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          useNativeDriver,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          useNativeDriver,
        }),
      ]).start()
    }, delay)
    return () => clearTimeout(timer)
  }, [opacity, translateY, duration, delay, fromY])

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  )
}
