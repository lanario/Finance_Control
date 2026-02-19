import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { StyleSheet } from 'react-native'

function TabBarIcon(props: { name: keyof typeof Ionicons.glyphMap; color: string }) {
  return <Ionicons size={24} style={{ marginBottom: -4 }} {...props} />
}

/**
 * Layout de abas do módulo Empresarial (Fase 4).
 */
export default function TabsEmpresarialLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#1e3a5f' },
        headerTintColor: '#fff',
        headerTitleStyle: styles.headerTitle,
        headerTitle: 'Infinity Lines – Empresarial',
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
          title: 'Dashboard',
          tabBarLabel: 'Início',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="clientes"
        options={{
          title: 'Clientes',
          tabBarLabel: 'Clientes',
          tabBarIcon: ({ color }) => <TabBarIcon name="people" color={color} />,
        }}
      />
      <Tabs.Screen
        name="vendas"
        options={{
          title: 'Vendas',
          tabBarLabel: 'Vendas',
          tabBarIcon: ({ color }) => <TabBarIcon name="cart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="contas"
        options={{
          title: 'Contas',
          tabBarLabel: 'Contas',
          tabBarIcon: ({ color }) => <TabBarIcon name="wallet" color={color} />,
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
