import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 10,   // 10 minutes session max age
    updateAge: 60 * 5,    // refresh session every 5 minutes if active
  },
  pages: {
    signIn: "/yeneAdmin/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.username || !credentials?.password) return null

        const username = credentials.username.trim().toLowerCase()
        const user = await prisma.adminUser.findUnique({ where: { username } })
        if (!user || !user.isActive) return null

        // Deny if too many failed attempts
        if (user.failedLoginAttempts >= 3) {
          const ip = req?.headers?.get?.("x-forwarded-for") ?? req?.headers?.get?.("x-real-ip") ?? undefined
          const ua = req?.headers?.get?.("user-agent") ?? undefined
          prisma.adminLoginHistory.create({
            data: {
              adminUserId: user.id,
              status: "locked",
              ipAddress: ip,
              userAgent: ua,
            },
          }).catch(() => {})
          return null
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        const ip = req?.headers?.get?.("x-forwarded-for") ?? req?.headers?.get?.("x-real-ip") ?? undefined
        const ua = req?.headers?.get?.("user-agent") ?? undefined

        if (!valid) {
          // increment failed attempts, stamp lastFailedLoginAt, and log
          prisma.adminUser.update({
            where: { id: user.id },
            data: { failedLoginAttempts: { increment: 1 }, lastFailedLoginAt: new Date() },
          }).catch(() => {})

          prisma.adminLoginHistory.create({
            data: {
              adminUserId: user.id,
              status: "failed",
              ipAddress: ip,
              userAgent: ua,
            },
          }).catch(() => {})
          return null
        }

        // Success: reset failed attempts and log success
        prisma.adminUser.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date(), failedLoginAttempts: 0},
        }).catch(() => {})
        prisma.adminLoginHistory.create({
          data: {
            adminUserId: user.id,
            status: "success",
            ipAddress: ip,
            userAgent: ua,
          },
        }).catch(() => {})

        const displayName = user.fullName ?? user.username
        return { name: displayName, role: user.role, username: user.username, fullName: user.fullName ?? undefined }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role
        token.username = (user as { username?: string }).username ?? token.name ?? undefined
        token.fullName = (user as { fullName?: string }).fullName ?? token.name ?? undefined
        delete (token as { sub?: string }).sub
      }
      return token
    },
    async session({ session, token }) {
      session.user = {
        name: (token as { fullName?: string; username?: string; name?: string }).fullName ?? token.name ?? null,
        role: (token as { role?: string }).role || "admin",
        username: (token as { username?: string }).username ?? undefined,
        fullName: (token as { fullName?: string }).fullName ?? undefined,
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

declare module "next-auth" {
  interface Session {
    user?: {
      name?: string | null
      role?: string
      username?: string
      fullName?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string
    username?: string
    fullName?: string
  }
}
