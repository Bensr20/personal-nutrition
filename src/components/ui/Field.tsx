import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown } from './icons'

interface WrapperProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
  htmlFor?: string
}

function FieldWrapper({ label, hint, error, required, children, htmlFor }: WrapperProps) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1.5">
      {label && (
        <span className="text-caption font-semibold text-ink-700">
          {label} {required && <span className="text-coral-500">*</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="text-caption text-ink-500">{hint}</span>}
      {error && (
        <span className="text-caption font-medium text-coral-600" role="alert">
          {error}
        </span>
      )}
    </label>
  )
}

const baseInputClass =
  'h-12 w-full rounded-control border border-ink-200 bg-white px-4 text-body text-ink-900 placeholder:text-ink-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 disabled:bg-bg disabled:text-ink-400'

type InputProps = InputHTMLAttributes<HTMLInputElement> & Omit<WrapperProps, 'children'>

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, required, id, className = '', ...rest },
  ref,
) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required} htmlFor={id}>
      <input
        ref={ref}
        id={id}
        required={required}
        className={`${baseInputClass} ${error ? 'border-coral-500 focus:ring-coral-500/20 focus:border-coral-500' : ''} ${className}`}
        {...rest}
      />
    </FieldWrapper>
  )
})

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & Omit<WrapperProps, 'children'>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, required, id, className = '', rows = 3, ...rest },
  ref,
) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required} htmlFor={id}>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        required={required}
        className={`${baseInputClass} h-auto min-h-[5.5rem] resize-y py-3 ${error ? 'border-coral-500 focus:ring-coral-500/20 focus:border-coral-500' : ''} ${className}`}
        {...rest}
      />
    </FieldWrapper>
  )
})

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & Omit<WrapperProps, 'children'>

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, required, id, className = '', children, ...rest },
  ref,
) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required} htmlFor={id}>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          required={required}
          className={`${baseInputClass} appearance-none ps-10 ${error ? 'border-coral-500 focus:ring-coral-500/20 focus:border-coral-500' : ''} ${className}`}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" aria-hidden />
      </div>
    </FieldWrapper>
  )
})
