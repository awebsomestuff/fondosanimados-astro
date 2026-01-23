/**
 * Script para optimizar imágenes de /chainsaw-man/
 *
 * 1. Preview images: Corregir srcset y comprimir
 * 2. Galería personaje7: Crear versiones desktop (145px) y actualizar srcset
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

// Imágenes de preview (reproductor de video)
const PREVIEW_IMAGES = [
  '2025/11/denji-1.webp',
  '2025/11/power-3.webp',
  '2025/11/chainsaw-man-5.webp',
  '2025/11/denji-8.webp',
  '2025/11/power-6.webp',
  '2025/11/makima-6.webp',
  '2025/11/denji-10.webp',
  '2025/11/makima-7.webp',
  '2025/11/kobeni-5.webp',
  '2025/11/denji-5.webp',
  '2025/11/aki-8.webp',
  '2025/11/aki-9.webp',
  '2025/11/denji-4.webp',
  '2025/11/makima-2.webp',
  '2025/11/aki-12.webp',
  '2025/11/aki-13.webp',
  '2025/11/kobeni-9.webp',
  '2025/11/makima-13.webp',
  '2025/11/chainsaw-man-6.webp',
  '2025/11/makima-20.webp',
  '2025/11/makima-21.webp',
  '2025/11/chainsaw-man-7.webp',
  '2025/11/kishibe-4.webp'
];

// Imágenes de galería personaje7
// Según PageSpeed: PC=145x258, Móvil=200x356 (actual)
const PERSONAJE7_IMAGES = [
  '2023/07/denji.webp',
  '2023/07/power.webp',
  '2023/07/makima.webp',
  '2023/07/kishibe.webp',
  '2023/07/aki-hayawaka.webp',
  '2023/07/himeno.webp',
  '2023/07/kobeni.webp'
];

// Comprimir imagen usando buffer (evita EBUSY en Windows)
async function compressImage(relativePath) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const tempPath = path.join(dir, `${base}-temp-compress${ext}`);

  try {
    const originalStats = await fs.stat(inputPath);
    const originalBuffer = await fs.readFile(inputPath);

    await sharp(originalBuffer)
      .webp({ quality: QUALITY })
      .toFile(tempPath);

    const newStats = await fs.stat(tempPath);

    if (newStats.size < originalStats.size) {
      const newBuffer = await fs.readFile(tempPath);
      await fs.writeFile(inputPath, newBuffer);
      await fs.unlink(tempPath);

      return {
        file: relativePath,
        before: originalStats.size,
        after: newStats.size,
        saved: true
      };
    } else {
      await fs.unlink(tempPath);
      return {
        file: relativePath,
        before: originalStats.size,
        after: originalStats.size,
        saved: false,
        reason: 'Ya optimizado'
      };
    }
  } catch (error) {
    try { await fs.unlink(tempPath); } catch {}
    console.error(`Error comprimiendo ${relativePath}:`, error.message);
    return { file: relativePath, error: error.message };
  }
}

// Crear versión móvil de preview (651px)
async function createMobileVersion(relativePath) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const mobilePath = path.join(dir, `${base}-mobile${ext}`);

  try {
    const originalBuffer = await fs.readFile(inputPath);
    const metadata = await sharp(originalBuffer).metadata();

    if (metadata.width > 651) {
      await sharp(originalBuffer)
        .resize(651, null, { withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toFile(mobilePath);

      const mobileStats = await fs.stat(mobilePath);
      return {
        file: `${base}-mobile${ext}`,
        size: mobileStats.size,
        created: true
      };
    } else {
      return {
        file: relativePath,
        created: false,
        reason: `Original ya es ${metadata.width}px`
      };
    }
  } catch (error) {
    console.error(`Error creando móvil ${relativePath}:`, error.message);
    return { file: relativePath, error: error.message };
  }
}

// Crear versión desktop de personaje7 (145px)
async function createDesktopVersion(relativePath) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const desktopPath = path.join(dir, `${base}-desktop${ext}`);

  try {
    const originalBuffer = await fs.readFile(inputPath);
    const metadata = await sharp(originalBuffer).metadata();

    await sharp(originalBuffer)
      .resize(145, null, { withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(desktopPath);

    const desktopStats = await fs.stat(desktopPath);
    return {
      file: `${base}-desktop${ext}`,
      size: desktopStats.size,
      originalWidth: metadata.width,
      created: true
    };
  } catch (error) {
    console.error(`Error creando desktop ${relativePath}:`, error.message);
    return { file: relativePath, error: error.message };
  }
}

// Comprimir imagen de galería (solo compresión, no redimensionar)
async function compressGalleryImage(relativePath) {
  const inputPath = path.join(UPLOADS_DIR, relativePath);
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const tempPath = path.join(dir, `${base}-temp${ext}`);

  try {
    const originalStats = await fs.stat(inputPath);
    const originalBuffer = await fs.readFile(inputPath);

    await sharp(originalBuffer)
      .webp({ quality: QUALITY })
      .toFile(tempPath);

    const newStats = await fs.stat(tempPath);

    if (newStats.size < originalStats.size) {
      const newBuffer = await fs.readFile(tempPath);
      await fs.writeFile(inputPath, newBuffer);
      await fs.unlink(tempPath);

      return {
        file: relativePath,
        before: originalStats.size,
        after: newStats.size,
        saved: true
      };
    } else {
      await fs.unlink(tempPath);
      return {
        file: relativePath,
        before: originalStats.size,
        after: originalStats.size,
        saved: false,
        reason: 'Ya optimizado'
      };
    }
  } catch (error) {
    try { await fs.unlink(tempPath); } catch {}
    return { file: relativePath, error: error.message };
  }
}

// Actualizar srcset en chainsaw-man/index.astro
async function updatePageSrcset() {
  const pagePath = path.join(PAGES_DIR, 'chainsaw-man/index.astro');
  let content = await fs.readFile(pagePath, 'utf-8');
  let previewChanges = 0;
  let galleryChanges = 0;

  // 1. Corregir srcset de preview images
  // De: srcset="...-mobile.webp 640w, ....webp 1080w" sizes="(max-width: 850px) 100vw, 1080px"
  // A:  srcset="...-mobile.webp 651w, ....webp 1000w" sizes="(max-width: 850px) 240px, 1000px"
  for (const img of PREVIEW_IMAGES) {
    const base = img.replace('.webp', '');

    // Patrón para encontrar el srcset incorrecto
    const pattern = new RegExp(
      `(src="/uploads/${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.webp"[^>]*srcset="/uploads/${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-mobile\\.webp) 640w, (/uploads/${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.webp) 1080w" sizes="\\(max-width: 850px\\) 100vw, 1080px"`,
      'g'
    );

    content = content.replace(pattern, (match, part1, part2) => {
      previewChanges++;
      return `${part1} 651w, ${part2} 1000w" sizes="(max-width: 850px) 240px, 1000px"`;
    });
  }

  // 2. Corregir srcset de galería personaje7
  // De: srcset="...-mobile.webp 120w, ....webp 200w" sizes="(max-width: 850px) 120px, 200px"
  // A:  srcset="...-desktop.webp 145w, ....webp 200w" sizes="(max-width: 900px) 200px, 145px"
  for (const img of PERSONAJE7_IMAGES) {
    const imgPath = `/uploads/${img}`;
    const base = img.replace('.webp', '');
    const desktopPath = `/uploads/${base}-desktop.webp`;

    // Patrón para encontrar el srcset actual de personaje7
    const pattern = new RegExp(
      `(src="${imgPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*)srcset="/uploads/${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-mobile\\.webp 120w, ${imgPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} 200w" sizes="\\(max-width: 850px\\) 120px, 200px"`,
      'g'
    );

    content = content.replace(pattern, (match, before) => {
      galleryChanges++;
      return `${before}srcset="${desktopPath} 145w, ${imgPath} 200w" sizes="(max-width: 900px) 200px, 145px"`;
    });
  }

  if (previewChanges > 0 || galleryChanges > 0) {
    await fs.writeFile(pagePath, content, 'utf-8');
  }

  return { previewChanges, galleryChanges };
}

// Eliminar archivos -mobile innecesarios de galería
async function cleanupGalleryMobileFiles() {
  let cleaned = 0;
  for (const img of PERSONAJE7_IMAGES) {
    const base = img.replace('.webp', '');
    const mobilePath = path.join(UPLOADS_DIR, `${base}-mobile.webp`);

    try {
      await fs.access(mobilePath);
      await fs.unlink(mobilePath);
      cleaned++;
      console.log(`  ✓ Eliminado: ${base}-mobile.webp`);
    } catch {
      // No existe, no hacer nada
    }
  }
  return cleaned;
}

async function main() {
  console.log('='.repeat(60));
  console.log('OPTIMIZACIÓN DE IMÁGENES - /chainsaw-man/');
  console.log('='.repeat(60));

  let totalBefore = 0;
  let totalAfter = 0;
  let mobileCreated = 0;
  let desktopCreated = 0;

  // 1. Comprimir y crear móviles para preview
  console.log('\n--- 1. Preview images (compresión + móviles 651px) ---');
  for (const img of PREVIEW_IMAGES) {
    const compressResult = await compressImage(img);
    if (!compressResult.error) {
      totalBefore += compressResult.before;
      totalAfter += compressResult.after;
      if (compressResult.saved) {
        const savings = ((1 - compressResult.after / compressResult.before) * 100).toFixed(0);
        console.log(`✓ ${path.basename(img)}: ${(compressResult.before/1024).toFixed(1)}KB → ${(compressResult.after/1024).toFixed(1)}KB (-${savings}%)`);
      } else {
        console.log(`⏭ ${path.basename(img)}: ${compressResult.reason}`);
      }
    }

    const mobileResult = await createMobileVersion(img);
    if (mobileResult.created) {
      mobileCreated++;
    }
  }

  // 2. Comprimir y crear desktop para personaje7
  console.log('\n--- 2. Galería personaje7 (compresión + desktop 145px) ---');
  for (const img of PERSONAJE7_IMAGES) {
    // Comprimir original
    const compressResult = await compressGalleryImage(img);
    if (!compressResult.error && compressResult.saved) {
      const savings = ((1 - compressResult.after / compressResult.before) * 100).toFixed(0);
      console.log(`✓ ${path.basename(img)}: ${(compressResult.before/1024).toFixed(1)}KB → ${(compressResult.after/1024).toFixed(1)}KB (-${savings}%)`);
    } else if (!compressResult.error) {
      console.log(`⏭ ${path.basename(img)}: ${compressResult.reason || 'Ya optimizado'}`);
    }

    // Crear versión desktop
    const desktopResult = await createDesktopVersion(img);
    if (desktopResult.created) {
      desktopCreated++;
      console.log(`  + ${desktopResult.file}: ${(desktopResult.size/1024).toFixed(1)}KB`);
    }
  }

  // 3. Limpiar archivos -mobile innecesarios de galería
  console.log('\n--- 3. Limpiando archivos -mobile innecesarios de galería ---');
  const cleaned = await cleanupGalleryMobileFiles();
  console.log(`Archivos eliminados: ${cleaned}`);

  // 4. Actualizar srcset en HTML
  console.log('\n--- 4. Actualizando srcset en chainsaw-man/index.astro ---');
  const { previewChanges, galleryChanges } = await updatePageSrcset();
  console.log(`✓ Preview srcset corregidos: ${previewChanges}`);
  console.log(`✓ Galería srcset corregidos: ${galleryChanges}`);

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('RESUMEN');
  console.log('='.repeat(60));
  console.log(`Preview images: ${PREVIEW_IMAGES.length}`);
  console.log(`Versiones móviles creadas: ${mobileCreated}`);
  console.log(`Galería personaje7: ${PERSONAJE7_IMAGES.length}`);
  console.log(`Versiones desktop creadas: ${desktopCreated}`);
  console.log(`Antes: ${(totalBefore / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Después: ${(totalAfter / 1024 / 1024).toFixed(2)} MB`);
  const savings = totalBefore > 0 ? ((totalBefore - totalAfter) / 1024 / 1024).toFixed(2) : 0;
  console.log(`Ahorro en originales: ${savings} MB`);
  console.log('\nConfiguración srcset aplicada:');
  console.log('  Preview: srcset="{img}-mobile.webp 651w, {img}.webp 1000w"');
  console.log('           sizes="(max-width: 850px) 240px, 1000px"');
  console.log('  Galería: srcset="{img}-desktop.webp 145w, {img}.webp 200w"');
  console.log('           sizes="(max-width: 900px) 200px, 145px"');
}

main().catch(console.error);
