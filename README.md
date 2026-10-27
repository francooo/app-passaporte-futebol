# Passaporte Esportivo

PWA para torcedores registrarem visitas e partidas em estádios e colecionarem carimbos.

- Funcionalidades: `docs/Engenharia-Reversa-Passaporte-do-Futebol.docx`
- Design (kit v05 "Ingresso de arquibancada"): `docs/documentacao-design-passaporte-esportivo.docx`
- Créditos de fotos e fontes de dados: `docs/photo-credits.md`, `docs/sources-and-data.md`

## Stack

Next.js 16 (App Router, Cache Components) · Tailwind CSS v4 · Neon Postgres + Drizzle · Auth.js · Vercel (deploy, Blob).

## Desenvolvimento

```bash
npm install
cp .env.example .env.local   # preencher as variáveis
npm run dev                  # http://localhost:3000
```

## Estrutura

```
src/app/(auth)/        login, cadastro, recuperar-senha
src/app/(app)/app/     home, mapa, passaporte, perfil (barra de 4 abas)
src/components/ui/     design system: Ticket, Stamp, StampCard, BottomNav, Button, TextField
public/icons, map      SVGs do kit v05
```

## Tokens de cor

| Token | HEX | Uso |
|---|---|---|
| `estadio` | #123A32 | estrutura, logotipo, ícones, texto de ênfase |
| `ingresso` | #F7C928 | ação primária, seleção, destaque (nunca texto miúdo) |
| `marfim` | #FFF9E8 | fundos de papel e cartões |
| `tinta` | #172520 | texto corrido |

## Pendências de design

- Logotipo oficial em SVG (o wordmark atual é provisório em `src/components/ui/logo.tsx`).
- Foto de fundo de arquibancada do Login (só existe rasterizada no mockup).
- Foto do Pacaembu: sem licença de reutilização, não incluída.
