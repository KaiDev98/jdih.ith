import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const varianLencana = cva(
  'inline-flex items-center rounded-md px-1.5 py-0.5 text-[0.6875rem] leading-none font-semibold tracking-wide',
  {
    variants: {
      variant: {
        default: 'bg-muted text-muted-foreground',
        admin: 'bg-sky-50 text-sky-700 ring-1 ring-sky-600/15 ring-inset',
        superadmin: 'bg-institusi-50 text-institusi-800 ring-1 ring-institusi-600/20 ring-inset',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof varianLencana>) {
  return <span className={cn(varianLencana({ variant }), className)} {...props} />;
}
