/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Garantir que as variáveis de ambiente sejam carregadas
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Configurar pdfjs-dist para funcionar corretamente no Next.js
    // Ignorar módulos do Node.js que não são necessários no browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
      fs: false,
      path: false,
      stream: false,
      crypto: false,
    }
    
    // Configurar alias para ignorar canvas
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    }
    
    // No servidor, substituir pdf-extractor por um stub
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@/lib/pdf-extractor': '@/lib/pdf-extractor-stub',
        'pdfjs-dist': false,
      }
      
      // Marcar como externo no servidor para evitar tentativa de bundling
      config.externals = config.externals || []
      if (Array.isArray(config.externals)) {
        config.externals.push('pdfjs-dist')
      } else {
        config.externals = [config.externals, 'pdfjs-dist']
      }
    }
    
    // Ignorar warnings sobre módulos opcionais do pdfjs-dist
    config.ignoreWarnings = [
      { module: /node_modules\/pdfjs-dist/ },
    ]
    
    return config
  },
}

module.exports = nextConfig

