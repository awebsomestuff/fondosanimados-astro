# Rework de Imágenes - Guía Definitiva

## Resumen del Problema

PageSpeed Insights reportaba que las imágenes eran demasiado grandes para móvil. Por ejemplo:
- Imagen mostrada: 651x366px
- Imagen servida: 1000x563px

## Solución Implementada (Probada en /attack-on-titan/)

### 1. Tipos de Imágenes

El sitio tiene dos tipos principales de imágenes:

| Tipo | Uso | Tamaño PC | Tamaño Móvil |
|------|-----|-----------|--------------|
| **Preview** | Reproductor de video | 1000px ancho | 651px ancho |
| **Galería** | Thumbnails de personajes | ~150px ancho | No necesitan versión móvil (ya son pequeñas) |

### 2. Tamaños por Tipo de Galería

Cada tipo de galería tiene dimensiones CSS diferentes:

| Tipo de Galería | Página ejemplo | Tamaño CSS PC | Tamaño CSS Móvil | ¿Necesita srcset? |
|-----------------|----------------|---------------|------------------|-------------------|
| **personaje6** | /attack-on-titan/ | ~120px | ~100px | NO (imágenes ~150px) |
| **personaje7** | /chainsaw-man/ | ~120px | ~100px | NO |
| **personaje8** | /anime/ | ~120px | ~100px | NO |
| **personaje-index** | /principal/ | ~150px | ~120px | NO |
| **personaje** | /dragon-ball/ | ~200px | ~150px | Evaluar caso a caso |
| **preview** | Todos | ~1000px | ~651px | SÍ (obligatorio) |

**Nota importante:** Las imágenes de galería actuales ya son pequeñas (~150px de ancho).
Si una imagen de galería es mayor a 300px, considerar crear versión móvil.

### 3. Tamaños Reales Medidos

Basado en el análisis de /attack-on-titan/:

| Elemento | Ancho real PC | Ancho real Móvil | Imagen actual |
|----------|---------------|------------------|---------------|
| Preview reproductor | 1000px | 651px | 1000px → necesita 651px móvil |
| Thumbnail galería | 150px | 150px | 150px → ya está bien |

### 4. Configuración de Compresión

```javascript
const QUALITY = 65;  // WebP quality - balance entre tamaño y calidad
```

**Resultados de compresión con quality 65:**
- Imágenes de preview: 76-85% reducción (ej: 216KB → 43KB)
- Imágenes de galería: 18-25% reducción (ej: 10KB → 8KB)

### 5. Generación de Imágenes Móviles

Solo las imágenes de **preview** necesitan versión móvil:

```javascript
// Crear versión móvil de preview
await sharp(inputPath)
  .resize(651, null, { withoutEnlargement: true })
  .webp({ quality: 65 })
  .toFile(mobileOutputPath);
```

**Nomenclatura:** `{nombre}-mobile.webp`
- Original: `attack-on-titan-1.webp`
- Móvil: `attack-on-titan-1-mobile.webp`

### 6. Configuración de srcset (CRÍTICO)

#### Para imágenes de Preview (reproductor):

```html
<img
  src="/uploads/2025/11/attack-on-titan-1.webp"
  srcset="/uploads/2025/11/attack-on-titan-1-mobile.webp 651w,
          /uploads/2025/11/attack-on-titan-1.webp 1000w"
  sizes="(max-width: 850px) 240px, 1000px"
  class="wv-preview-image"
  loading="lazy"
/>
```

#### Para imágenes de Galería:
**NO usar srcset** - las imágenes ya son pequeñas (150px), no necesitan versiones móviles.

### 7. El Valor de `sizes` - Por Qué 240px y No 651px

**IMPORTANTE:** El navegador calcula qué imagen descargar así:
```
tamaño_necesario = valor_sizes × DPR
```

PageSpeed usa Moto G Power con DPR ~2.75:

| sizes value | Cálculo | Imagen elegida |
|-------------|---------|----------------|
| `651px` | 651 × 2.75 = 1790px | 1000w (incorrecto) |
| `325px` | 325 × 2.75 = 894px | 1000w (incorrecto) |
| `240px` | 240 × 2.75 = 660px | 651w (correcto) |

