export function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatTime(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

/** "10 mins ago", "2 hours ago", "Yesterday", "12 Sep". */
export function timeAgo(iso?: string | null) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - t);
  const min = Math.round(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min${min > 1 ? 's' : ''} ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  const days = Math.round(h / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** Chat list stamp: time today, "Yesterday", else "24 Sep". */
export function chatStamp(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return formatTime(iso);
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function dayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return formatDate(iso);
}

export function cmToFeet(cm?: number | null) {
  if (!cm) return '';
  const inches = Math.round(cm / 2.54);
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

export const nameAge = (p: { name: string; age: number | null }) => (p.age ? `${p.name}, ${p.age}` : p.name);

export const maskEmail = (e: string) => {
  const [u, d] = e.split('@');
  if (!d) return e;
  return `${u.slice(0, 2)}${'•'.repeat(Math.max(1, u.length - 2))}@${d}`;
};

export const maskPhone = (p: string) => (p ? `+91 ••••• •${p.slice(-4)}` : '');
