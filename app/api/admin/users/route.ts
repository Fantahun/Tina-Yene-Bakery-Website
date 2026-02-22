import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

import { prisma } from "@/lib/prisma"

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

function basicAuthValid(req: Request) {
  const auth = req.headers.get("authorization")
  if (!auth?.startsWith("Basic ")) return false
  const decoded = Buffer.from(auth.split(" ")[1] ?? "", "base64").toString()
  const [user, pass] = decoded.split(":")
  return user === process.env.ADMIN_USERNAME && pass === process.env.ADMIN_PASSWORD
}

export async function POST(req: Request) {
  if (!basicAuthValid(req)) return unauthorized()

  const body = await req.json().catch(() => null)
  if (!body || typeof body.username !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "username and password are required" }, { status: 400 })
  }

  const username = body.username.trim().toLowerCase()
  const password = body.password
  const role = typeof body.role === "string" ? body.role : "admin"

  if (!username || password.length < 6) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 400 })
  }

  const existing = await prisma.adminUser.findUnique({ where: { username } })
  if (existing) {
    return NextResponse.json({ error: "username already exists" }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.adminUser.create({
    data: {
      username,
      passwordHash,
      role,
      isActive: true,
      createdBy:"system",
    },
  })

  return NextResponse.json({ id: user.id, username: user.username, role: user.role }, { status: 201 })
}

