// סקריפט חד-פעמי ליצירת אייקוני PWA מקוריים (ללא תלות בקבצים חיצוניים).
// מריצים עם: node scripts/generate-icons.mjs
import { PNG } from 'pngjs'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')

const SAGE = [114, 101, 227] // primary purple #7265E3
const CREAM = [245, 246, 250] // bg lavender #F5F6FA
const PEACH = [255, 147, 78] // accent orange #FF934E

function hexToRgb([r, g, b]) {
  return { r, g, b }
}

function drawIcon(size, { maskablePadding = 0 } = {}) {
  const png = new PNG({ width: size, height: size })
  const bg = hexToRgb(SAGE)
  const cream = hexToRgb(CREAM)
  const peach = hexToRgb(PEACH)

  const cx = size / 2
  const cy = size / 2
  const contentRadius = (size / 2) * (1 - maskablePadding)

  // רדיוס לפינות מעוגלות (רק לגרסה הלא-maskable; ל-maskable משאירים ריבוע מלא לבטיחות)
  const cornerRadius = maskablePadding > 0 ? 0 : size * 0.22

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2

      // ל-maskable: ריבוע מלא ואטום (ללא שקיפות) כדי שהמערכת תוכל לחתוך אותו לכל צורה
      const inside = maskablePadding > 0 ? true : insideRoundedRect(x, y, size, cornerRadius)

      let color = inside ? bg : { r: 0, g: 0, b: 0, a: 0 }
      let alpha = inside ? 255 : 0

      if (inside) {
        // עלה: שני מעגלים חופפים היוצרים צורת "טיפה"
        const leafCenter1 = { x: cx - size * 0.06, y: cy - size * 0.02 }
        const leafCenter2 = { x: cx + size * 0.1, y: cy - size * 0.14 }
        const r1 = size * 0.24
        const r2 = size * 0.19
        const d1 = dist(x, y, leafCenter1.x, leafCenter1.y)
        const d2 = dist(x, y, leafCenter2.x, leafCenter2.y)
        const inLeaf = d1 <= r1 && d2 <= r2

        // מעגל אפרסק - הדגשה בפינה
        const peachCenter = { x: cx + size * 0.22, y: cy + size * 0.24 }
        const peachR = size * 0.1
        const inPeach = dist(x, y, peachCenter.x, peachCenter.y) <= peachR

        if (inPeach) {
          color = peach
        } else if (inLeaf) {
          color = cream
        } else {
          color = bg
        }
      }

      png.data[idx] = color.r
      png.data[idx + 1] = color.g
      png.data[idx + 2] = color.b
      png.data[idx + 3] = alpha
    }
  }

  return png
}

function dist(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2)
}

function insideRoundedRect(x, y, size, r) {
  const nx = x < r ? r - x : x > size - r ? x - (size - r) : 0
  const ny = y < r ? r - y : y > size - r ? y - (size - r) : 0
  if (x >= r && x <= size - r) return true
  if (y >= r && y <= size - r) return true
  return Math.sqrt(nx * nx + ny * ny) <= r
}

function save(png, name) {
  const buffer = PNG.sync.write(png)
  writeFileSync(join(outDir, name), buffer)
  console.log('נוצר', name)
}

save(drawIcon(192), 'icon-192.png')
save(drawIcon(512), 'icon-512.png')
save(drawIcon(512, { maskablePadding: 0.18 }), 'icon-maskable-512.png')
