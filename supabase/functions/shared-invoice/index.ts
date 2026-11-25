// Server-only. Deploy with the Supabase CLI. The mobile app calls this
// function with the anon key; the service role stays in the function environment.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const { token } = await req.json();
  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const invoice = await admin.from('invoices').select('*, customers(name, email), organizations(name, email, tax_label)').eq('public_token', token).maybeSingle();
  if (invoice.error || !invoice.data || invoice.data.status === 'draft' || invoice.data.status === 'void') {
    return new Response(JSON.stringify({ error: 'This invoice link is not valid.' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
  if (invoice.data.status === 'sent') {
    await admin.from('invoices').update({ status: 'viewed', viewed_at: new Date().toISOString() }).eq('id', invoice.data.id);
    await admin.from('invoice_events').insert({ invoice_id: invoice.data.id, organization_id: invoice.data.organization_id, type: 'viewed', message: 'Opened by the customer' });
  }
  const payments = await admin.from('payments').select('amount_cents').eq('invoice_id', invoice.data.id);
  const paid = (payments.data ?? []).reduce((sum, row) => sum + Number(row.amount_cents), 0);
  const balance = Math.max(Number(invoice.data.total_cents) - paid, 0);
  const lines = await admin.from('invoice_line_items').select('*').eq('invoice_id', invoice.data.id).order('sort_order');
  const body = {
    token,
    organizationName: invoice.data.organizations?.name,
    organizationEmail: invoice.data.organizations?.email,
    taxLabel: invoice.data.organizations?.tax_label,
    currency: invoice.data.currency,
    number: invoice.data.number,
    customerName: invoice.data.customers?.name,
    dueDate: invoice.data.due_date,
    issueDate: invoice.data.issue_date,
    subtotalCents: invoice.data.subtotal_cents,
    taxCents: invoice.data.tax_cents,
    totalCents: invoice.data.total_cents,
    balanceCents: balance,
    displayStatus: balance > 0 && invoice.data.due_date < new Date().toISOString().slice(0, 10) && invoice.data.status !== 'paid' ? 'overdue' : invoice.data.status,
    notes: invoice.data.notes,
    paidAt: invoice.data.paid_at,
    lines: (lines.data ?? []).map((line) => ({
      id: line.id,
      description: line.description,
      quantity: Number(line.quantity),
      unitAmountCents: line.unit_amount_cents,
      amountCents: Math.round(Number(line.quantity) * Number(line.unit_amount_cents)),
    })),
  };
  return new Response(JSON.stringify(body), { headers: { ...cors, 'Content-Type': 'application/json' } });
});
