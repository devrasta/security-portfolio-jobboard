# api

API [NestJS](https://nestjs.com/) du job board multi-tenant. Écoute sur le port `3002` par défaut.

## Modules

- `modules/auth`: register, login, refresh/logout de token, changement de mot de passe, 2FA (TOTP + QR code + backup codes)
- `modules/users`: profil utilisateur
- `modules/sessions`: liste et révocation des sessions actives (refresh tokens)
- `modules/activity`: journal d'activité (login, logout, 2FA, refresh...) avec géolocalisation IP
- `modules/security`: hashing (argon2), JWT, chiffrement (2FA secrets), guards (`JwtAuthGuard`), décorateurs (`@CurrentUser`)
- `modules/prisma`: accès base de données (PostgreSQL via `@prisma/adapter-pg`)

> Le module d'authentification a été porté depuis le projet `auth-system-refresh-2fa` et est actuellement **mono-tenant** : `User`, `RefreshToken`, `ActivityLog` et `TwoFactorSecret` ne sont pas encore scopés par tenant.

## Configuration

Copier `env.example` en `.env` et renseigner :

| Variable | Description |
|---|---|
| `DATABASE_URL` | Chaîne de connexion PostgreSQL |
| `JWT_SECRET` | Secret du access token (32+ caractères) |
| `JWT_REFRESH_SECRET` | Secret du refresh token (32+ caractères) |
| `JWT_EXPIRES_IN` | Durée de vie de l'access token (ex. `60s`) |
| `ENCRYPTION_KEY` | Clé AES-256 en hex (64 caractères) pour chiffrer les secrets 2FA |
| `COOKIE_SECRET` | Secret de signature des cookies |
| `CORS_ORIGIN` | Origine autorisée pour le frontend |
| `PORT` | Port d'écoute (défaut `3002`) |

Les variables sont validées au démarrage via un schéma `Joi` dans `app.module.ts`.

## Base de données

```bash
# générer le client Prisma
pnpm exec prisma generate

# appliquer les migrations en dev
pnpm run migrate:dev
```

## Installation

```bash
$ pnpm install
```

## Lancer l'app

```bash
# développement (watch)
$ pnpm run dev

# debug (watch)
$ pnpm run start:debug

# production
$ pnpm run start:prod
```

## Tests

```bash
# tests unitaires
$ pnpm run test

# tests e2e
$ pnpm run test:e2e

# couverture
$ pnpm run test:cov
```

> Deux suites de tests héritées du projet source échouent actuellement de façon connue et ne sont pas liées au portage : le mock de géolocalisation dans `activity.service.spec.ts`, et une erreur de parsing ESM sur `otplib` dans les specs de `two-factor.*`.
