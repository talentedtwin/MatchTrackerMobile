/**
 * Clerk Webhook Handler
 * POST /api/webhooks/clerk - Handle Clerk user events
 * 
 * Synchronizes Clerk users with the database
 */
import { Webhook  } from 'svix';
import { getPrisma  } from '../../../lib/prisma.js';
import EncryptionService from '../../../lib/encryption.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the Svix headers for verification
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  // Get the headers
  const svix_id = req.headers['svix-id'];
  const svix_timestamp = req.headers['svix-timestamp'];
  const svix_signature = req.headers['svix-signature'];

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: 'Error occurred -- no svix headers' });
  }

  // Get the body
  const payload = JSON.stringify(req.body);

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt;

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return res.status(400).json({ error: 'Error occurred during verification' });
  }

  // Handle the webhook
  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`Webhook with ID ${id} and type ${eventType}`);
  console.log('Webhook payload:', evt.data);

  const prisma = getPrisma();

  try {
    switch (eventType) {
      case 'user.created':
        // Create user in database
        const { id: userId, email_addresses, first_name, last_name } = evt.data;
        const primaryEmail = email_addresses.find(e => e.id === evt.data.primary_email_address_id);

        await prisma.user.create({
          data: {
            id: userId,
            email: primaryEmail?.email_address ? EncryptionService.encrypt(primaryEmail.email_address) : null,
            name: (first_name || last_name) ? EncryptionService.encrypt(`${first_name || ''} ${last_name || ''}`.trim()) : null,
            isPremium: false,
            hasConsent: false,
          },
        });

        console.log(`User ${userId} created in database`);
        break;

      case 'user.updated':
        // Update user in database
        const updateData = {};
        
        if (evt.data.email_addresses) {
          const primaryEmailUpdate = evt.data.email_addresses.find(
            e => e.id === evt.data.primary_email_address_id
          );
          if (primaryEmailUpdate?.email_address) {
            updateData.email = EncryptionService.encrypt(primaryEmailUpdate.email_address);
          }
        }

        if (evt.data.first_name || evt.data.last_name) {
          const fullName = `${evt.data.first_name || ''} ${evt.data.last_name || ''}`.trim();
          if (fullName) {
            updateData.name = EncryptionService.encrypt(fullName);
          }
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.user.update({
            where: { id: evt.data.id },
            data: updateData,
          });
          console.log(`User ${evt.data.id} updated in database`);
        }
        break;

      case 'user.deleted':
        // Soft delete user and all their data
        const deleteUserId = evt.data.id;

        await prisma.$transaction(async (tx) => {
          // Soft delete user
          await tx.user.update({
            where: { id: deleteUserId },
            data: {
              isDeleted: true,
              deletedAt: new Date(),
            },
          });

          // Soft delete user's teams
          await tx.team.updateMany({
            where: { userId: deleteUserId },
            data: {
              isDeleted: true,
              deletedAt: new Date(),
            },
          });

          // Soft delete user's players
          await tx.player.updateMany({
            where: { userId: deleteUserId },
            data: {
              isDeleted: true,
              deletedAt: new Date(),
            },
          });
        });

        console.log(`User ${deleteUserId} and their data soft deleted`);
        break;

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

// Disable body parsing, need raw body for webhook verification
export const config = {
  api: {
    bodyParser: false,
  },
};

// Custom body parser for raw body
async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// Wrapper to parse raw body
async function webhookHandler(req, res) {
  if (req.method === 'POST') {
    const buf = await buffer(req);
    req.body = JSON.parse(buf.toString('utf8'));
  }
  return handler(req, res);
}

export default webhookHandler;
