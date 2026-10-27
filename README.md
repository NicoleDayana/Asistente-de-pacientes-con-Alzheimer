# Asistente de pacientes con Alzheimer

Modelamiento de un asistente para personas con Alzheimer y sus cuidadores:
un **brazalete** de apoyo y memoria con una interfaz accesible, y esta página web
que presenta el proyecto, muestra el modelo 3D del brazalete y permite probar un
prototipo interactivo de recordatorios.

> Sitio publicado: <https://nicoledayana.github.io/Asistente-de-pacientes-con-Alzheimer/>

## Qué incluye

| Sección | Contenido |
| --- | --- |
| Proyecto | Los tres apoyos del asistente: recordatorios, orientación segura y vínculo con el cuidador. |
| Brazalete 3D | Visor STL interactivo (arrastrar, zoom, rotación automática, vista de estructura) + descarga del modelo. |
| Prototipo | Pantalla simulada del asistente: reloj, siguiente recordatorio, botón de llamada, ubicación y repetición. |
| Rutina de hoy | Lista de recordatorios editable, persistida en `localStorage`. |
| Accesibilidad | Modo «letra grande» (125 %), foco visible, navegación con teclado, `prefers-reduced-motion`. |

## Estructura

```
index.html                     Página única (todas las secciones)
assets/css/styles.css          Estilos (sin frameworks, variables CSS)
assets/js/app.js               Reloj, recordatorios, modo letra grande, navegación
assets/js/viewer.js            Visor 3D del brazalete (Three.js + STLLoader)
assets/models/brazalete.stl    Modelo del brazalete (STL binario, 120 000 caras)
assets/vendor/three/           Three.js r169, STLLoader y OrbitControls servidos localmente
assets/img/                    Favicon y tarjeta social (SVG)
.nojekyll                      Evita el procesado Jekyll en GitHub Pages
.github/workflows/deploy-pages.yml  Despliegue automático a GitHub Pages
```

## Por qué funciona en GitHub Pages

- **Rutas relativas** (`./assets/...`): la página funciona tanto en
  `usuario.github.io/repositorio/` como abierta desde el sistema de archivos.
  No se usa ninguna ruta absoluta ni `localhost`.
- **Todo es estático**: no hay backend, ni proceso de build, ni variables de entorno.
- **Dependencias locales**: Three.js y sus *addons* se cargan desde
  `assets/vendor/three/` mediante un **import map**, así que no dependen de CDN.
- **`.nojekyll`** presente, para que GitHub Pages sirva las carpetas `assets/`
  tal cual.
- **Visor robusto**: si el navegador no tiene WebGL, se muestra un aviso con el
  enlace de descarga del STL en lugar de romper la página.

## Ejecutar en local

Cualquier servidor estático funciona (los módulos ES no se cargan con `file://`):

```bash
python3 -m http.server 8000
# luego abre http://localhost:8000
```

o

```bash
npx serve .
```

## Publicar en GitHub Pages

### Opción A · De la rama `main` (rama raíz)

1. Sube los cambios a `main`.
2. En GitHub: **Settings → Pages → Build and deployment**.
3. *Source*: **Deploy from a branch** · *Branch*: `main` · *Folder*: `/ (root)`.
4. Guarda y espera el primer despliegue (pestaña **Actions**).

### Opción B · GitHub Actions (incluida)

El flujo `.github/workflows/deploy-pages.yml` publica el sitio en cada push a `main`.
Para usarlo: **Settings → Pages → Source: GitHub Actions**.

> Usa una sola de las dos opciones: si Pages está configurado «from a branch»,
> desactiva el workflow (o al contrario) para evitar despliegues en conflicto.

## Accesibilidad

- Contraste AA, texto base de 17 px y tipografía escalable.
- Botón **Letra grande** en la cabecera (125 %), recordado en `localStorage`.
- Enlace «Saltar al contenido», foco visible y etiquetas ARIA en el visor y el diálogo.
- La rotación automática del modelo se desactiva con `prefers-reduced-motion`.

## Créditos

- Modelo 3D: `Modelo brazalete.stl` del proyecto original.
- [Three.js](https://threejs.org/) r169 — licencia MIT (`assets/vendor/three/LICENSE`).

Este prototipo es un ejercicio académico de modelamiento y **no sustituye** la
valoración de un profesional de la salud.
