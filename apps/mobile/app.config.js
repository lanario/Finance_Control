const dotenv = require('dotenv')
dotenv.config()

/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => ({
  ...config,
  // Scheme obrigatório para deep link e reconhecimento de rotas no native (Expo Go)
  scheme: config.scheme ?? 'infinitylines',
  extra: {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_SUPABASE_PESSOAL_URL: process.env.EXPO_PUBLIC_SUPABASE_PESSOAL_URL,
    EXPO_PUBLIC_SUPABASE_PESSOAL_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_PESSOAL_ANON_KEY,
    EXPO_PUBLIC_SUPABASE_EMPRESARIAL_URL: process.env.EXPO_PUBLIC_SUPABASE_EMPRESARIAL_URL,
    EXPO_PUBLIC_SUPABASE_EMPRESARIAL_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_EMPRESARIAL_ANON_KEY,
  },
})