**Regla:** `sizes` debe ser aproximadamente `tamaño_imagen_móvil / DPR_máximo`
- 651px / 2.75 ≈ 237px → usamos 240px

### 8. Scripts Creados

#### fix-attack-on-titan-final.js
Script completo que:
1. Comprime imágenes originales (PC) con quality 65
2. Genera versiones móviles de preview (651px)
3. Corrige srcset en el archivo .astro
4. Limpia archivos -mobile innecesarios de galería

**Método para evitar errores EBUSY en Windows:**
```javascript
async function compressImage(relativePath) {
  const tempPath = path.join(dir, `${base}-compressed${ext}`);

  // 1. Leer original a buffer
  const originalBuffer = await fs.readFile(inputPath);

  // 2. Comprimir a archivo temporal
  await sharp(originalBuffer)
    .webp({ quality: QUALITY })
    .toFile(tempPath);

  // 3. Si es más pequeño, sobrescribir
  if (newStats.size < originalStats.size) {
    const newBuffer = await fs.readFile(tempPath);
    await fs.writeFile(inputPath, newBuffer);
    await fs.unlink(tempPath);
  }
}
```

## Pasos para Aplicar a Otras Páginas

### Paso 1: Identificar imágenes de la página
```javascript
// Galería: imágenes pequeñas (thumbnails, ~150px)
// Preview: imágenes grandes (reproductor, ~1000px)
```

### Paso 2: Comprimir originales (PC)
- Aplicar quality 65 a todas las imágenes WebP
- Solo reemplazar si el archivo comprimido es más pequeño

### Paso 3: Crear versiones móviles (solo preview)
- Redimensionar a 651px de ancho
- Quality 65
- Nombrar como `{nombre}-mobile.webp`

### Paso 4: Actualizar HTML
**Para preview:**
```html
srcset="{mobile}.webp 651w, {original}.webp 1000w"
sizes="(max-width: 850px) 240px, 1000px"
```

**Para galería:**
- NO añadir srcset (imágenes ya pequeñas)
- Si ya tiene srcset incorrecto, REMOVERLO

### Paso 5: Verificar
1. Ejecutar PageSpeed en modo móvil
2. Verificar que no hay warnings de "imagen más grande de lo necesario"

## Galerías Especiales del Index

### elemento-index (Categorías del Index)

Galería de categorías principales. **Caso especial: PC necesita MENOS tamaño que móvil.**

| Dispositivo | Tamaño mostrado | Imagen necesaria |
|-------------|-----------------|------------------|
| PC | 205x115 | 205px ancho |
| Móvil | 308x173 | 310px ancho |

**Solución: srcset inverso**
- Crear versión `-desktop.webp` de 205px
- Mantener original para móvil (310px)

```html
<img
  src="/uploads/2022/10/anime_parapc.webp"
  srcset="/uploads/2022/10/anime_parapc-desktop.webp 205w,
          /uploads/2022/10/anime_parapc.webp 310w"
  sizes="(max-width: 900px) 310px, 205px"
  loading="lazy"
/>
```

**Script de referencia:** `scripts/fix-index-gallery-v2.js`

### personaje-index (Personajes Destacados del Index)

Galería de personajes destacados. Mismo tamaño en PC y móvil.

| Dispositivo | Tamaño mostrado | Imagen necesaria |
|-------------|-----------------|------------------|
| PC | 110x196 | 110px ancho |
| Móvil | ~110px | 110px ancho |

**Solución:**
- Redimensionar imágenes originales a 110px de ancho
- NO necesita srcset (mismo tamaño en ambos)
- Comprimir con quality 65

**Script de referencia:** `scripts/fix-personaje-index.js`

### personaje7 (Galería de /chainsaw-man/)

Galería de personajes. **Caso especial: PC necesita MENOS tamaño que móvil.**

