import { Stack } from 'expo-router'

export default function MaisLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1e3a5f' },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: '#1e3a5f' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Mais' }} />
      <Stack.Screen name="categorias" options={{ title: 'Categorias' }} />
      <Stack.Screen name="categoria-nova" options={{ title: 'Nova categoria' }} />
      <Stack.Screen name="categoria-editar" options={{ title: 'Editar categoria' }} />
      <Stack.Screen name="investimentos" options={{ title: 'Investimentos' }} />
      <Stack.Screen name="novo-investimento" options={{ title: 'Novo investimento' }} />
      <Stack.Screen name="editar-investimento" options={{ title: 'Editar investimento' }} />
      <Stack.Screen name="sonhos" options={{ title: 'Sonhos Infinity' }} />
      <Stack.Screen name="novo-sonho" options={{ title: 'Novo sonho' }} />
      <Stack.Screen name="deposito-sonho" options={{ title: 'Depósito no sonho' }} />
    </Stack>
  )
}
