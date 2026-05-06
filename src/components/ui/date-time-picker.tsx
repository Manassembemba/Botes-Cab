import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
}

export function DateTimePicker({ value, onChange, label, error }: DateTimePickerProps) {
  const date = value ? new Date(value) : undefined;
  
  const [hours, setHours] = React.useState(date ? date.getHours().toString().padStart(2, '0') : "12");
  const [minutes, setMinutes] = React.useState(date ? date.getMinutes().toString().padStart(2, '0') : "00");

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      const updatedDate = new Date(newDate);
      updatedDate.setHours(parseInt(hours));
      updatedDate.setMinutes(parseInt(minutes));
      onChange(updatedDate.toISOString().slice(0, 16));
    }
  };

  const handleTimeChange = (type: 'hours' | 'minutes', newValue: string) => {
    if (type === 'hours') setHours(newValue);
    else setMinutes(newValue);

    if (date) {
      const updatedDate = new Date(date);
      if (type === 'hours') updatedDate.setHours(parseInt(newValue));
      else updatedDate.setMinutes(parseInt(newValue));
      onChange(updatedDate.toISOString().slice(0, 16));
    }
  };

  const hoursOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutesOptions = ["00", "15", "30", "45"];

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal h-10",
                !date && "text-muted-foreground",
                error && "border-destructive"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
              {date ? format(date, "PPP", { locale: fr }) : <span>Choisir une date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              initialFocus
              locale={fr}
            />
          </PopoverContent>
        </Popover>

        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 h-10 rounded-md border border-input bg-background">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Select value={hours} onValueChange={(v) => handleTimeChange('hours', v)}>
              <SelectTrigger className="border-none shadow-none focus:ring-0 h-8 p-0 w-12">
                <SelectValue placeholder="HH" />
              </SelectTrigger>
              <SelectContent>
                {hoursOptions.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">:</span>
            <Select value={minutes} onValueChange={(v) => handleTimeChange('minutes', v)}>
              <SelectTrigger className="border-none shadow-none focus:ring-0 h-8 p-0 w-12">
                <SelectValue placeholder="MM" />
              </SelectTrigger>
              <SelectContent>
                {minutesOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      {error && <p className="text-[10px] text-destructive font-medium">{error}</p>}
    </div>
  );
}
