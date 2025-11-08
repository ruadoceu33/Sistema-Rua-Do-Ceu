import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
}

/**
 * Converte Date para string YYYY-MM-DD sem conversão de timezone.
 * Evita o bug onde selecionar dia 4 resulta em dia 3 devido ao offset UTC.
 */
export function dateToLocalISOString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converte string YYYY-MM-DD para Date local sem problemas de timezone.
 * Evita que "2017-06-04" seja interpretado como UTC e vire dia 3 no Brasil.
 */
export function stringToLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // Mês é 0-indexed
}

export function DatePicker({ date, onDateChange, placeholder = "Selecione uma data", disabled }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            "h-10 px-3"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">
            {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        sideOffset={4}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          initialFocus
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  )
}
