/**
 * Layout da área de autenticação empresarial.
 * Força tema escuro (NeonGrid) em toda a viewport para evitar que
 * o body/globals do empresarial sobrescrevam com fundo claro.
 */
export default function AuthEmpresarialLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="min-h-screen w-full"
      style={{
        backgroundColor: '#0d0d0d',
        color: '#e5e5e5',
      }}
    >
      {children}
    </div>
  )
}
