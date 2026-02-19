import { Redirect } from 'expo-router'

/**
 * Redirect da rota antiga "gastos" para "despesas".
 * Evita 500 no bundle quando algo ainda referencia /gastos (cache, link, etc.).
 */
export default function GastosRedirect() {
  return <Redirect href="/(tabs)/despesas" />
}
