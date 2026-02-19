import { Stack } from 'expo-router'

export default function ReceitasLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1e3a5f' },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: '#1e3a5f' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Receitas' }} />
      <Stack.Screen name="nova" options={{ title: 'Nova receita' }} />
    </Stack>
  )
}
