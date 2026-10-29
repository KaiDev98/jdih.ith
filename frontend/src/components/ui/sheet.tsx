'use client';

import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;
export const SheetTitle = SheetPrimitive.Title;
export const SheetDescription = SheetPrimitive.Description;

/** Panel geser; navigasi memakai sisi kiri, notifikasi memakai sisi kanan. */
export function SheetContent({
  className,
  kelasTutup,
  side = 'left',
  children,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  /** Kelas tambahan tombol tutup, mis. warna terang di atas latar gelap. */
  kelasTutup?: string;
  side?: 'left' | 'right';
}) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="ui-overlay ui-dialog-backdrop fixed inset-0 z-50" />
      <SheetPrimitive.Content
        className={cn(
          'fixed inset-y-0 z-50 flex h-full w-[min(18rem,85vw)] flex-col border-border bg-background outline-none',
          side === 'right' ? 'ui-sheet-kanan right-0 border-l' : 'ui-sheet-kiri left-0 border-r',
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          className={cn(
            'absolute top-3.5 right-3 grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            kelasTutup,
          )}
        >
          <X className="size-4" />
          <span className="sr-only">Tutup menu</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}
