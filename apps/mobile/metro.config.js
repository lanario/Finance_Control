const { getDefaultConfig } = require('expo/metro-config')

/**
 * Metro config para o app mobile.
 * Usar o default do Expo garante require.context e compatibilidade com Expo Router no native (Expo Go).
 */
const config = getDefaultConfig(__dirname)
module.exports = config