| Dispositivo | Tamaño mostrado | Imagen necesaria |
|-------------|-----------------|------------------|
| PC | 145x258 | 145px ancho |
| Móvil | 200x356 | 200px ancho (actual) |

**Solución: srcset inverso**
- Crear versión `-desktop.webp` de 145px
- Mantener original para móvil (200px)
- Comprimir ambas con quality 65

```html
<img
  src="/uploads/2023/07/denji.webp"
  srcset="/uploads/2023/07/denji-desktop.webp 145w,
          /uploads/2023/07/denji.webp 200w"
  sizes="(max-width: 900px) 200px, 145px"
  loading="lazy"
/>
```

### personaje8 (Galería de /anime/)

Galería de personajes más buscados. **Caso especial: PC necesita MENOS tamaño que móvil.**

| Dispositivo | Tamaño mostrado | Imagen necesaria |
|-------------|-----------------|------------------|
| PC | 125x223 | 125px ancho |
| Móvil | 200x356 | 200px ancho (actual) |

**Solución: srcset inverso**
- Crear versión `-desktop.webp` de 125px
- Mantener original para móvil (200px)
- Comprimir ambas con quality 65

```html
<img
  src="/uploads/2023/07/naruto.webp"
  srcset="/uploads/2023/07/naruto-desktop.webp 125w,
          /uploads/2023/07/naruto.webp 200w"
  sizes="(max-width: 900px) 200px, 125px"
  loading="lazy"
/>
```

**Script de referencia:** `scripts/fix-anime.js`

### elemento-categorias (Galería de /anime/ - Categorías Populares)

Galería de categorías principales con imágenes grandes. **Caso especial: PC necesita MENOS tamaño que móvil.**

| Dispositivo | Tamaño mostrado | Imagen necesaria |
|-------------|-----------------|------------------|
| PC | 356x200 | 356px ancho |
| Móvil | 437x253 | 437px ancho |

**Solución:**
- Convertir JPG a WebP si es necesario
- Crear versión `-desktop.webp` de 356px
- Mantener/crear original de 437px para móvil
- Comprimir ambas con quality 65

```html
<img
  src="/uploads/2022/01/vlcsnap-xxx.webp"
  srcset="/uploads/2022/01/vlcsnap-xxx-desktop.webp 356w,
          /uploads/2022/01/vlcsnap-xxx.webp 437w"
  sizes="(max-width: 900px) 437px, 356px"
  loading="lazy"
/>
```

**Script de referencia:** `scripts/fix-anime.js`

### elemento-categorias-b (Galería de /anime/ - Categorías Secundarias)

Galería de categorías secundarias. **Mismo patrón que elemento-index.**

| Dispositivo | Tamaño mostrado | Imagen necesaria |
|-------------|-----------------|------------------|
| PC | 205x115 | 205px ancho |
| Móvil | 310x173 | 310px ancho |

**Solución: srcset inverso (mismo que elemento-index)**
- Convertir JPG a WebP si es necesario
- Crear versión `-desktop.webp` de 205px
- Mantener/crear original de 310px para móvil
- Comprimir ambas con quality 65

```html
<img
  src="/uploads/2022/02/vlcsnap-xxx.webp"
  srcset="/uploads/2022/02/vlcsnap-xxx-desktop.webp 205w,
          /uploads/2022/02/vlcsnap-xxx.webp 310w"
  sizes="(max-width: 900px) 310px, 205px"
  loading="lazy"
/>
```

**Script de referencia:** `scripts/fix-anime.js`

## Estado Actual del Progreso (Última actualización: 23 Enero 2026)

### ✅ COMPLETADAS
| Página | Tipo galería | Notas |
|--------|--------------|-------|
| /attack-on-titan/ | personaje6 + preview | Primera página de prueba. 78% ahorro. |
| / (index) | elemento-index + personaje-index + preview | Srcset inverso para elemento-index. |
| /chainsaw-man/ | personaje7 + preview | Srcset inverso para personaje7. Fix power.webp compartida. |
| /anime/ | personaje8 + elemento-categorias + elemento-categorias-b + preview | **117 imágenes**, ~2.9MB ahorrados. Nuevos patrones establecidos. |

