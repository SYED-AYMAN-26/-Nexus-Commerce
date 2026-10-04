/** Client-side validators mirroring the server rules (server always re-validates). */

export const isEmail = (value = '') => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim());

export const passwordChecks = (password = '') => ({
  length: password.length >= 8,
  lowercase: /[a-z]/.test(password),
  uppercase: /[A-Z]/.test(password),
  number: /\d/.test(password),
});

export const isStrongPassword = (password = '') => Object.values(passwordChecks(password)).every(Boolean);

export const isPhone = (value = '') => /^[+\d][\d\s\-()]{6,19}$/.test(String(value).trim());

export const isPostalCode = (value = '') => /^[A-Za-z0-9\s-]{3,10}$/.test(String(value).trim());

export const required = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'number') return true;
  return Boolean(String(value ?? '').trim());
};

/* ------------------------------------------------------------- form schemas */

export const validateRegister = (values) => {
  const errors = {};
  if (!required(values.name) || values.name.trim().length < 2) errors.name = 'Please enter your full name';
  if (!isEmail(values.email)) errors.email = 'Enter a valid email address';
  if (!isStrongPassword(values.password)) {
    errors.password = 'Use 8+ characters with upper, lower case and a number';
  }
  if (values.confirmPassword !== values.password) errors.confirmPassword = 'Passwords do not match';
  return errors;
};

export const validateLogin = (values) => {
  const errors = {};
  if (!isEmail(values.email)) errors.email = 'Enter a valid email address';
  if (!required(values.password)) errors.password = 'Please enter your password';
  return errors;
};

export const validateAddress = (values) => {
  const errors = {};
  if (!required(values.fullName) || values.fullName.trim().length < 2) errors.fullName = 'Full name is required';
  if (!isPhone(values.phone)) errors.phone = 'Enter a valid phone number';
  if (!required(values.addressLine1) || values.addressLine1.trim().length < 4) errors.addressLine1 = 'Address is required';
  if (!required(values.city)) errors.city = 'City is required';
  if (!required(values.state)) errors.state = 'State is required';
  if (!isPostalCode(values.postalCode)) errors.postalCode = 'Enter a valid postal code';
  if (!required(values.country)) errors.country = 'Country is required';
  return errors;
};

export const validateProduct = (values) => {
  const errors = {};
  if (!required(values.name) || values.name.trim().length < 3) errors.name = 'Name must be at least 3 characters';
  if (!required(values.description) || values.description.trim().length < 20) errors.description = 'Description must be at least 20 characters';
  if (values.price === '' || Number(values.price) < 0) errors.price = 'Enter a valid price';
  if (values.discountPrice && Number(values.discountPrice) >= Number(values.price)) {
    errors.discountPrice = 'Discount price must be lower than the price';
  }
  if (!required(values.category)) errors.category = 'Choose a category';
  if (!required(values.brand)) errors.brand = 'Brand is required';
  if (!required(values.SKU)) errors.SKU = 'SKU is required';
  if (values.stock === '' || Number(values.stock) < 0) errors.stock = 'Enter a valid stock quantity';
  return errors;
};

export const validateReview = (values) => {
  const errors = {};
  if (!values.rating) errors.rating = 'Please choose a rating';
  if (!required(values.comment) || values.comment.trim().length < 3) errors.comment = 'Please write a few words about the product';
  return errors;
};

/* ------------------------------------------------------------------ helpers */

/** Run a validator and return { valid, errors } for form submit handlers. */
export const runValidation = (validator, values) => {
  const errors = validator(values);
  return { valid: Object.keys(errors).length === 0, errors };
};

/** Debounced async email availability check helper (used on the register form). */
export const getPasswordStrength = (password = '') => {
  const checks = passwordChecks(password);
  const score = Object.values(checks).filter(Boolean).length;
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score, label: labels[score], checks };
};
