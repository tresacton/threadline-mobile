# Threadline mobile

The iOS/Android (Expo / React Native) client for Threadline — at feature parity
with the web app, talking to the hardened Rails JSON API in `../threadline-web`.

## Stack

- **Expo SDK 56** (React Native 0.85), TypeScript, `expo-router` (file-based routes).
- **Auth:** short-lived access token + rotating refresh token, stored in the
  Keychain/Keystore (`expo-secure-store`) and gated at launch by Face ID / Touch ID
  (`expo-local-authentication`). Silent token refresh on 401 (`src/lib/auth`).
- **Data:** `@tanstack/react-query` over a typed `fetch` client (`src/lib/api`).

## Project layout

```
src/
  app/                 # expo-router routes
    (auth)/            # login, biometric lock
    (app)/             # authenticated stack
      (tabs)/          # Home, Memories, Companion (chat), More
      memory/[id]      # memory detail
      chat/[id]        # conversation (the chat turn endpoint)
      reconstruct/[id] enrich/[id] capture threads timeline
      notifications people places goals jobs settings devices exports
  components/ui/       # Button, TextField, Card, Screen, states
  constants/theme.ts   # design tokens (light/dark)
  lib/
    api/               # client, typed endpoints, types, base-URL config
    auth/              # sessionStore (rotation), storage, biometrics, AuthContext
```

## Run it (test on your iPhone or iPad with Expo Go)

1. **Start the Rails API** in `../threadline-web` so the phone can reach it:
   ```bash
   cd ../threadline-web
   bin/rails server -b 0.0.0.0 -p 3000
   ```
   Binding to `0.0.0.0` (not just localhost) lets your phone connect over Wi‑Fi.

2. **Start the mobile dev server** (same machine, same Wi‑Fi as the phone):
   ```bash
   cd ../threadline-mobile
   npx expo start
   ```

3. On your iPhone/iPad, install **Expo Go** from the App Store, then **scan the QR
   code** shown in the terminal (or the Camera app will offer to open it).

The app auto-points at the Rails server on the **same machine** as the Expo dev
server (it derives the LAN IP from Expo and uses port 3000) — no IP editing needed
for the common case. To override (staging/prod), set `expo.extra.apiUrl` in
`app.json`.

> Phone can’t reach the API? Make sure the phone and computer are on the same
> Wi‑Fi, Rails is bound to `0.0.0.0:3000`, and any firewall allows port 3000.

## Checks

```bash
npx tsc --noEmit                 # types
npx expo lint                    # lint
npx expo export --platform ios   # full bundle (compiles every route)
```

## Not yet built (by product decision)

- Two-way live voice calls.
- Subscriptions / paid plan purchase.
