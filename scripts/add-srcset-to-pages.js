/**
 * Script para añadir srcset a las imágenes de las páginas de prueba
 * Transforma las etiquetas <img> para usar versiones móviles con srcset
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAGES_DIR = path.join(__dirname, '../src/pages');

// Páginas de prueba
const TEST_PAGES = [
  'attack-on-titan/index.astro',  // personaje6
  'chainsaw-man/index.astro',     // personaje7
  'anime/index.astro',            // personaje8
  'principal/index.astro',        // personaje-index
  'dragon-ball/index.astro',      // personaje
  'abstracto/index.astro'         // solo preview
];

// Función para obtener el nombre del archivo móvil
function getMobileFilename(src) {
  const ext = path.extname(src);
  const base = src.slice(0, -ext.length);
  return `${base}-mobile${ext}`;
}

// Función para transformar una imagen a srcset
function transformImageToSrcset(imgTag, type) {
  // Extraer el src actual
  const srcMatch = imgTag.match(/src="([^"]+)"/);
  if (!srcMatch) return imgTag;

  const originalSrc = srcMatch[1];

  // Verificar que es una imagen webp de uploads
  if (!originalSrc.includes('/uploads/') || !originalSrc.endsWith('.webp')) {
    return imgTag;
  }

  const mobileSrc = getMobileFilename(originalSrc);

  // Determinar los tamaños según el tipo
  let sizes, srcsetValue;

  if (type === 'preview') {
    // Preview de reproductor: 1080px PC, 640px móvil
    srcsetValue = `${mobileSrc} 640w, ${originalSrc} 1080w`;
    sizes = '(max-width: 850px) 100vw, 1080px';
  } else {
    // Galerías de personajes: 200px PC, 120px móvil
    srcsetValue = `${mobileSrc} 120w, ${originalSrc} 200w`;
    sizes = '(max-width: 850px) 120px, 200px';
  }

  // Verificar si ya tiene srcset
  if (imgTag.includes('srcset=')) {
    return imgTag;
  }

  // Añadir srcset y sizes antes del cierre de la etiqueta
  // Buscar la posición del cierre (puede ser /> o >)
  let newImgTag = imgTag;

  if (imgTag.includes('/>')) {
    newImgTag = imgTag.replace('/>', ` srcset="${srcsetValue}" sizes="${sizes}" />`);
  } else if (imgTag.endsWith('>')) {
    newImgTag = imgTag.slice(0, -1) + ` srcset="${srcsetValue}" sizes="${sizes}">`;
  }

  return newImgTag;
}

// Función para procesar un archivo
async function processFile(filePath) {
  console.log(`\nProcesando: ${filePath}`);

  let content = await fs.readFile(filePath, 'utf-8');
  let changes = 0;

  // 1. Transformar imágenes de preview (.wv-preview-image)
  const previewRegex = /<img[^>]*class="wv-preview-image"[^>]*>/g;
  content = content.replace(previewRegex, (match) => {
    const transformed = transformImageToSrcset(match, 'preview');
    if (transformed !== match) {
      changes++;
      console.log(`  ✓ Preview: ${match.match(/src="([^"]+)"/)?.[1]}`);
    }
    return transformed;
  });

  // 2. Transformar imágenes de galería (dentro de .personaje*, etc.)
  // Buscar imágenes que están en contexto de galería (tienen class con personaje o alignnone)
  const galleryRegex = /<img[^>]*(?:class="[^"]*(?:alignnone|wp-image)[^"]*")[^>]*>/g;
  content = content.replace(galleryRegex, (match) => {
    // No transformar si ya es preview
    if (match.includes('wv-preview-image')) return match;

    const transformed = transformImageToSrcset(match, 'gallery');
    if (transformed !== match) {
      changes++;
      console.log(`  ✓ Gallery: ${match.match(/src="([^"]+)"/)?.[1]}`);
    }
    return transformed;
  });

  // 3. Transformar imágenes con class aligncenter (banners de categorías)
  const bannerRegex = /<img[^>]*class="[^"]*aligncenter[^"]*"[^>]*>/g;
  content = content.replace(bannerRegex, (match) => {
    // No transformar si ya tiene srcset
    if (match.includes('srcset=')) return match;

    const transformed = transformImageToSrcset(match, 'gallery');
    if (transformed !== match) {
      changes++;
      console.log(`  ✓ Banner: ${match.match(/src="([^"]+)"/)?.[1]}`);
    }
    return transformed;
  });

  if (changes > 0) {
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`  Total cambios: ${changes}`);
  } else {
    console.log(`  Sin cambios necesarios`);
  }

  return changes;
}

// Función principal
async function main() {
  console.log('='.repeat(60));
  console.log('Añadiendo srcset a páginas de prueba');
  console.log('='.repeat(60));

  let totalChanges = 0;

  for (const pagePath of TEST_PAGES) {
    const fullPath = path.join(PAGES_DIR, pagePath);
    try {
      const changes = await processFile(fullPath);
      totalChanges += changes;
    } catch (error) {
      console.error(`Error procesando ${pagePath}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`RESUMEN: ${totalChanges} imágenes transformadas`);
  console.log('='.repeat(60));
}

main().catch(console.error);
