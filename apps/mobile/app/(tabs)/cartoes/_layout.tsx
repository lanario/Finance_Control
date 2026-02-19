import { Stack } from 'expo-router'

export default function CartoesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1e3a5f' },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: '#1e3a5f' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Cartões' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalhe do cartão' }} />
      <Stack.Screen name="nova-compra" options={{ title: 'Nova compra' }} />
    </Stack>
  )
}
