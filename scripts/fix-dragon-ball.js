/**
 * Script de optimización de imágenes para /dragon-ball/
 *
 * Tipos de imágenes:
 * 1. Preview (41 imágenes): 1000px PC, 651px móvil
 * 2. Personaje (18 imágenes): srcset inverso - 105px PC, 200px móvil (comprimir)
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const PUBLIC_DIR = 'C:/Users/abelo/Desktop/MIGRACIONES-2026/FONDOSANIMADOS/astro-site/public';
const HTML_FILE = 'C:/Users/abelo/Desktop/MIGRACIONES-2026/FONDOSANIMADOS/astro-site/src/pages/dragon-ball/index.astro';
const QUALITY = 65;

// ============================================
// IMÁGENES DE GALERÍA PERSONAJE (18)
// ============================================
const PERSONAJE_IMAGES = [
  '/uploads/2023/07/goku.webp',
  '/uploads/2023/07/vegeta.webp',
  '/uploads/2023/07/Vegito.webp',
  '/uploads/2023/07/gogeta.webp',
  '/uploads/2023/07/Android-18.webp',
  '/uploads/2023/07/broly.webp',
  '/uploads/2023/07/bulma.webp',
  '/uploads/2023/07/buu.webp',
  '/uploads/2023/07/cell.webp',
  '/uploads/2023/07/freezer.webp',
  '/uploads/2023/07/gohan.webp',
  '/uploads/2023/07/goten-2.webp',
  '/uploads/2023/07/krillin.webp',
  '/uploads/2023/07/piccolo.webp',
  '/uploads/2023/07/tien.webp',
  '/uploads/2023/07/trunks-11.webp',
  '/uploads/2023/07/yamcha.webp',
  '/uploads/2023/07/naruto.webp',
];

// ============================================
// IMÁGENES PREVIEW (41)
// ============================================
const PREVIEW_IMAGES = [
  '/uploads/2025/11/vegeta-11.webp',
  '/uploads/2025/11/Goku-Aesthetic_wallpaper-1920x1080-1.webp',
  '/uploads/2025/11/goku-house-wallpaper-estatico-1920x1080-1.webp',
  '/uploads/2025/11/kame-house-dragon-ball-wallpaper-estatico-1920x1080-1.webp',
  '/uploads/2025/11/super-saiyan-goku-db-legends-wallpaper-estatico-1920x1080-1.webp',
  '/uploads/2025/11/gohan-ssj2-wallpaper-estatico-1920x1080-1.webp',
  '/uploads/2025/11/ssjb-kaioken-goku-wallpaper-estatico-1920x1080-1.webp',
  '/uploads/2025/11/dragon-ball-z-tournament-estatico-1920x1080-1.webp',
  '/uploads/2025/11/android-18-fight-wallpaper-estatico-1920x1080-1.webp',
  '/uploads/2025/11/Kame-House-4K_wallpaper-1920x1080-1.webp',
  '/uploads/2025/11/A-lomos-de-Shenlong_wallpaper-1920x1080-1.webp',
  '/uploads/2025/11/Shenlong-and-the-Dragon-Balls_wallpaper-1920x1080-1.webp',
  '/uploads/2025/11/Shenlong-with-Lights_wallpaper-1920x1080-1.webp',
  '/uploads/2025/11/Battle_wallpaper-1920x1080-1.webp',
  '/uploads/2025/11/Windows-Genkidama_wallpaper-1920x1080-1.webp',
  '/uploads/2025/11/The-Family_wallpaper-1920x1080-1.webp',
  '/uploads/2025/11/Assault-on-Red-Ribbon-Armybase_wallpaper-1920x1080-1.webp',
  '/uploads/2025/11/dragon-ball-franchise-wallpaper_resultado-1920x1080-1.webp',
  '/uploads/2025/11/Chica-no-se_wallpaper-1920x1080-1.webp',
  '/uploads/2025/11/Full-Power-Jiren_wallpaper-1920x1080-1.webp',
  '/uploads/2025/11/Black-Frieza_wallpaper-1920x1080-1.webp',
  '/uploads/2025/11/Goku-Holding-Ethereum_wallpaper-1920x1080-1.webp',
  '/uploads/2025/11/Celula_wallpaper-1920x1080-1.webp',
  '/uploads/2025/11/Gogeta-SSJ4_wallpaper-1920x1080-1.webp',
  '/uploads/2025/11/goku-7.webp',
  '/uploads/2025/11/goku-10.webp',
  '/uploads/2025/11/goku-13.webp',
  '/uploads/2025/11/goku-16.webp',
  '/uploads/2025/11/goku-17.webp',
  '/uploads/2025/11/vegeta-6.webp',
  '/uploads/2025/11/vegeta-7.webp',
  '/uploads/2025/11/vegeta-10.webp',
  '/uploads/2025/11/gogeta-2.webp',
  '/uploads/2025/11/gohan-1.webp',
  '/uploads/2025/11/broly-6.webp',
  '/uploads/2025/11/broly-9.webp',
  '/uploads/2025/11/broly-13.webp',
  '/uploads/2025/11/buu-2.webp',
  '/uploads/2025/11/freezer-1.webp',
  '/uploads/2025/11/goku-vegeta-1.webp',
  '/uploads/2025/11/goku-vegeta-2.webp',
];

let totalSavedBytes = 0;
let processedCount = 0;

// ============================================
// FUNCIONES DE PROCESAMIENTO
// ============================================

async function getFileSize(filePath) {
  try {
    const stats = await fs.promises.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

async function compressImage(imagePath, width = null) {
  const fullPath = path.join(PUBLIC_DIR, imagePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠️ No existe: ${imagePath}`);
    return null;
  }

  const sizeBefore = await getFileSize(fullPath);

  try {
    // Leer archivo en buffer primero
    const inputBuffer = await fs.promises.readFile(fullPath);
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();

    let pipeline = image;
    if (width && metadata.width > width) {
      pipeline = pipeline.resize(width, null, { withoutEnlargement: true });
    }

    const buffer = await pipeline.webp({ quality: QUALITY }).toBuffer();

    // Pequeña pausa para liberar el archivo
    await new Promise(r => setTimeout(r, 50));

    // Escribir directamente
    fs.writeFileSync(fullPath, buffer);

    const sizeAfter = buffer.length;
    const saved = sizeBefore - sizeAfter;
    totalSavedBytes += saved;

    console.log(`  ✓ ${path.basename(imagePath)}: ${(sizeBefore/1024).toFixed(1)}KB → ${(sizeAfter/1024).toFixed(1)}KB (${saved > 0 ? '-' : '+'}${Math.abs(saved/1024).toFixed(1)}KB)`);
    return true;
  } catch (err) {
    console.log(`  ❌ Error: ${imagePath} - ${err.message}`);
    return null;
  }
}

async function createResizedVersion(imagePath, suffix, width) {
  const fullPath = path.join(PUBLIC_DIR, imagePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠️ No existe: ${imagePath}`);
    return null;
  }

  const ext = path.extname(imagePath);
  const baseName = imagePath.slice(0, -ext.length);
  const newPath = `${baseName}${suffix}.webp`;
  const newFullPath = path.join(PUBLIC_DIR, newPath);

  // Si ya existe, solo comprimir
  if (fs.existsSync(newFullPath)) {
    try {
      const sizeBefore = await getFileSize(newFullPath);
      const inputBuffer = await fs.promises.readFile(newFullPath);
      const buffer = await sharp(inputBuffer).webp({ quality: QUALITY }).toBuffer();
      await new Promise(r => setTimeout(r, 50));
      fs.writeFileSync(newFullPath, buffer);
      const saved = sizeBefore - buffer.length;
      totalSavedBytes += saved;
      console.log(`  ✓ ${path.basename(newPath)} (existente): ${(sizeBefore/1024).toFixed(1)}KB → ${(buffer.length/1024).toFixed(1)}KB`);
      return newPath;
    } catch (err) {
      console.log(`  ❌ Error comprimiendo ${newPath}: ${err.message}`);
      return null;
    }
  }

  try {
    const inputBuffer = await fs.promises.readFile(fullPath);
    const buffer = await sharp(inputBuffer)
      .resize(width, null, { withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer();

    await new Promise(r => setTimeout(r, 50));
    fs.writeFileSync(newFullPath, buffer);
    console.log(`  ✓ Creado ${path.basename(newPath)}: ${(buffer.length/1024).toFixed(1)}KB`);
    return newPath;
  } catch (err) {
    console.log(`  ❌ Error creando ${newPath}: ${err.message}`);
    return null;
  }
}

// ============================================
// PROCESAMIENTO PREVIEW (patrón estándar)
// ============================================
async function processPreviewImages() {
  console.log('\n📸 PROCESANDO PREVIEW IMAGES (41)...\n');
  console.log('Patrón: 1000px PC, 651px móvil\n');

  for (const imgPath of PREVIEW_IMAGES) {
    processedCount++;
    console.log(`[${processedCount}/${PREVIEW_IMAGES.length + PERSONAJE_IMAGES.length}] ${path.basename(imgPath)}`);

    // Comprimir original y redimensionar a 1000px para PC
    await compressImage(imgPath, 1000);

    // Crear versión móvil de 651px
    await createResizedVersion(imgPath, '-mobile', 651);
  }
}

// ============================================
// PROCESAMIENTO PERSONAJE (srcset inverso)
// ============================================
async function processPersonajeImages() {
  console.log('\n👤 PROCESANDO PERSONAJE IMAGES (18)...\n');
  console.log('Patrón srcset inverso: 105px PC (desktop), 200px móvil (original)\n');

  for (const imgPath of PERSONAJE_IMAGES) {
    processedCount++;
    console.log(`[${processedCount}/${PREVIEW_IMAGES.length + PERSONAJE_IMAGES.length}] ${path.basename(imgPath)}`);

    // Comprimir original (200px para móvil)
    await compressImage(imgPath);

    // Crear versión desktop de 105px
    await createResizedVersion(imgPath, '-desktop', 105);
  }
}

// ============================================
// ACTUALIZACIÓN HTML
// ============================================
async function updateHtml() {
  console.log('\n📝 ACTUALIZANDO HTML...\n');

  let html = await fs.promises.readFile(HTML_FILE, 'utf-8');
  let changes = 0;

  // Actualizar PREVIEW: srcset y sizes correctos
  for (const imgPath of PREVIEW_IMAGES) {
    const fileName = path.basename(imgPath, '.webp');
    const dirPath = path.dirname(imgPath);

    // Buscar patrón actual de preview (puede tener diferentes srcset)
    const previewRegex = new RegExp(
      `src="${imgPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"([^>]*?)srcset="[^"]*"([^>]*?)sizes="[^"]*"`,
      'g'
    );

    const newSrcset = `srcset="${dirPath}/${fileName}-mobile.webp 651w, ${imgPath} 1000w"`;
    const newSizes = `sizes="(max-width: 850px) 100vw, 1000px"`;

    if (html.includes(`src="${imgPath}"`)) {
      // Reemplazar srcset y sizes
      const oldHtml = html;
      html = html.replace(previewRegex, `src="${imgPath}"$1${newSrcset}$2${newSizes}`);
      if (html !== oldHtml) {
        changes++;
        console.log(`  ✓ Preview: ${fileName}`);
      }
    }
  }

  // Actualizar PERSONAJE: srcset inverso (105px desktop, 200px móvil)
  for (const imgPath of PERSONAJE_IMAGES) {
    const fileName = path.basename(imgPath, '.webp');
    const dirPath = path.dirname(imgPath);

    // Buscar cualquier srcset existente para esta imagen
    const personajeRegex = new RegExp(
      `(<a class="personaje"[^>]*>\\s*<img[^>]*?)src="${imgPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"([^>]*?)srcset="[^"]*"([^>]*?)sizes="[^"]*"`,
      'g'
    );

    const newSrcset = `srcset="${dirPath}/${fileName}-desktop.webp 105w, ${imgPath} 200w"`;
    const newSizes = `sizes="(max-width: 900px) 200px, 105px"`;

    const oldHtml = html;
    html = html.replace(personajeRegex, `$1src="${imgPath}"$2${newSrcset}$3${newSizes}`);
    if (html !== oldHtml) {
      changes++;
      console.log(`  ✓ Personaje: ${fileName}`);
    }
  }

  await fs.promises.writeFile(HTML_FILE, html);
  console.log(`\n  Total cambios HTML: ${changes}`);
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('='.repeat(60));
  console.log('🐉 OPTIMIZACIÓN DE IMÁGENES - /dragon-ball/');
  console.log('='.repeat(60));
  console.log(`\nTotal imágenes: ${PREVIEW_IMAGES.length + PERSONAJE_IMAGES.length}`);
  console.log(`- Preview: ${PREVIEW_IMAGES.length}`);
  console.log(`- Personaje: ${PERSONAJE_IMAGES.length}`);

  await processPreviewImages();
  await processPersonajeImages();
  await updateHtml();

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN');
  console.log('='.repeat(60));
  console.log(`Imágenes procesadas: ${processedCount}`);
  console.log(`Espacio ahorrado: ${(totalSavedBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log('='.repeat(60));
}

main().catch(console.error);
