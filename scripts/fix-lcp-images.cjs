/**
 * Script para optimizar LCP: quitar loading="lazy" y añadir fetchpriority="high"
 * a la primera imagen .wv-preview-image de cada página.
 */

const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '..', 'src', 'pages');
let modifiedCount = 0;
let skippedCount = 0;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Buscar la primera imagen con class="wv-preview-image"
  // Patrón: <img ... class="wv-preview-image" ... loading="lazy" ...>
  const imgRegex = /<img([^>]*class="wv-preview-image"[^>]*)>/;
  const match = content.match(imgRegex);

  if (!match) {
    return false; // No hay imagen wv-preview-image
  }

  const originalImg = match[0];
  let imgAttributes = match[1];

  // Verificar si ya tiene fetchpriority="high"
  if (imgAttributes.includes('fetchpriority="high"')) {
    return false; // Ya está optimizada
  }

  // Quitar loading="lazy" si existe
  imgAttributes = imgAttributes.replace(/\s*loading="lazy"\s*/g, ' ');

  // Añadir fetchpriority="high" después del src
  if (!imgAttributes.includes('fetchpriority')) {
    imgAttributes = imgAttributes.replace(/(src="[^"]*")/, '$1 fetchpriority="high"');
  }

  // Reconstruir el tag img
  const newImg = `<img${imgAttributes}>`;

  if (originalImg === newImg) {
    return false; // Sin cambios
  }

  // Reemplazar solo la primera ocurrencia
  content = content.replace(originalImg, newImg);

  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.astro')) {
      const modified = processFile(filePath);
      if (modified) {
        modifiedCount++;
        console.log(`✓ Modificado: ${filePath.replace(pagesDir, '')}`);
      } else {
        skippedCount++;
      }
    }
  }
}

console.log('Optimizando imágenes LCP...\n');
walkDir(pagesDir);
console.log(`\n✅ Completado: ${modifiedCount} archivos modificados, ${skippedCount} sin cambios.`);
