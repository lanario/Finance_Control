import { Stack } from 'expo-router'

export default function VendasLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1e3a5f' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
      }}
    />
  )
}
