import { validateValue, validateForm, rules } from '../utils/validation';

describe('Validation Utility', () => {
  describe('validateValue', () => {
    test('should return null for valid values', () => {
      expect(validateValue('test', [rules.required()])).toBeNull();
      expect(validateValue('test@example.com', [rules.email()])).toBeNull();
      expect(validateValue('123', [rules.numeric()])).toBeNull();
    });

    test('should return error message for invalid values', () => {
      expect(validateValue('', [rules.required()])).toBe('This field is required');
      expect(validateValue('invalid-email', [rules.email()])).toBe('Please enter a valid email address');
      expect(validateValue('abc', [rules.numeric()])).toBe('Please enter a valid number');
    });

    test('should validate against multiple rules', () => {
      const validationRules = [
        rules.required(),
        rules.minLength(5),
        rules.maxLength(10)
      ];
      
      expect(validateValue('', validationRules)).toBe('This field is required');
      expect(validateValue('abc', validationRules)).toBe('Must be at least 5 characters');
      expect(validateValue('abcdefghijk', validationRules)).toBe('Must be no more than 10 characters');
      expect(validateValue('abcdef', validationRules)).toBeNull();
    });
  });

  describe('validateForm', () => {
    test('should validate all fields in a form', () => {
      const values = {
        name: 'John',
        email: 'invalid-email',
        age: '30'
      };
      
      const schema = {
        name: [rules.required(), rules.minLength(3)],
        email: [rules.required(), rules.email()],
        age: [rules.required(), rules.numeric(), rules.min(18)]
      };
      
      const errors = validateForm(values, schema);
      
      expect(errors.name).toBeNull();
      expect(errors.email).toBe('Please enter a valid email address');
      expect(errors.age).toBeNull();
    });
  });
});