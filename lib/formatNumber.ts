const defaultFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export const fmt = (value?: number | string | null, opts?: Intl.NumberFormatOptions) => {
  if (value === null || value === undefined) {
    return '—';
  }

  const num = typeof value === 'string' ? Number(value) : value;

  if (!Number.isFinite(num)) {
    return '—';
  }

  if (opts) {
    return new Intl.NumberFormat('en-US', opts).format(num);
  }

  return defaultFormatter.format(num);
};

export default fmt;
