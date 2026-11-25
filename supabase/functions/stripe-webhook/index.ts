// Stripe webhook. Verifies the signature, then records the payment with the
// service role and notifies owner, admin, and accountant members.
import { createClient } from 'npm:@supabase/supabase-js@2';

async function verify(payload: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(',').map((part) => part.split('=')));
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const expected = [...new Uint8Array(mac)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return expected === signature;
}

Deno.serve(async (req) => {
  const payload = await req.text();
  const valid = await verify(payload, req.headers.get('stripe-signature'), Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '');
  if (!valid) return new Response('Invalid signature', { status: 400 });
  const event = JSON.parse(payload);
  if (event.type !== 'checkout.session.completed') return new Response('ok');
  const token = event.data?.object?.metadata?.public_token;
  const amount = Number(event.data?.object?.amount_total ?? 0);
  if (!token || !amount) return new Response('ok');
  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const invoice = await admin.from('invoices').select('id, organization_id, number, customers(name)').eq('public_token', token).maybeSingle();
  if (!invoice.data) return new Response('ok');
  const paidAt = new Date().toISOString();
  await admin.from('payments').insert({
    invoice_id: invoice.data.id,
    organization_id: invoice.data.organization_id,
    amount_cents: amount,
    stripe_checkout_session_id: event.data.object.id,
    created_at: paidAt,
  });
  await admin.from('invoices').update({ status: 'paid', paid_at: paidAt, updated_at: paidAt }).eq('id', invoice.data.id);
  await admin.from('invoice_events').insert({
    invoice_id: invoice.data.id,
    organization_id: invoice.data.organization_id,
    type: 'payment',
    message: 'Paid in full',
    created_at: paidAt,
  });
  const members = await admin.from('organization_members').select('user_id, role').eq('organization_id', invoice.data.organization_id);
  const customerName = invoice.data.customers?.name ?? 'the customer';
  const notifications = (members.data ?? [])
    .filter((member) => ['owner', 'admin', 'accountant'].includes(member.role))
    .map((member) => ({
      organization_id: invoice.data.organization_id,
      user_id: member.user_id,
      title: 'Invoice paid',
      body: `${invoice.data.number} was paid by ${customerName}.`,
      invoice_id: invoice.data.id,
      created_at: paidAt,
    }));
  if (notifications.length) await admin.from('notifications').insert(notifications);
  return new Response('ok');
});
