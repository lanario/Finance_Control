'use client'

import { type ReactNode } from 'react'
import { Platform } from 'react-native'
import * as Animatable from 'react-native-animatable'

const useNativeDriver = Platform.OS !== 'web'

interface AnimatedListItemProps {
  children: ReactNode
  /** Índice para delay de entrada (animatable usa duration + delay) */
  index?: number
}

/**
 * Item de lista com animação de entrada fadeInUp (react-native-animatable).
 */
export function AnimatedListItem({ children, index = 0 }: AnimatedListItemProps) {
  return (
    <Animatable.View
      animation="fadeInUp"
      duration={400}
      delay={index * 50}
      useNativeDriver={useNativeDriver}
    >
      {children}
    </Animatable.View>
  )
}
