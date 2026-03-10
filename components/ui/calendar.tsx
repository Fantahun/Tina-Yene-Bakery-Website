'use client'

import * as React from 'react'
import { DayPicker } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col gap-4 sm:flex-row sm:gap-6',
        month: 'space-y-4',
        month_caption: 'relative flex min-h-10 items-center justify-center px-12 pt-2',
        caption_label: 'text-sm font-medium',
        nav: 'absolute inset-x-2 top-2 z-10 flex items-center justify-between sm:inset-x-3',
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'pointer-events-auto h-8 w-8 bg-background p-0 opacity-70 hover:opacity-100',
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'pointer-events-auto h-8 w-8 bg-background p-0 opacity-70 hover:opacity-100',
        ),
        month_grid: 'mt-2 w-full border-collapse',
        weekdays: 'flex',
        weekday:
          'w-9 text-center text-[0.8rem] font-medium text-muted-foreground',
        week: 'mt-2 flex w-full',
        day: 'h-9 w-9 p-0 text-center text-sm',
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
        ),
        selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        today: 'bg-accent text-accent-foreground',
        outside:
          'text-muted-foreground opacity-50 aria-selected:bg-accent aria-selected:text-muted-foreground aria-selected:opacity-100',
        disabled: 'text-muted-foreground opacity-40',
        range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
        hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
