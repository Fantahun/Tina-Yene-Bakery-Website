import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withCacheInvalidation } from "@/lib/cache-invalidation";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const skip = (page - 1) * limit;

  // Build filter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (startDate) {
    // If only startDate is provided, from that day onwards
    where.createdAt = { ...where.createdAt, gte: new Date(`${startDate}T00:00:00`) };
  }
  if (endDate) {
    // If only endDate is provided, up to that day
    where.createdAt = { ...where.createdAt, lte: new Date(`${endDate}T23:59:59`) };
  }
  if (search) {
    where.OR = [
      { name: { contains: search, } },
      { email: { contains: search, } },
      { phone: { contains: search, } },
      { subject: { contains: search, } },
      { message: { contains: search, } },
    ];
  }

  try {
    const messages = await prisma.contactSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await prisma.contactSubmission.count({ where });

    return NextResponse.json({
      messages,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

async function PATCHHandler(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, isRead } = body;

    if (!id || typeof isRead !== 'boolean') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const updatedMessage = await prisma.contactSubmission.update({
      where: { id },
      data: { isRead },
    });

    return NextResponse.json({ success: true, message: updatedMessage });
  } catch (error) {
    console.error('Failed to update message:', error);
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
}

// Wrapped centrally so every mutation purges the storefront caches.
export const PATCH = withCacheInvalidation(PATCHHandler);
