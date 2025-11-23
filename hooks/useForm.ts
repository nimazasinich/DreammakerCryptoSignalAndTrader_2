import { useState, useCallback, FormEvent, ChangeEvent } from 'react';
import { Logger } from '../core/Logger.js';
import { validateForm, ValidationRule, hasErrors } from '../utils/validation';

// Local FormState interface specific to form handling (different from global FormState in types)
interface FormState<T> {
  values: T;
  errors: Record<keyof T, string | null>;
  touched: Record<keyof T, boolean>;
  isSubmitting: boolean;
  submitCount: number;
  setFieldValue: (name: keyof T, value: any) => void;
  setFieldError: (name: keyof T, error: string | null) => void;
  resetForm: () => void;
}

interface UseFormOptions<T> {
  initialValues: T;
  validationSchema?: Record<keyof T, ValidationRule[]>;
  onSubmit: (values: T, formState: FormState<T>) => Promise<void> | void;
}

/**
 * Custom hook for form handling with validation
 */

const logger = Logger.getInstance();

export function useForm<T extends Record<string, any>>({
  initialValues,
  validationSchema = {} as Record<keyof T, ValidationRule[]>,
  onSubmit,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<keyof T, string | null>>({} as Record<keyof T, string | null>);
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Validate a single field
  const validateField = useCallback(
    (name: keyof T) => {
      if (!validationSchema[name]) return null;
      
      const fieldErrors = validateForm(
        { [name]: values[name] },
        { [name]: validationSchema[name] }
      );
      
      return fieldErrors[name as string] || null;
    },
    [values, validationSchema]
  );

  // Validate all fields
  const validateAllFields = useCallback(() => {
    const fieldErrors = validateForm(
      values as Record<string, any>,
      validationSchema as Record<string, ValidationRule[]>
    );
    
    setErrors(fieldErrors as Record<keyof T, string | null>);
    return !hasErrors(fieldErrors);
  }, [values, validationSchema]);

  // Handle field change
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      
      // Handle different input types
      let fieldValue: any = value;
      if (type === 'checkbox') {
        fieldValue = (e.target as HTMLInputElement).checked;
      } else if (type === 'number') {
        fieldValue = value === '' ? '' : Number(value);
      }
      
      setValues(prev => ({
        ...prev,
        [name]: fieldValue,
      }));
      
      // Mark field as touched
      if (!touched[name as keyof T]) {
        setTouched(prev => ({
          ...prev,
          [name]: true,
        }));
      }
      
      // Validate field if it has been touched
      if (touched[name as keyof T] && validationSchema[name as keyof T]) {
        const error = validateField(name as keyof T);
        setErrors(prev => ({
          ...prev,
          [name]: error,
        }));
      }
    },
    [touched, validateField, validationSchema]
  );

  // Handle field blur
  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name } = e.target;
      
      // Mark field as touched
      setTouched(prev => ({
        ...prev,
        [name]: true,
      }));
      
      // Validate field
      if (validationSchema[name as keyof T]) {
        const error = validateField(name as keyof T);
        setErrors(prev => ({
          ...prev,
          [name]: error,
        }));
      }
    },
    [validateField, validationSchema]
  );

  // Set field value programmatically
  const setFieldValue = useCallback(
    (name: keyof T, value: any) => {
      setValues(prev => ({
        ...prev,
        [name]: value,
      }));
      
      // Validate field if it has been touched
      if (touched[name] && validationSchema[name]) {
        const error = validateField(name);
        setErrors(prev => ({
          ...prev,
          [name]: error,
        }));
      }
    },
    [touched, validateField, validationSchema]
  );

  // Set field error programmatically
  const setFieldError = useCallback(
    (name: keyof T, error: string | null) => {
      setErrors(prev => ({
        ...prev,
        [name]: error,
      }));
    },
    []
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (e?: FormEvent) => {
      if (e) {
        e.preventDefault();
      }
      
      // Validate all fields
      const isValid = validateAllFields();
      
      // Mark all fields as touched
      const allTouched = Object.keys(values).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {} as Record<keyof T, boolean>
      );
      setTouched(allTouched);
      
      // Increment submit count
      setSubmitCount(prev => prev + 1);
      
      // If form is valid, submit
      if (isValid) {
        setIsSubmitting(true);
        setSubmitError(null);
        
        try {
          await onSubmit(values, {
            values,
            errors,
            touched,
            isSubmitting: true,
            submitCount: submitCount + 1,
            setFieldValue,
            setFieldError,
            resetForm,
          });
        } catch (error) {
          setSubmitError(error instanceof Error ? error.message : 'An error occurred');
          logger.error('Form submission error:', {}, error);
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [values, errors, touched, submitCount, validateAllFields, onSubmit, setFieldValue, setFieldError]
  );

  // Reset form to initial values
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({} as Record<keyof T, string | null>);
    setTouched({} as Record<keyof T, boolean>);
    setSubmitError(null);
  }, [initialValues]);

  // Form state
  const formState: FormState<T> = {
    values,
    errors,
    touched,
    isSubmitting,
    submitCount,
    setFieldValue,
    setFieldError,
    resetForm,
  };

  return {
    values,
    errors,
    touched,
    isSubmitting,
    submitCount,
    submitError,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    resetForm,
    formState,
  };
}