import fs from "node:fs"

const requiredFiles = [
  "app/yeneAdmin/reports/page.tsx",
  "app/api/admin/reports/orders/route.ts",
  "app/api/admin/reports/products/route.ts",
  "app/api/admin/reports/fulfillment/route.ts",
]

const missing = requiredFiles.filter((file) => !fs.existsSync(file))

if (missing.length > 0) {
  console.error("Missing report files:")
  for (const file of missing) {
    console.error(`- ${file}`)
  }
  process.exit(1)
}

console.log("Reports module files present.")

