export const PAYABLE_STATUSES = ['pendente', 'processando', 'vencido'];

// A Pix confirmation under precautionary review must not release an appointment.
export function providerEvent(payment) {
  if (payment.deleted || payment.refunds?.some(refund => Number(refund.value)>0 && ['DONE','PENDING'].includes(refund.status)) || ['REFUNDED', 'REFUND_REQUESTED', 'REFUND_IN_PROGRESS', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL'].includes(payment.status)) return 'PAYMENT_REVOKED';
  if (['RECEIVED', 'RECEIVED_IN_CASH'].includes(payment.status)) return 'PAYMENT_RECEIVED';
  if (payment.status === 'CONFIRMED' && ['CREDIT_CARD', 'BOLETO'].includes(payment.billingType)) return 'PAYMENT_CONFIRMED';
  if (payment.status === 'OVERDUE') return 'PAYMENT_OVERDUE';
  return 'PAYMENT_PENDING';
}

export function clinicDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  const get = key => parts.find(p => p.type === key).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function clinicSlot(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Data ou horário inválido.');
  // Resolve the offset for the appointment date, independently of the browser timezone.
  const utc = new Date(`${date}T${time}:00Z`);
  const offset = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', timeZoneName: 'longOffset' }).formatToParts(utc).find(p => p.type === 'timeZoneName').value.replace('GMT', '') || '+00:00';
  const result = new Date(`${date}T${time}:00${offset}`);
  if (!Number.isFinite(result.getTime()) || clinicDate(result) !== date) throw new Error('Data inválida.');
  return result.toISOString();
}

export function checkoutUrl(value, environment) {
  try {
    const url = new URL(value);
    const hosts = environment === 'production' ? ['www.asaas.com', 'asaas.com'] : ['sandbox.asaas.com'];
    return url.protocol === 'https:' && hosts.includes(url.hostname) ? url.href : null;
  } catch { return null; }
}
