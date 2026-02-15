# Release Checklist (uso personal)

Checklist rapido para no olvidar el flujo de versionado y publicacion.

## 1) Pre-check

```bash
git status --short
npm whoami
npm run build
npm test
```

Reglas:

- `git status` debe estar limpio antes de versionar.
- Si `npm whoami` falla, autenticar de nuevo.

## 2) Release en GitHub (tag + changelog)

Dry-run:

```bash
npm run release -- --dry-run --ci
```

Release real (elige uno):

```bash
# patch (ejemplo 0.2.0 -> 0.2.1)
npm run release -- --increment patch

# minor (ejemplo 0.2.0 -> 0.3.0)
npm run release -- --increment minor
```

Notas:

- `release-it` crea commit/tag/release en GitHub.
- En este repo, `release-it` NO publica en npm (`npm.publish=false`).

## 3) Publicar en npm (manual)

```bash
npm publish --access public
npm view @sebasgc0399/agents-md version
```

## 4) Si npm da errores de auth/token

```bash
npm logout
npm config delete //registry.npmjs.org/:_authToken
npm whoami
```

Luego configurar token nuevo:

```bash
npm config set //registry.npmjs.org/:_authToken=TU_TOKEN_NUEVO
npm whoami
```

## 5) Si npm dice "cannot publish over previously published versions"

Significa que esa version ya existe en npm.

Pasos:

```bash
git status --short
npm version patch
npm publish --access public
```

## 6) Comandos que uso seguido

```bash
# release minor
npm run release -- --increment minor

# release patch
npm run release -- --increment patch

# publicar npm
npm publish --access public
```

## 7) Recordatorios personales

- Nunca pegar tokens en commits/chats/logs.
- Si un token se expone, revocarlo de inmediato.
- `.env` no es leido automaticamente por `npm publish`.
- Guardar token en `.npmrc` o variable de entorno de la sesion.
