export const zodRule = (schema) => (value) => {
  const result = schema.safeParse(value);
  return result.success || result.error.issues[0].message;
};
