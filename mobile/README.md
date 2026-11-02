# Passaporte Esportivo — app mobile (Expo)

App Android (e iOS no futuro) com o mesmo visual do layout mobile do web (kit v05) e o mesmo backend na Vercel.

- **Stack:** Expo SDK 58, Expo Router, React Native 0.88, react-native-svg.
- **Backend:** API REST em `src/app/api/mobile/*` do web (token Bearer guardado no `expo-secure-store`).
- **Compartilhado com o web:** `../shared` — cores/tokens, schemas zod de login/cadastro e tipos da API.

## Desenvolvimento

```bash
cd mobile
npm install
npm start            # Expo Go / dev client (escaneie o QR code)
npm run web          # pré-visualização no navegador (só para conferir layout)
npm run typecheck
```

Por padrão o app usa a API de produção (`https://app-passaporte-futebol.vercel.app`). Para usar o web rodando
na sua máquina, crie `mobile/.env.local` com o IP da máquina na rede:

```
EXPO_PUBLIC_API_URL=http://192.168.0.10:3000
```

## Build do APK (EAS)

```bash
npx eas-cli login
npx eas-cli build -p android --profile preview   # gera um .apk instalável
```

Perfis em `eas.json`: `development` (dev client), `preview` (APK) e `production` (AAB para a Play Store).

## Estrutura

```
src/app/(auth)/     login, cadastro, recuperar-senha
src/app/(tabs)/     index (Home), mapa, passaporte, perfil
src/components/     Ticket, Stamp, StampCard, Button, TextField, Logo, TabBar…
src/lib/            api.ts, auth-context.tsx, token-storage.ts
src/generated/      SVGs do kit (gerados de ../public com `npm run gen:assets`)
```
