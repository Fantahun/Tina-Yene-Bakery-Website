import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(10),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = contactSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.errors },
        { status: 400 }
      );
    }

    const { name, email, phone, subject, message } = result.data;

    const settings = await prisma.siteSetting.findFirst({ orderBy: { id: 'asc' } });
    const maxSubmissions = settings?.maxContactSubmissionsPerDay ?? 5;

    // Check rate limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const submissionCount = await prisma.contactSubmission.count({
      where: {
        email,
        createdAt: {
          gte: today,
        },
      },
    });

    if (submissionCount >= maxSubmissions) {
      return NextResponse.json(
        { error: `You have reached the limit of ${maxSubmissions} messages per day.` },
        { status: 429 }
      );
    }

    // 1. Save to database
    const submission = await prisma.contactSubmission.create({
      data: {
        name,
        email,
        phone,
        subject: subject || 'New Contact Submission',
        message,
      },
    });

    // 2. Fetch email settings
    // const settings = await prisma.siteSetting.findFirst({ orderBy: { id: 'asc' } });

    // 3. Send email execution
    if (settings && settings.contactReceiverEmails && settings.contactSenderEmail) {
      const receivers = settings.contactReceiverEmails.split(',').map(e => e.trim()).filter(Boolean);

      if (receivers.length > 0) {
        // Construct email content
        const emailSubject = `YeneBakery Contact: ${subject || 'No Subject'}`;
        const emailText = `There is a new contact submission from yenebakery.com contact page:

Name: ${name}
Email: ${email}
Phone: ${phone || 'N/A'}

Subject: ${subject || 'N/A'}

Message:
${message}
        `;

        await sendEmail({
          to: receivers.join(', '),
          from: settings.contactSenderEmail,
          subject: emailSubject,
          text: emailText,
        });
      }
    }

    return NextResponse.json({ success: true, id: submission.id });
  } catch (error) {
    console.error('Contact submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
