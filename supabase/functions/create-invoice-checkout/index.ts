// Server-only Stripe Checkout session for a shared invoice. Uses the Stripe
// secret and Supabase service role, which never ship in the mobile app.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const { token } = await req.json();
  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const invoice = await admin.from('invoices').select('id, number, currency, total_cents, status').eq('public_token', token).maybeSingle();
  if (invoice.error || !invoice.data) {
    return new Response(JSON.stringify({ error: 'This invoice link is not valid.' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
  const payments = await admin.from('payments').select('amount_cents').eq('invoice_id', invoice.data.id);
  const paid = (payments.data ?? []).reduce((sum, row) => sum + Number(row.amount_cents), 0);
  const balance = Number(invoice.data.total_cents) - paid;
  if (balance <= 0) {
    return new Response(JSON.stringify({ error: 'This invoice is already paid.' }), { status: 409, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
  const origin = Deno.env.get('BILLKIT_WEB_ORIGIN') ?? 'https://billkit-app.quvantic.com';
  const params = new URLSearchParams({
    mode: 'payment',
    success_url: `${origin}/pay/${token}?paid=1`,
    cancel_url: `${origin}/pay/${token}`,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': String(invoice.data.currency).toLowerCase(),
    'line_items[0][price_data][unit_amount]': String(balance),
    'line_items[0][price_data][product_data][name]': `Invoice ${invoice.data.number}`,
    'metadata[public_token]': token,
  });
  const stripe = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  const session = await stripe.json();
  if (!stripe.ok || typeof session.url !== 'string') {
    return new Response(JSON.stringify({ error: 'Stripe did not return a checkout link.' }), { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify({ url: session.url }), { headers: { ...cors, 'Content-Type': 'application/json' } });
});
