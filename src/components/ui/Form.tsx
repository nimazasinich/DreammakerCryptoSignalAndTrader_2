import React, { ReactNode } from 'react';
import { FormState } from '../../types';
import { ValidationRule } from '../../utils/validation';
import { useForm } from '../../hooks/useForm';
import FormInput from './FormInput';

interface FormProps<T extends Record<string, any>> {
  initialValues: T;
  validationSchema?: Record<keyof T, ValidationRule[]>;
  onSubmit: (values: T, formState: any) => Promise<void> | void;
  children: (formProps: {
    values: T;
    errors: Record<keyof T, string | null>;
    touched: Record<keyof T, boolean>;
    isSubmitting: boolean;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    setFieldValue: (name: keyof T, value: any) => void;
    setFieldError: (name: keyof T, error: string | null) => void;
    resetForm: () => void;
  }) => ReactNode;
  className?: string;
  id?: string;
}

/**
 * Reusable Form component with validation
 */
export function Form<T extends Record<string, any>>({
  initialValues,
  validationSchema,
  onSubmit,
  children,
  className,
  id,
}: FormProps<T>) {
  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    resetForm,
  } = useForm<T>({
    initialValues,
    validationSchema,
    onSubmit,
  });

  return (
    <form
      onSubmit={handleSubmit}
      className={className}
      id={id}
      noValidate
    >
      {children({
        values,
        errors,
        touched,
        isSubmitting,
        handleChange,
        handleBlur,
        setFieldValue,
        setFieldError,
        resetForm,
      })}
    </form>
  );
}

/**
 * FormInput component - exported for convenience
 * Use this component within Form for consistent input styling
 */
export { FormInput };

export default Form;