/**
 * Validation utility for form inputs and data validation
 */
import { ValidationError } from '../types';

// Validation rules
export type ValidationRule = {
  test: (value: any, formValues?: Record<string, any>) => boolean;
  message: string;
};

// Common validation rules
export const rules = {
  required: (message = 'This field is required'): ValidationRule => ({
    test: (value) => {
      if (value === undefined || value === null) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return (value?.length || 0) > 0;
      return true;
    },
    message,
  }),
  
  minLength: (min: number, message = `Must be at least ${min} characters`): ValidationRule => ({
    test: (value) => typeof value === 'string' && value.trim().length >= min,
    message,
  }),
  
  maxLength: (max: number, message = `Must be no more than ${max} characters`): ValidationRule => ({
    test: (value) => typeof value === 'string' && value.trim().length <= max,
    message,
  }),
  
  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    test: (value) => {
      if (typeof value !== 'string') return false;
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      return emailRegex.test(value);
    },
    message,
  }),
  
  numeric: (message = 'Please enter a valid number'): ValidationRule => ({
    test: (value) => !isNaN(parseFloat(value)) && isFinite(value),
    message,
  }),
  
  integer: (message = 'Please enter a valid integer'): ValidationRule => ({
    test: (value) => Number.isInteger(Number(value)),
    message,
  }),
  
  min: (min: number, message = `Must be at least ${min}`): ValidationRule => ({
    test: (value) => Number(value) >= min,
    message,
  }),
  
  max: (max: number, message = `Must be no more than ${max}`): ValidationRule => ({
    test: (value) => Number(value) <= max,
    message,
  }),
  
  pattern: (regex: RegExp, message = 'Invalid format'): ValidationRule => ({
    test: (value) => regex.test(String(value)),
    message,
  }),
  
  match: (field: string, message = `Must match ${field}`): ValidationRule => ({
    test: (value, formValues) => value === formValues?.[field],
    message,
  }),
};

/**
 * Validate a single value against a set of rules
 * @param value Value to validate
 * @param validationRules Rules to validate against
 * @param formValues Optional form values for cross-field validation
 * @returns Error message or null if valid
 */
export function validateValue(
  value: any,
  validationRules: ValidationRule[],
  formValues?: Record<string, any>
): string | null {
  for (const rule of validationRules) {
    if (!rule.test(value, formValues)) {
      return rule.message;
    }
  }
  return null;
}

/**
 * Validate a form against a schema of rules
 * @param values Form values
 * @param schema Validation schema
 * @returns Object with errors for each field
 */
export function validateForm(
  values: Record<string, any>,
  schema: Record<string, ValidationRule[]>
): Record<string, string | null> {
  const errors: Record<string, string | null> = {};
  
  Object.entries(schema).forEach(([field, rules]) => {
    const error = validateValue(values[field], rules, values);
    if (error) {
      errors[field] = error;
    }
  });
  
  return errors;
}

/**
 * Check if a form has any validation errors
 * @param errors Validation errors object
 * @returns True if form has errors
 */
export function hasErrors(errors: Record<string, string | null>): boolean {
  return Object.values(errors).some(error => error !== null);
}

/**
 * Format validation errors for API response
 * @param errors Validation errors from server
 * @returns Formatted validation errors
 */
export function formatApiValidationErrors(errors: ValidationError[]): Record<string, string> {
  const formattedErrors: Record<string, string> = {};
  
  errors.forEach(error => {
    formattedErrors[error.field] = error.message;
  });
  
  return formattedErrors;
}

/**
 * Create a validation schema for a form
 * @param schema Schema definition
 * @returns Validation schema
 */
export function createValidationSchema(schema: Record<string, ValidationRule[]>) {
  return schema;
}

/**
 * Validate data against a schema
 * @param data Data to validate
 * @param schema Validation schema
 * @returns Array of validation errors or empty array if valid
 */
export function validateData(
  data: Record<string, any>,
  schema: Record<string, ValidationRule[]>
): ValidationError[] {
  const errors: ValidationError[] = [];

  Object.entries(schema).forEach(([field, rules]) => {
    const error = validateValue(data[field], rules);
    if (error) {
      errors.push({
        field,
        message: error
      });
    }
  });

  return errors;
}