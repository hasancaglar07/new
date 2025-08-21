// Form Validation Utilities for Mobile UX

/**
 * Validation rules
 */
export const validationRules = {
  required: (value) => {
    if (value === null || value === undefined || value === '') {
      return 'Bu alan zorunludur';
    }
    return null;
  },
  
  email: (value) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Geçerli bir e-posta adresi girin';
    }
    return null;
  },
  
  minLength: (min) => (value) => {
    if (!value) return null;
    if (value.length < min) {
      return `En az ${min} karakter olmalıdır`;
    }
    return null;
  },
  
  maxLength: (max) => (value) => {
    if (!value) return null;
    if (value.length > max) {
      return `En fazla ${max} karakter olmalıdır`;
    }
    return null;
  },
  
  pattern: (regex, message) => (value) => {
    if (!value) return null;
    if (!regex.test(value)) {
      return message || 'Geçersiz format';
    }
    return null;
  },
  
  phone: (value) => {
    if (!value) return null;
    const phoneRegex = /^[+]?[0-9\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(value)) {
      return 'Geçerli bir telefon numarası girin';
    }
    return null;
  },
  
  url: (value) => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return 'Geçerli bir URL girin';
    }
  },
  
  number: (value) => {
    if (!value) return null;
    if (isNaN(Number(value))) {
      return 'Geçerli bir sayı girin';
    }
    return null;
  },
  
  min: (min) => (value) => {
    if (!value) return null;
    if (Number(value) < min) {
      return `En az ${min} olmalıdır`;
    }
    return null;
  },
  
  max: (max) => (value) => {
    if (!value) return null;
    if (Number(value) > max) {
      return `En fazla ${max} olmalıdır`;
    }
    return null;
  }
};

/**
 * Validate a single field
 */
export function validateField(value, rules) {
  if (!rules || rules.length === 0) return null;
  
  for (const rule of rules) {
    const error = rule(value);
    if (error) {
      return error;
    }
  }
  
  return null;
}

/**
 * Validate entire form
 */
export function validateForm(values, schema) {
  const errors = {};
  let hasErrors = false;
  
  for (const [field, rules] of Object.entries(schema)) {
    const error = validateField(values[field], rules);
    if (error) {
      errors[field] = error;
      hasErrors = true;
    }
  }
  
  return { errors, isValid: !hasErrors };
}

/**
 * Custom hook for form validation
 */
import { useState, useCallback } from 'react';

export function useFormValidation(initialValues = {}, schema = {}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const setValue = useCallback((field, value) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  }, [errors]);
  
  const setFieldTouched = useCallback((field, isTouched = true) => {
    setTouched(prev => ({ ...prev, [field]: isTouched }));
  }, []);
  
  const validateField = useCallback((field) => {
    const rules = schema[field];
    if (!rules) return null;
    
    const error = validateField(values[field], rules);
    setErrors(prev => ({ ...prev, [field]: error }));
    return error;
  }, [values, schema]);
  
  const validateAll = useCallback(() => {
    const { errors: newErrors, isValid } = validateForm(values, schema);
    setErrors(newErrors);
    
    // Mark all fields as touched
    const allTouched = {};
    Object.keys(schema).forEach(field => {
      allTouched[field] = true;
    });
    setTouched(allTouched);
    
    return isValid;
  }, [values, schema]);
  
  const handleSubmit = useCallback(async (onSubmit) => {
    setIsSubmitting(true);
    
    try {
      const isValid = validateAll();
      if (isValid) {
        await onSubmit(values);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validateAll]);
  
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);
  
  const getFieldProps = useCallback((field) => {
    return {
      value: values[field] || '',
      onChange: (e) => {
        const value = e.target ? e.target.value : e;
        setValue(field, value);
      },
      onBlur: () => {
        setFieldTouched(field, true);
        validateField(field);
      },
      error: touched[field] ? errors[field] : null,
      'aria-invalid': touched[field] && errors[field] ? 'true' : 'false',
      'aria-describedby': errors[field] ? `${field}-error` : undefined
    };
  }, [values, errors, touched, setValue, setFieldTouched, validateField]);
  
  return {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setFieldTouched,
    validateField,
    validateAll,
    handleSubmit,
    reset,
    getFieldProps,
    isValid: Object.keys(errors).length === 0
  };
}

/**
 * Mobile-optimized input component with validation
 */
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

export function ValidatedInput({
  label,
  field,
  type = 'text',
  placeholder,
  required = false,
  className = '',
  ...fieldProps
}) {
  const { error, ...inputProps } = fieldProps;
  
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label 
          htmlFor={field}
          className={`text-sm font-medium ${
            required ? "after:content-['*'] after:text-red-500 after:ml-1" : ''
          }`}
        >
          {label}
        </Label>
      )}
      
      <div className="relative">
        <Input
          id={field}
          type={type}
          placeholder={placeholder}
          className={`
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
            min-h-[44px] text-base
          `}
          {...inputProps}
        />
        
        {error && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
        )}
      </div>
      
      {error && (
        <p 
          id={`${field}-error`}
          className="text-sm text-red-600 flex items-center gap-1"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Form validation schema examples
 */
export const commonSchemas = {
  contact: {
    name: [validationRules.required, validationRules.minLength(2)],
    email: [validationRules.required, validationRules.email],
    phone: [validationRules.phone],
    message: [validationRules.required, validationRules.minLength(10)]
  },
  
  search: {
    query: [validationRules.required, validationRules.minLength(2)]
  },
  
  registration: {
    username: [validationRules.required, validationRules.minLength(3), validationRules.maxLength(20)],
    email: [validationRules.required, validationRules.email],
    password: [validationRules.required, validationRules.minLength(8)],
    confirmPassword: [validationRules.required]
  }
};

/**
 * Real-time validation for better UX
 */
export function useRealTimeValidation(field, value, rules, delay = 300) {
  const [error, setError] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  
  useEffect(() => {
    if (!value || !rules) {
      setError(null);
      return;
    }
    
    setIsValidating(true);
    const timer = setTimeout(() => {
      const validationError = validateField(value, rules);
      setError(validationError);
      setIsValidating(false);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [value, rules, delay]);
  
  return { error, isValidating };
}