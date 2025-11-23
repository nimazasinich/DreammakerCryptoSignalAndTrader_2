import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { Form } from '../components/ui/Form';
import { rules } from '../utils/validation';

describe('Form Component', () => {
  test('renders form with initial values', () => {
    const initialValues = { name: 'John', email: 'john@example.com' };
    
    const { getByDisplayValue } = render(
      <Form
        initialValues={initialValues}
        onSubmit={vi.fn()}
      >
        {({ values, handleChange }) => (
          <>
            <input
              name="name"
              value={values.name}
              onChange={handleChange}
              data-testid="name-input"
            />
            <input
              name="email"
              value={values.email}
              onChange={handleChange}
              data-testid="email-input"
            />
          </>
        )}
      </Form>
    );
    
    expect(getByDisplayValue('John')).toBeInTheDocument();
    expect(getByDisplayValue('john@example.com')).toBeInTheDocument();
  });
  
  test('validates form fields on blur', async () => {
    const initialValues = { name: '', email: 'invalid-email' };
    const validationSchema = {
      name: [rules.required('Name is required')],
      email: [rules.email('Invalid email format')]
    };
    
    const { getByTestId } = render(
      <Form
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={vi.fn()}
      >
        {({ values, errors, handleChange, handleBlur }) => (
          <>
            <input
              name="name"
              value={values.name}
              onChange={handleChange}
              onBlur={handleBlur}
              data-testid="name-input"
            />
            {errors.name && <div data-testid="name-error">{errors.name}</div>}
            
            <input
              name="email"
              value={values.email}
              onChange={handleChange}
              onBlur={handleBlur}
              data-testid="email-input"
            />
            {errors.email && <div data-testid="email-error">{errors.email}</div>}
          </>
        )}
      </Form>
    );
    
    // Trigger blur events to validate fields
    fireEvent.blur(getByTestId('name-input'));
    fireEvent.blur(getByTestId('email-input'));
    
    await waitFor(() => {
      expect(getByTestId('name-error')).toHaveTextContent('Name is required');
      expect(getByTestId('email-error')).toHaveTextContent('Invalid email format');
    });
  });
  
  test('submits form with valid values', async () => {
    const initialValues = { name: 'John', email: 'john@example.com' };
    const handleSubmit = vi.fn();
    
    const { getByTestId } = render(
      <Form
        initialValues={initialValues}
        onSubmit={handleSubmit}
      >
        {({ handleSubmit }) => (
          <form onSubmit={handleSubmit} data-testid="form">
            <button type="submit" data-testid="submit-button">Submit</button>
          </form>
        )}
      </Form>
    );
    
    fireEvent.submit(getByTestId('form'));
    
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });
  });
});