### ⏳ PENDIENTES
| Página | Tipo galería | Prioridad |
|--------|--------------|-----------|
| /dragon-ball/ | personaje | Alta - Probar nuevo tipo de galería |
| /abstracto/ | solo preview | Media - Solo preview, más simple |
| ~640 páginas restantes | Varios | Baja - Aplicar en masa cuando patrones confirmados |

### 🎯 PRÓXIMA SESIÓN
1. **Verificar PageSpeed** de /anime/ para confirmar optimizaciones
2. **Optimizar /dragon-ball/** - nuevo tipo de galería (personaje)
3. Una vez confirmados todos los patrones, crear script masivo para las ~640 páginas restantes
4. **Asociar dominio** a Cloudflare Pages (pendiente hasta terminar optimizaciones)

### Scripts disponibles
- `fix-attack-on-titan-final.js` - Modelo para personaje6 + preview
- `fix-chainsaw-man.js` - Modelo para personaje7 + preview (srcset inverso)
- `fix-index-gallery-v2.js` - Modelo para elemento-index (srcset inverso)
- `fix-personaje-index.js` - Modelo para personaje-index (sin srcset)
- `fix-anime.js` - **Modelo completo** para personaje8 + elemento-categorias + elemento-categorias-b + preview

## Páginas de Prueba (Referencia Histórica)

## Estadísticas de /attack-on-titan/

- **Imágenes procesadas:** 46 (12 galería + 34 preview)
- **Antes:** 5.43 MB
- **Después:** 1.18 MB
- **Ahorro:** 4.25 MB (78.4%)

## Archivos de Referencia

- `scripts/fix-attack-on-titan-final.js` - Script completo funcional
- `scripts/fix-attack-on-titan-images.js` - Genera móviles
- `scripts/fix-attack-on-titan-v2.js` - Comprime originales
- `scripts/add-srcset-to-pages.js` - Añade srcset al HTML (necesita actualizar valores)
- `scripts/optimize-test-images.js` - Script original (valores incorrectos)

## Errores Comunes y Soluciones

### Error: srcset con valores incorrectos
```html
<!-- MAL: 240w > 200w, navegador siempre elige 200w -->
srcset="mobile.webp 240w, original.webp 200w"

<!-- BIEN: valores reflejan tamaños reales -->
srcset="mobile.webp 651w, original.webp 1000w"
```

### Error: sizes con 100vw
```html
<!-- MAL: 100vw hace que navegador pida imagen enorme -->
sizes="(max-width: 850px) 100vw, 1000px"

<!-- BIEN: valor específico considerando DPR -->
sizes="(max-width: 850px) 240px, 1000px"
```

### Error: EBUSY al comprimir en Windows
- No usar `fs.unlink()` + `fs.rename()` directamente
- Leer a buffer, escribir nuevo contenido con `fs.writeFile()`

### Error: Crear móviles para imágenes pequeñas
- Si la imagen original es ≤200px, NO crear versión móvil
- El resize con `withoutEnlargement: true` no agranda, pero tampoco reduce significativamente

### Error: Imágenes compartidas entre galerías con diferentes tamaños
**Problema:** Una misma imagen se usa en múltiples galerías con requisitos de tamaño diferentes.

**Ejemplo real:** `power.webp` se usaba en:
- **personaje-index** (index): necesita 110px
- **personaje7** (chainsaw-man): necesita 200px

El script `fix-personaje-index.js` redimensionó el original a 110px, rompiendo chainsaw-man.

**Solución:**
- NUNCA modificar imágenes originales si se usan en múltiples lugares
- Crear versiones con sufijos específicos:
  - `power.webp` (200px) - original para personaje7
  - `power-small.webp` (110px) - versión para personaje-index
  - `power-desktop.webp` (145px) - versión desktop para personaje7
- Actualizar HTML para usar la versión correcta en cada galería

**Regla:** Antes de redimensionar una imagen, verificar si se usa en otras páginas/galerías con diferentes requisitos de tamaño.
