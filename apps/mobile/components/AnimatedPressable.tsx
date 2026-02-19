'use client'

import { useRef, type ReactNode } from 'react'
import { Pressable, Animated, Platform, type PressableProps } from 'react-native'

const useNativeDriver = Platform.OS !== 'web'

interface AnimatedPressableProps extends PressableProps {
  children: ReactNode
  /** Escala ao pressionar (default 0.98) */
  activeScale?: number
}

/**
 * Botão/área clicável com animação de escala ao toque (Animated API nativo).
 * Evita Reanimated para prevenir mismatch de Worklets.
 */
export function AnimatedPressableScale({
  children,
  activeScale = 0.98,
  onPressIn,
  onPressOut,
  style,
  ...rest
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current

  function handlePressIn(e: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) {
    Animated.spring(scale, {
      toValue: activeScale,
      useNativeDriver,
      damping: 15,
      stiffness: 400,
    }).start()
    onPressIn?.(e)
  }

  function handlePressOut(e: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver,
      damping: 15,
      stiffness: 400,
    }).start()
    onPressOut?.(e)
  }

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} style={style} {...rest}>
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
    </Pressable>
  )
}
