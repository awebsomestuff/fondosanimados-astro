/**
 * Script para corregir imágenes elemento-categorias-b
 *
 * Patrón: elemento-categorias-b (srcset inverso)
 * - PC: 205px
 * - Móvil: 310px
 * - Sufijo: -desktop.webp
 * - srcset: "{img}-desktop.webp 205w, {img}.webp 310w"
 * - sizes: "(max-width: 900px) 310px, 205px"
 *
 * Páginas afectadas: /disney/ (las únicas que quedan sin srcset)
 * /anime/ y /superheroes/ ya fueron corregidas
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

// Solo /disney/ tiene elemento-categorias-b sin srcset
const PAGES_TO_PROCESS = [
  'disney/index.astro'
];

let stats = {
  imagesFound: 0,
  imagesProcessed: 0,
  desktopCreated: 0,
  htmlChanges: 0,
  errors: []
};

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

// Extraer imágenes de elemento-categorias-b SIN srcset
function extractImagesWithoutSrcset(html) {
  const images = [];

  // Buscar bloques elemento-categorias-b específicamente
  const blockRegex = /<div class="elemento-categorias-b">[\s\S]*?<\/div>/g;
  let blockMatch;

  while ((blockMatch = blockRegex.exec(html)) !== null) {
    const block = blockMatch[0];

    // Buscar imágenes SIN srcset dentro del bloque
    const imgRegex = /<img[^>]*src="([^"]+)"[^>]*>/g;
    let imgMatch;

    while ((imgMatch = imgRegex.exec(block)) !== null) {
      const imgTag = imgMatch[0];
      const src = imgMatch[1];

      // Solo procesar si NO tiene srcset
      if (!imgTag.includes('srcset=') && src.startsWith('/uploads/')) {
        images.push({
          fullMatch: imgTag,
          src: src,
          relativePath: src.replace('/uploads/', '')
        });
      }
    }
  }

  return images;
}

// Crear versiones WebP (310px móvil y 205px desktop)
async function processImage(relativePath) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);

  if (!await fileExists(inputPath)) {
    return { error: `No existe: ${relativePath}` };
  }

  const dir = path.dirname(inputPath);
  const ext = path.extname(relativePath);
  const base = path.basename(relativePath, ext);

  const isWebp = ext.toLowerCase() === '.webp';
  const webpPath = path.join(dir, `${base}.webp`);
  const desktopPath = path.join(dir, `${base}-desktop.webp`);

  try {
    const originalBuffer = await fs.readFile(inputPath);
    const originalSize = originalBuffer.length;

    // Si es jpg/png, crear versión webp (310px para móvil)
    if (!isWebp) {
      await sharp(originalBuffer)
        .resize(310, null, { withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(webpPath);
    }

    // Crear versión desktop (205px)
    if (!await fileExists(desktopPath)) {
      const sourceBuffer = isWebp ? originalBuffer : await fs.readFile(webpPath);
      await sharp(sourceBuffer)
        .resize(205, null, { withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(desktopPath);

      const desktopStats = await fs.stat(desktopPath);
      const webpStats = await fs.stat(webpPath);

      return {
        created: true,
        originalSize,
        webpSize: webpStats.size,
        desktopSize: desktopStats.size,
        wasJpg: !isWebp
      };
    } else {
      return { created: false, reason: 'Desktop ya existe' };
    }
  } catch (error) {
    return { error: error.message };
  }
}

// Actualizar HTML
function updateHtmlWithSrcset(html, images) {
  let updatedHtml = html;
  let changes = 0;

  for (const img of images) {
    const dir = path.dirname(img.relativePath);
    const ext = path.extname(img.relativePath);
    const base = path.basename(img.relativePath, ext);

    const newSrc = `/uploads/${dir}/${base}.webp`;
    const srcset = `/uploads/${dir}/${base}-desktop.webp 205w, /uploads/${dir}/${base}.webp 310w`;
    const sizes = '(max-width: 900px) 310px, 205px';

    const escapedMatch = img.fullMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    let newTag = img.fullMatch;

    // Reemplazar src si era jpg/png
    if (ext.toLowerCase() !== '.webp') {
      newTag = newTag.replace(img.src, newSrc);
    }

    // Añadir srcset y sizes
    if (newTag.endsWith('/>')) {
      newTag = newTag.slice(0, -2) + ` srcset="${srcset}" sizes="${sizes}" />`;
    } else if (newTag.endsWith('>')) {
      newTag = newTag.slice(0, -1) + ` srcset="${srcset}" sizes="${sizes}">`;
    }

    const regex = new RegExp(escapedMatch, 'g');
    const before = updatedHtml;
    updatedHtml = updatedHtml.replace(regex, newTag);

    if (before !== updatedHtml) {
      changes++;
    }
  }

  return { html: updatedHtml, changes };
}

async function processPage(pageRelativePath) {
  const astroFile = path.join(PAGES_DIR, pageRelativePath);

  if (!await fileExists(astroFile)) {
    console.log(`  ✗ ${pageRelativePath}: No existe`);
    return;
  }

  console.log(`\n📄 ${pageRelativePath}`);
  console.log('-'.repeat(50));

  const html = await fs.readFile(astroFile, 'utf-8');
  const images = extractImagesWithoutSrcset(html);

  if (images.length === 0) {
    console.log('  ✓ Todas las imágenes ya tienen srcset');
    return;
  }

  console.log(`  Encontradas ${images.length} imágenes sin srcset`);
  stats.imagesFound += images.length;

  let totalOriginal = 0;
  let totalNew = 0;

  for (const img of images) {
    const result = await processImage(img.relativePath);

    if (result.error) {
      stats.errors.push(`${img.relativePath}: ${result.error}`);
      console.log(`  ✗ ${path.basename(img.relativePath)}: ${result.error}`);
    } else if (result.created) {
      stats.desktopCreated++;
      stats.imagesProcessed++;
      totalOriginal += result.originalSize;
      totalNew += result.webpSize + result.desktopSize;
      console.log(`  ✓ ${path.basename(img.relativePath)}`);
      console.log(`    ${formatBytes(result.originalSize)} → ${formatBytes(result.webpSize)} + ${formatBytes(result.desktopSize)}`);
    } else {
      stats.imagesProcessed++;
      console.log(`  ○ ${path.basename(img.relativePath)}: ${result.reason}`);
    }
  }

  // Actualizar HTML
  const { html: updatedHtml, changes } = updateHtmlWithSrcset(html, images);

  if (changes > 0) {
    await fs.writeFile(astroFile, updatedHtml);
    stats.htmlChanges += changes;
    console.log(`  📝 HTML: ${changes} cambios`);
  }

  if (totalOriginal > 0) {
    console.log(`  💾 Ahorro: ${formatBytes(totalOriginal - totalNew)}`);
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('CORRECCIÓN DE IMÁGENES ELEMENTO-CATEGORIAS-B');
  console.log('='.repeat(70));
  console.log('\nPatrón: srcset inverso (205px PC, 310px móvil)');

  for (const page of PAGES_TO_PROCESS) {
    await processPage(page);
  }

  console.log('\n' + '='.repeat(70));
  console.log('RESUMEN');
  console.log('='.repeat(70));
  console.log(`Imágenes encontradas: ${stats.imagesFound}`);
  console.log(`Imágenes procesadas: ${stats.imagesProcessed}`);
  console.log(`Versiones desktop creadas: ${stats.desktopCreated}`);
  console.log(`Cambios en HTML: ${stats.htmlChanges}`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️ ERRORES (${stats.errors.length}):`);
    stats.errors.forEach(e => console.log(`  - ${e}`));
  }

  console.log('\n✅ Proceso completado');
}

main().catch(console.error);
