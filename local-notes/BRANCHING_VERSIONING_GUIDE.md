# Branching y Versionado (uso personal)

Guia practica para trabajar con `main` + `dev` sin desordenar releases.

## Modelo de ramas

- `main`: estable y publicado.
- `dev`: integracion de la siguiente version.
- `feat/*`: nuevas funcionalidades (rama corta desde `dev`).
- `fix/*`: correcciones de bug (rama corta desde `dev`).
- `docs/*`: cambios de documentacion (rama corta desde `dev`).
- `chore/*`: mantenimiento/configuracion sin cambio funcional (desde `dev`).
- `hotfix/*`: urgencias de produccion (desde `main`).

## Cuando usar cada prefijo

- `feat/*`: agregas funcionalidad nueva.
- `fix/*`: corriges un bug.
- `docs/*`: solo docs (README, Docs/, comentarios).
- `chore/*`: CI, scripts, dependencias, ajustes de tooling.
- `hotfix/*`: error urgente en version publicada.

## Flujo diario recomendado

1. Actualizar `dev`.
2. Crear rama corta desde `dev`.
3. Trabajar y abrir PR hacia `dev`.
4. Repetir hasta completar alcance de siguiente version.
5. Cuando `dev` este listo, crear rama intermedia `release/*` desde `dev`.
6. En `release/*`, quitar `local-notes/` antes del PR a `main`.
7. Abrir PR `release/* -> main` (no `dev -> main`).
8. En `main`, ejecutar release + publish npm.
9. Merge de `main -> dev` para mantener `dev` al dia (changelog/version/tag commit).

## Reglas de version

- No cambiar version en `feat/*`.
- No publicar npm desde `dev`.
- `release-it` + `npm publish` solo desde `main`.
- No volver a publicar una version ya existente en npm.
- Si `local-notes/` esta trackeada en `dev`, usar siempre rama `release/*` para excluirla de `main`.

## Comandos utiles

### Crear y usar `dev`

```bash
git checkout main
git pull
git checkout -b dev
git push -u origin dev
```

### Crear rama de trabajo desde `dev`

```bash
git checkout dev
git pull
git checkout -b feat/nombre-corto
```

### Cerrar release

```bash
# crear rama intermedia desde dev
git checkout dev
git pull
git checkout -b release/0.2.1

# excluir local-notes para main
git rm -r local-notes
git commit -m "chore(release): exclude local-notes from main"
git push -u origin release/0.2.1

# abrir PR release/0.2.1 -> main y mergear
git checkout main
git pull
npm run release -- --increment patch   # o minor
npm publish --access public
```

### Sincronizar `dev` despues de release

```bash
git checkout dev
git pull
git merge main
git push
```

## Errores comunes

- `npm version patch` falla por working tree sucio:
  - commit/stash/restore antes de versionar.
- `E403 cannot publish over previously published versions`:
  - subir version (patch/minor) y volver a publicar.
- `token expired or revoked`:
  - renovar token y actualizar `.npmrc`.
