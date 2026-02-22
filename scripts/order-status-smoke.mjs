import fs from "node:fs"

const schemaPath = "prisma/schema.prisma"
const schema = fs.readFileSync(schemaPath, "utf8")

if (!schema.includes("model OrderStatusEntry")) {
  console.error("OrderStatusEntry model not found in schema.prisma")
  process.exit(1)
}

console.log("OrderStatusEntry model detected in schema.prisma")

