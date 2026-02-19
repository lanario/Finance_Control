import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { StyleSheet } from 'react-native'

function TabBarIcon(props: { name: keyof typeof Ionicons.glyphMap; color: string }) {
  return <Ionicons size={24} style={{ marginBottom: -4 }} {...props} />
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#1e3a5f' },
        headerTintColor: '#fff',
        headerTitleStyle: styles.headerTitle,
        headerTitle: 'Infinity Lines',
        headerTitleAlign: 'left',
        tabBarStyle: { backgroundColor: '#1e3a5f' },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.6)',
        tabBarLabelStyle: { fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Início',
          tabBarLabel: 'Início',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="cartoes"
        options={{
          title: 'Cartões',
          tabBarLabel: 'Cartões',
          tabBarIcon: ({ color }) => <TabBarIcon name="card" color={color} />,
        }}
      />
      <Tabs.Screen
        name="despesas"
        options={{
          title: 'Despesas',
          tabBarLabel: 'Despesas',
          tabBarIcon: ({ color }) => <TabBarIcon name="receipt-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="gastos"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="receitas"
        options={{
          title: 'Receitas',
          tabBarLabel: 'Receitas',
          tabBarIcon: ({ color }) => <TabBarIcon name="cash" color={color} />,
        }}
      />
      <Tabs.Screen
        name="mais"
        options={{
          title: 'Mais',
          tabBarLabel: 'Mais',
          tabBarIcon: ({ color }) => <TabBarIcon name="ellipsis-horizontal" color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color }) => <TabBarIcon name="person" color={color} />,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  headerTitle: {
    fontWeight: '700',
    fontSize: 18,
    color: '#fff',
  },
})
