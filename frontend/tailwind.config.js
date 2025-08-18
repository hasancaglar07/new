/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#374151',
            lineHeight: '1.75',
            fontSize: '1.125rem',
            p: {
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
              lineHeight: '1.8',
            },
            h1: {
              fontSize: '2.25rem',
              fontWeight: '800',
              lineHeight: '1.2',
              marginTop: '2rem',
              marginBottom: '1rem',
              color: '#1f2937',
            },
            h2: {
              fontSize: '1.875rem',
              fontWeight: '700',
              lineHeight: '1.3',
              marginTop: '2rem',
              marginBottom: '1rem',
              color: '#1f2937',
            },
            h3: {
              fontSize: '1.5rem',
              fontWeight: '600',
              lineHeight: '1.4',
              marginTop: '1.5rem',
              marginBottom: '0.75rem',
              color: '#374151',
            },
            h4: {
              fontSize: '1.25rem',
              fontWeight: '600',
              lineHeight: '1.5',
              marginTop: '1.5rem',
              marginBottom: '0.5rem',
              color: '#374151',
            },
            strong: {
              fontWeight: '600',
              color: '#1f2937',
            },
            em: {
              fontStyle: 'italic',
              color: '#6b7280',
            },
            blockquote: {
              borderLeftWidth: '4px',
              borderLeftColor: '#10b981',
              backgroundColor: '#f0fdf4',
              paddingLeft: '1.5rem',
              paddingTop: '1rem',
              paddingBottom: '1rem',
              marginTop: '2rem',
              marginBottom: '2rem',
              borderRadius: '0 0.5rem 0.5rem 0',
              fontStyle: 'italic',
            },
            ul: {
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
              paddingLeft: '1.5rem',
            },
            ol: {
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
              paddingLeft: '1.5rem',
            },
            li: {
              marginTop: '0.5rem',
              marginBottom: '0.5rem',
              lineHeight: '1.7',
            },
            'li > p': {
              marginTop: '0.5rem',
              marginBottom: '0.5rem',
            },
            a: {
              color: '#059669',
              textDecoration: 'none',
              fontWeight: '500',
              '&:hover': {
                color: '#047857',
                textDecoration: 'underline',
              },
            },
            code: {
              color: '#059669',
              backgroundColor: '#f0fdf4',
              paddingLeft: '0.5rem',
              paddingRight: '0.5rem',
              paddingTop: '0.25rem',
              paddingBottom: '0.25rem',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
            },
            pre: {
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '0.5rem',
              padding: '1rem',
              marginTop: '1.5rem',
              marginBottom: '1.5rem',
              overflow: 'auto',
            },
            hr: {
              borderColor: '#d1fae5',
              marginTop: '3rem',
              marginBottom: '3rem',
            },
            table: {
              marginTop: '2rem',
              marginBottom: '2rem',
              width: '100%',
              borderCollapse: 'collapse',
            },
            thead: {
              backgroundColor: '#f0fdf4',
            },
            th: {
              color: '#059669',
              fontWeight: '600',
              padding: '0.75rem',
              textAlign: 'left',
              borderBottom: '1px solid #d1fae5',
            },
            td: {
              padding: '0.75rem',
              borderBottom: '1px solid #e5e7eb',
            },
          },
        },
        lg: {
          css: {
            fontSize: '1.25rem',
            lineHeight: '1.8',
            p: {
              marginTop: '1.75rem',
              marginBottom: '1.75rem',
            },
            h1: {
              fontSize: '2.5rem',
            },
            h2: {
              fontSize: '2rem',
            },
            h3: {
              fontSize: '1.75rem',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}