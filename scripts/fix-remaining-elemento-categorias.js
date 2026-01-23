/**
 * Script para corregir imágenes JPG/PNG restantes en elemento-categorias
 *
 * Estas imágenes no fueron procesadas por el script anterior porque
 * el regex no detectaba todas las variantes de HTML.
 *
 * Patrón: elemento-categorias (srcset inverso)
 * - PC: 356px
 * - Móvil: 437px
 * - Sufijo: -desktop.webp
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '../public/uploads');
const PAGES_DIR = path.join(__dirname, '../src/pages');
const QUALITY = 65;

// Imágenes JPG pendientes identificadas manualmente
const PENDING_IMAGES = [
  // /videojuegos/
  { page: 'videojuegos/index.astro', original: '2022/02/vlcsnap-2022-02-14-12h57m24s078-450x253-1-450x253.jpg' },
  { page: 'videojuegos/index.astro', original: '2022/01/devil-may-cry-5-450x247.jpg' },
  // /series-y-peliculas/
  { page: 'series-y-peliculas/index.astro', original: '2022/01/vlcsnap-2022-01-14-07h21m55s215-450x253.jpg' },
  { page: 'series-y-peliculas/index.astro', original: '2022/01/vlcsnap-2022-01-25-11h48m59s286-450x253.jpg' },
  // /superheroes/ - elemento-categorias-b (estas son 300x169, usamos otro patrón)
  { page: 'superheroes/index.astro', original: '2022/01/vlcsnap-2022-01-19-11h47m38s901-450x253-1-300x169.jpg', type: 'categorias-b' },
  { page: 'superheroes/index.astro', original: '2022/05/vlcsnap-2022-05-06-13h33m28s144-450x253-1-300x169.jpg', type: 'categorias-b' },
  { page: 'superheroes/index.astro', original: '2022/05/vlcsnap-2022-05-03-14h30m35s728-450x253-2-300x169.jpg', type: 'categorias-b' },
  { page: 'superheroes/index.astro', original: '2022/01/vlcsnap-2022-01-19-11h45m30s514-450x253-1-300x169.jpg', type: 'categorias-b' },
  // /superheroes/ - elemento-categorias normal
  { page: 'superheroes/index.astro', original: '2022/05/vlcsnap-2022-05-03-12h11m52s475-450x253-1-450x253.jpg' }
];

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Procesar imagen: crear versiones WebP
async function processImage(imgData) {
  const inputPath = path.join(UPLOADS_DIR, imgData.original);

  if (!await fileExists(inputPath)) {
    return { path: imgData.original, error: 'No existe' };
  }

  const dir = path.dirname(inputPath);
  const ext = path.extname(imgData.original);
  const base = path.basename(imgData.original, ext);

  // Determinar tamaños según el tipo
  const isCategoriasB = imgData.type === 'categorias-b';
  const mobileWidth = isCategoriasB ? 310 : 437;
  const desktopWidth = isCategoriasB ? 205 : 356;

  // Nombres de salida
  const webpPath = path.join(dir, `${base}.webp`);
  const desktopPath = path.join(dir, `${base}-desktop.webp`);

  try {
    const originalBuffer = await fs.readFile(inputPath);
    const originalSize = originalBuffer.length;

    // 1. Crear versión móvil en WebP
    await sharp(originalBuffer)
      .resize(mobileWidth, null, { withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(webpPath);

    const mobileStats = await fs.stat(webpPath);

    // 2. Crear versión desktop en WebP
    await sharp(originalBuffer)
      .resize(desktopWidth, null, { withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(desktopPath);

    const desktopStats = await fs.stat(desktopPath);

    return {
      original: imgData.original,
      webp: `${base}.webp`,
      desktop: `${base}-desktop.webp`,
      originalSize,
      mobileSize: mobileStats.size,
      desktopSize: desktopStats.size,
      type: imgData.type || 'categorias'
    };
  } catch (error) {
    return { path: imgData.original, error: error.message };
  }
}

// Actualizar HTML de una página
async function updatePageHtml(pagePath, images) {
  const astroFile = path.join(PAGES_DIR, pagePath);
  let html = await fs.readFile(astroFile, 'utf-8');
  let changes = 0;

  for (const img of images) {
    const dir = path.dirname(img.original);
    const ext = path.extname(img.original);
    const base = path.basename(img.original, ext);

    // Escapar caracteres especiales para regex
    const escapedOriginal = img.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Determinar srcset según tipo
    const isCategoriasB = img.type === 'categorias-b';
    let srcset, sizes;

    if (isCategoriasB) {
      srcset = `/uploads/${dir}/${base}-desktop.webp 205w, /uploads/${dir}/${base}.webp 310w`;
      sizes = '(max-width: 900px) 310px, 205px';
    } else {
      srcset = `/uploads/${dir}/${base}-desktop.webp 356w, /uploads/${dir}/${base}.webp 437w`;
      sizes = '(max-width: 900px) 437px, 356px';
    }

    // Buscar y reemplazar la imagen (varios patrones posibles)
    const patterns = [
      // Con <p> wrapper
      new RegExp(
        `<img([^>]*)src="/uploads/${escapedOriginal}"([^>]*)/>`,
        'g'
      ),
      // Sin <p> wrapper
      new RegExp(
        `<img([^>]*)src="/uploads/${escapedOriginal}"([^>]*)>`,
        'g'
      )
    ];

    for (const pattern of patterns) {
      html = html.replace(pattern, (match, before, after) => {
        // Si ya tiene srcset, no modificar
        if (match.includes('srcset=')) return match;

        changes++;
        // Reemplazar extensión jpg/png por webp y añadir srcset
        const newSrc = `/uploads/${dir}/${base}.webp`;

        // Reconstruir el tag
        let newTag = `<img${before}src="${newSrc}" srcset="${srcset}" sizes="${sizes}"${after}`;
        if (!newTag.endsWith('/>') && !newTag.endsWith('>')) {
          newTag += '/>';
        } else if (!newTag.endsWith('/>')) {
          newTag = newTag.slice(0, -1) + '/>';
        }
        return newTag;
      });
    }
  }

  if (changes > 0) {
    await fs.writeFile(astroFile, html);
  }

  return changes;
}

async function main() {
  console.log('='.repeat(70));
  console.log('CORRECCIÓN DE IMÁGENES JPG RESTANTES EN ELEMENTO-CATEGORIAS');
  console.log('='.repeat(70));

  let totalOriginalSize = 0;
  let totalNewSize = 0;
  let errors = [];
  let processed = [];

  console.log('\n📸 1. PROCESANDO IMÁGENES (JPG → WebP)');
  console.log('-'.repeat(50));

  for (const img of PENDING_IMAGES) {
    const result = await processImage(img);

    if (result.error) {
      errors.push(`${img.original}: ${result.error}`);
      console.log(`  ✗ ${path.basename(img.original)}: ${result.error}`);
    } else {
      totalOriginalSize += result.originalSize;
      totalNewSize += result.mobileSize + result.desktopSize;
      processed.push({ ...img, ...result });
      console.log(`  ✓ ${path.basename(img.original)} (${result.type})`);
      console.log(`    ${formatBytes(result.originalSize)} → ${formatBytes(result.mobileSize)} + ${formatBytes(result.desktopSize)}`);
    }
  }

  console.log('\n📝 2. ACTUALIZANDO HTML');
  console.log('-'.repeat(50));

  // Agrupar por página
  const pageGroups = {};
  for (const img of processed) {
    if (!pageGroups[img.page]) {
      pageGroups[img.page] = [];
    }
    pageGroups[img.page].push(img);
  }

  let totalHtmlChanges = 0;
  for (const [page, images] of Object.entries(pageGroups)) {
    const changes = await updatePageHtml(page, images);
    totalHtmlChanges += changes;
    console.log(`  ✓ ${page}: ${changes} cambios`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('RESUMEN');
  console.log('='.repeat(70));
  console.log(`Total imágenes procesadas: ${processed.length}`);
  console.log(`Tamaño original: ${formatBytes(totalOriginalSize)}`);
  console.log(`Tamaño nuevo: ${formatBytes(totalNewSize)}`);
  console.log(`Espacio ahorrado: ${formatBytes(totalOriginalSize - totalNewSize)}`);
  console.log(`Cambios en HTML: ${totalHtmlChanges}`);

  if (errors.length > 0) {
    console.log(`\n⚠️ ERRORES (${errors.length}):`);
    errors.forEach(e => console.log(`  - ${e}`));
  }

  console.log('\n✅ Proceso completado');
}

main().catch(console.error);
