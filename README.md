# Jobboard Multitenant

Monorepo Turborepo pour une plateforme de job board multi-tenant.

## Structure

- `apps/api`: API [NestJS](https://nestjs.com/) — expose les routes REST, dont l'authentification (voir [apps/api/README.md](apps/api/README.md))
- `apps/front`: application [Vue 3](https://vuejs.org/) (Vite, Pinia, Tailwind)
- `packages/contracts`: contrats [oRPC](https://orpc.unnoq.com/) partagés (schémas `zod`), ex. `jobContract.ts`
- `packages/eslint-config`: configurations `eslint` partagées
- `packages/typescript-config`: `tsconfig.json`s partagés (mode `strict`, `isolatedModules`, `NodeNext`)

Chaque package/app est en [TypeScript](https://www.typescriptlang.org/).

## Prérequis

- Node.js >= 18
- pnpm 11
- Une base PostgreSQL (utilisée par `apps/api` via Prisma)

## Installation

```sh
pnpm install
```

Au premier `pnpm install`, pnpm peut demander d'approuver des build scripts natifs (`prisma`, `@prisma/engines`, `argon2`) nécessaires à l'API — ils sont déjà autorisés dans `pnpm-workspace.yaml`.

### Configuration de l'API

`apps/api` nécessite un fichier `.env` (voir `apps/api/env.example`) avec au minimum :

```
DATABASE_URL=postgresql://user:password@localhost:5432/jobboard_db
JWT_SECRET=...        # 32+ caractères
JWT_REFRESH_SECRET=...
ENCRYPTION_KEY=...    # 64 caractères hex
COOKIE_SECRET=...
```

Puis appliquer les migrations Prisma :

```sh
pnpm --filter api migrate:dev
```

## Développement

Avec [turbo](https://turborepo.dev) global (recommandé) :

```sh
turbo dev
```

Sans turbo global :

```sh
pnpm exec turbo dev
```

Pour ne lancer qu'une app :

```sh
turbo dev --filter=api
turbo dev --filter=front
```

## Build

```sh
turbo build
```

## Lint / types

```sh
pnpm lint
pnpm check-types
```

## Authentification

Le module d'authentification de `apps/api` (login/register, refresh token, 2FA TOTP + backup codes, sessions actives, logs d'activité) a été porté depuis le projet `auth-system-refresh-2fa`. Il est actuellement **mono-tenant** : le scoping par tenant n'a pas encore été ajouté aux modèles `User` / `RefreshToken` / etc. Voir [apps/api/README.md](apps/api/README.md) pour le détail des modules et des variables d'environnement.
