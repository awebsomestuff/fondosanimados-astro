/**
 * Script MASIVO de optimización de imágenes elemento-categorias
 *
 * Patrón: elemento-categorias (srcset inverso)
 * - PC: 356px
 * - Móvil: 437px
 * - Sufijo: -desktop.webp
 * - srcset: "{img}-desktop.webp 356w, {img}.webp 437w"
 * - sizes: "(max-width: 900px) 437px, 356px"
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

// Páginas con elemento-categorias (excluyendo las ya optimizadas)
const PAGES_TO_PROCESS = [
  'videojuegos/index.astro',
  'series-y-peliculas/index.astro',
  'superheroes/index.astro'
];

// Estadísticas globales
let totalImagesProcessed = 0;
let totalOriginalSize = 0;
let totalNewSize = 0;
let totalHtmlChanges = 0;
let errors = [];

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

// Extraer imágenes de elemento-categorias de un archivo .astro
async function extractElementoCategorias(astroFile) {
  const content = await fs.readFile(astroFile, 'utf-8');
  const images = [];

  // Buscar imágenes dentro de div.elemento-categorias (no elemento-categorias-b)
  // Patrón: <div class="elemento-categorias">...<img...src="..."...>
  const regex = /<div class="elemento-categorias">\s*\n?\s*<a[^>]*><img[^>]*src="([^"]+)"[^>]*>/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    const imgSrc = match[1];
    // Solo procesar si es jpg o png (no webp ya procesados)
    if (imgSrc.match(/\.(jpg|jpeg|png)$/i)) {
      images.push(imgSrc.replace('/uploads/', ''));
    }
  }

  return [...new Set(images)];
}

// Procesar imagen: crear versión móvil (437px) y desktop (356px) en WebP
async function processImage(relativePath) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);

  if (!await fileExists(inputPath)) {
    return { path: relativePath, error: 'No existe' };
  }

  const dir = path.dirname(inputPath);
  const ext = path.extname(relativePath);
  const base = path.basename(relativePath, ext);

  const webpPath = path.join(dir, `${base}.webp`);
  const desktopPath = path.join(dir, `${base}-desktop.webp`);

  // Si ya existe el webp, saltar
  if (await fileExists(webpPath) && await fileExists(desktopPath)) {
    return { path: relativePath, skipped: true, reason: 'Ya procesada' };
  }

  try {
    const originalBuffer = await fs.readFile(inputPath);
    const originalSize = originalBuffer.length;

    // 1. Crear versión móvil (437px) en WebP
    await sharp(originalBuffer)
      .resize(437, null, { withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(webpPath);

    const mobileStats = await fs.stat(webpPath);

    // 2. Crear versión desktop (356px) en WebP
    await sharp(originalBuffer)
      .resize(356, null, { withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(desktopPath);

    const desktopStats = await fs.stat(desktopPath);

    return {
      path: relativePath,
      originalSize,
      mobileSize: mobileStats.size,
      desktopSize: desktopStats.size
    };
  } catch (error) {
    return { path: relativePath, error: error.message };
  }
}

// Actualizar HTML de un archivo .astro
async function updateHtml(astroFile, images) {
  let html = await fs.readFile(astroFile, 'utf-8');
  let changes = 0;

  for (const img of images) {
    const dir = path.dirname(img);
    const ext = path.extname(img);
    const base = path.basename(img, ext);

    // Escapar caracteres especiales para regex
    const escapedPath = img.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Buscar la imagen original (jpg/png) y reemplazar con webp + srcset
    const pattern = new RegExp(
      `<img([^>]*)src="/uploads/${escapedPath}"([^>]*)/>`,
      'g'
    );

    html = html.replace(pattern, (match, before, after) => {
      // Si ya tiene srcset, no modificar
      if (match.includes('srcset=')) return match;

      changes++;
      const srcset = `/uploads/${dir}/${base}-desktop.webp 356w, /uploads/${dir}/${base}.webp 437w`;
      const sizes = '(max-width: 900px) 437px, 356px';

      return `<img${before}src="/uploads/${dir}/${base}.webp" srcset="${srcset}" sizes="${sizes}"${after}/>`;
    });
  }

  if (changes > 0) {
    await fs.writeFile(astroFile, html);
  }

  return changes;
}

async function processPage(pageRelativePath) {
  const astroFile = path.join(PAGES_DIR, pageRelativePath);

  if (!await fileExists(astroFile)) {
    return { page: pageRelativePath, error: 'No existe' };
  }

  console.log(`\n📄 Procesando: ${pageRelativePath}`);
  console.log('-'.repeat(50));

  // Extraer imágenes
  const images = await extractElementoCategorias(astroFile);

  if (images.length === 0) {
    console.log('  Sin imágenes elemento-categorias pendientes');
    return { page: pageRelativePath, images: 0 };
  }

  console.log(`  Encontradas ${images.length} imágenes`);

  let pageOriginalSize = 0;
  let pageNewSize = 0;
  let pageProcessed = 0;

  // Procesar cada imagen
  for (const img of images) {
    const result = await processImage(img);

    if (result.error) {
      errors.push(`${img}: ${result.error}`);
      console.log(`  ✗ ${path.basename(img)}: ${result.error}`);
    } else if (result.skipped) {
      console.log(`  ○ ${path.basename(img)}: ${result.reason}`);
    } else {
      pageOriginalSize += result.originalSize;
      pageNewSize += result.mobileSize + result.desktopSize;
      pageProcessed++;
      console.log(`  ✓ ${path.basename(img)}: ${formatBytes(result.originalSize)} → ${formatBytes(result.mobileSize + result.desktopSize)}`);
    }
  }

  // Actualizar HTML
  const htmlChanges = await updateHtml(astroFile, images);
  console.log(`  HTML: ${htmlChanges} cambios`);

  totalImagesProcessed += pageProcessed;
  totalOriginalSize += pageOriginalSize;
  totalNewSize += pageNewSize;
  totalHtmlChanges += htmlChanges;

  return {
    page: pageRelativePath,
    images: images.length,
    processed: pageProcessed,
    htmlChanges
  };
}

async function main() {
  console.log('='.repeat(70));
  console.log('OPTIMIZACIÓN MASIVA DE IMÁGENES ELEMENTO-CATEGORIAS');
  console.log('='.repeat(70));

  for (const page of PAGES_TO_PROCESS) {
    await processPage(page);
  }

  console.log('\n' + '='.repeat(70));
  console.log('RESUMEN FINAL');
  console.log('='.repeat(70));
  console.log(`Páginas procesadas: ${PAGES_TO_PROCESS.length}`);
  console.log(`Total imágenes procesadas: ${totalImagesProcessed}`);
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
