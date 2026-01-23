/**
 * Script de optimización de imágenes elemento-categorias para /disney/
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
const ASTRO_FILE = path.join(__dirname, '../src/pages/disney/index.astro');
const QUALITY = 65;

// Imágenes elemento-categorias identificadas en /disney/
const ELEMENTO_CATEGORIAS_IMAGES = [
  { original: '2022/04/vlcsnap-2022-04-16-14h28m41s528-450x253.jpg', name: 'toy-story' },
  { original: '2022/04/vlcsnap-2022-04-15-18h20m01s399-450x253.jpg', name: 'el-rey-leon' },
  { original: '2022/04/vlcsnap-2022-04-22-14h02m16s374-450x253-1-450x253.jpg', name: 'monstruos-sa' },
  { original: '2022/05/vlcsnap-2022-05-09-19h43m26s524-450x253-1-450x253.jpg', name: 'red' },
  { original: '2022/05/vlcsnap-2022-05-18-20h16m10s471-450x253-1-450x253.jpg', name: 'raya' },
  { original: '2022/07/Coco-08.png', name: 'coco' },
  { original: '2022/04/vlcsnap-2022-04-22-14h00m59s355-450x253-1-450x253.jpg', name: 'luca' },
  { original: '2022/04/vlcsnap-2022-04-22-14h01m59s507-450x253-1-450x253.jpg', name: 'rompe-ralph' },
  { original: '2022/04/vlcsnap-2022-04-16-14h28m44s641-450x253-1-450x253.jpg', name: 'inside-out' },
  { original: '2022/04/vlcsnap-2022-04-16-14h26m55s250-450x253.jpg', name: 'encanto' },
  { original: '2022/04/vlcsnap-2022-04-15-18h26m28s737-450x253.jpg', name: 'mickey-mouse' },
  { original: '2022/04/vlcsnap-2022-04-16-14h29m11s855-450x253-1-450x253.jpg', name: 'pato-donald' },
  { original: '2022/04/vlcsnap-2022-04-22-14h01m21s902-450x253-1-450x253.jpg', name: 'malefica' },
  { original: '2022/04/vlcsnap-2022-04-15-18h25m49s202-450x253.jpg', name: 'los-increibles' },
  { original: '2022/04/vlcsnap-2022-04-22-14h00m49s518-450x253-2-450x253.jpg', name: 'up' },
  { original: '2022/04/vlcsnap-2022-04-15-18h18m24s735-450x253.jpg', name: 'aladdin' },
  { original: '2022/04/vlcsnap-2022-04-16-14h27m33s003-450x253.jpg', name: 'ratatouille' },
  { original: '2022/04/vlcsnap-2022-04-16-14h27m57s921-450x253.jpg', name: 'nightmare' }
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

// Procesar imagen: crear versión móvil (437px) y desktop (356px) en WebP
async function processImage(imgData) {
  const inputPath = path.join(UPLOADS_DIR, imgData.original);

  if (!await fileExists(inputPath)) {
    return { path: imgData.original, error: 'No existe' };
  }

  const dir = path.dirname(inputPath);
  const ext = path.extname(imgData.original);
  const base = path.basename(imgData.original, ext);

  // Nombres de salida en WebP
  const webpName = `${base}.webp`;
  const desktopName = `${base}-desktop.webp`;
  const webpPath = path.join(dir, webpName);
  const desktopPath = path.join(dir, desktopName);

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
      original: imgData.original,
      webp: webpName,
      desktop: desktopName,
      originalSize,
      mobileSize: mobileStats.size,
      desktopSize: desktopStats.size,
      saved: originalSize - mobileStats.size - desktopStats.size
    };
  } catch (error) {
    return { path: imgData.original, error: error.message };
  }
}

// Actualizar HTML
async function updateHtml() {
  let html = await fs.readFile(ASTRO_FILE, 'utf-8');
  let changes = 0;

  for (const img of ELEMENTO_CATEGORIAS_IMAGES) {
    const dir = path.dirname(img.original);
    const ext = path.extname(img.original);
    const base = path.basename(img.original, ext);

    // Escapar caracteres especiales para regex
    const escapedOriginal = img.original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Buscar la imagen original (jpg/png) y reemplazar con webp + srcset
    const pattern = new RegExp(
      `<img([^>]*)src="/uploads/${escapedOriginal}"([^>]*)/>`,
      'g'
    );

    html = html.replace(pattern, (match, before, after) => {
      // Si ya tiene srcset, no modificar
      if (match.includes('srcset=')) return match;

      changes++;
      const srcset = `/uploads/${dir}/${base}-desktop.webp 356w, /uploads/${dir}/${base}.webp 437w`;
      const sizes = '(max-width: 900px) 437px, 356px';

      // Reconstruir el tag con webp y srcset
      return `<img${before}src="/uploads/${dir}/${base}.webp" srcset="${srcset}" sizes="${sizes}"${after}/>`;
    });
  }

  await fs.writeFile(ASTRO_FILE, html);
  return changes;
}

async function main() {
  console.log('='.repeat(70));
  console.log('OPTIMIZACIÓN DE IMÁGENES ELEMENTO-CATEGORIAS - /disney/');
  console.log('='.repeat(70));

  let totalOriginalSize = 0;
  let totalNewSize = 0;
  let errors = [];

  console.log('\n📸 1. PROCESANDO IMÁGENES (JPG/PNG → WebP)');
  console.log('-'.repeat(50));

  for (const img of ELEMENTO_CATEGORIAS_IMAGES) {
    const result = await processImage(img);

    if (result.error) {
      errors.push(`${img.original}: ${result.error}`);
      console.log(`  ✗ ${img.name}: ${result.error}`);
    } else {
      totalOriginalSize += result.originalSize;
      totalNewSize += result.mobileSize + result.desktopSize;
      console.log(`  ✓ ${img.name}`);
      console.log(`    Original: ${formatBytes(result.originalSize)} → Mobile: ${formatBytes(result.mobileSize)} + Desktop: ${formatBytes(result.desktopSize)}`);
    }
  }

  console.log('\n📝 2. ACTUALIZANDO HTML');
  console.log('-'.repeat(50));

  const htmlChanges = await updateHtml();
  console.log(`  ✓ ${htmlChanges} cambios realizados en index.astro`);

  console.log('\n' + '='.repeat(70));
  console.log('RESUMEN');
  console.log('='.repeat(70));
  console.log(`Total imágenes procesadas: ${ELEMENTO_CATEGORIAS_IMAGES.length}`);
  console.log(`Tamaño original total: ${formatBytes(totalOriginalSize)}`);
  console.log(`Tamaño nuevo total: ${formatBytes(totalNewSize)}`);
  console.log(`Espacio ahorrado: ${formatBytes(totalOriginalSize - totalNewSize)}`);
  console.log(`Cambios en HTML: ${htmlChanges}`);

  if (errors.length > 0) {
    console.log(`\n⚠️ ERRORES (${errors.length}):`);
    errors.forEach(e => console.log(`  - ${e}`));
  }

  console.log('\n✅ Proceso completado');
}

main().catch(console.error);
