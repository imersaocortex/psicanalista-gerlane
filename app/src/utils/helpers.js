export function formatDate(dateStr) {
  if (!dateStr) return '';
  // Handle both full ISO strings (2026-05-14T01:18:00.000Z) and date-only strings (2026-05-14)
  const date = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T12:00:00');
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function getStatusColor(status) {
  const map = {
    'pago': 'var(--color-success)',
    'pendente': 'var(--color-warning)',
    'atrasado': 'var(--color-error)',
    'vencido': 'var(--color-error)',
    'realizada': 'var(--color-success)',
    'concluida': 'var(--color-success)',
    'agendada': 'var(--color-info)',
    'confirmada': 'var(--color-info)',
    'confirmado': 'var(--color-info)',
    'cancelada': 'var(--color-error)',
    'ativo': 'var(--color-success)',
  };
  return map[status] || 'var(--text-muted)';
}

export function getStatusBg(status) {
  const map = {
    'pago': 'var(--color-success-light)',
    'pendente': 'var(--color-warning-light)',
    'atrasado': 'var(--color-error-light)',
    'vencido': 'var(--color-error-light)',
    'realizada': 'var(--color-success-light)',
    'concluida': 'var(--color-success-light)',
    'agendada': 'var(--color-info-light)',
    'confirmada': 'var(--color-info-light)',
    'confirmado': 'var(--color-info-light)',
    'cancelada': 'var(--color-error-light)',
    'ativo': 'var(--color-success-light)',
  };
  return map[status] || 'var(--color-beige)';
}

export function getInitials(name) {
  return name.split(' ').filter(n => n.length > 2).slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}
