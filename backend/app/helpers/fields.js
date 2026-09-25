/**
 * Shared request-body helpers for catalog controllers.
 */
export const requiredText = (value) => {
  if (value === undefined || value === null || !String(value).trim()) {
    return null;
  }

  return String(value).trim();
};

export const parseId = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};
