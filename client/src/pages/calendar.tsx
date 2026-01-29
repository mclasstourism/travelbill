import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Plane, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { Ticket } from "@shared/schema";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { data: tickets } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  
  const ticketsByDate = useMemo(() => {
    const map = new Map<string, Ticket[]>();
    tickets?.forEach((ticket) => {
      if (ticket.travelDate) {
        const dateKey = ticket.travelDate.split("T")[0];
        const existing = map.get(dateKey) || [];
        existing.push(ticket);
        map.set(dateKey, existing);
      }
    });
    return map;
  }, [tickets]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const today = new Date();
  const isToday = (day: number) => {
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <h1 className="text-xl md:text-2xl font-bold">Booking Calendar</h1>
        <Badge variant="outline" className="text-sm">
          <CalendarIcon className="w-4 h-4 mr-1" />
          Travel Schedule
        </Badge>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 md:gap-4 pb-4">
          <Button variant="outline" size="icon" onClick={prevMonth} data-testid="button-prev-month">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <CardTitle className="text-xl">{monthName}</CardTitle>
          <Button variant="outline" size="icon" onClick={nextMonth} data-testid="button-next-month">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
            {days.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="min-h-24" />;
              }
              const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayTickets = ticketsByDate.get(dateKey) || [];
              
              return (
                <div
                  key={day}
                  className={`min-h-24 p-2 border rounded-md ${
                    isToday(day) ? 'bg-primary/10 border-primary' : 'hover-elevate'
                  }`}
                  data-testid={`calendar-day-${dateKey}`}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday(day) ? 'text-primary' : ''}`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayTickets.slice(0, 3).map((ticket) => (
                      <div
                        key={ticket.id}
                        className="text-xs bg-primary/10 text-primary rounded px-1 py-0.5 truncate flex items-center gap-1"
                        title={`${ticket.passengerName} - ${ticket.route}`}
                      >
                        <Plane className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{ticket.passengerName}</span>
                      </div>
                    ))}
                    {dayTickets.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayTickets.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Flights</CardTitle>
        </CardHeader>
        <CardContent>
          {!tickets || tickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Plane className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No upcoming flights scheduled</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets
                .filter((t) => t.travelDate && new Date(t.travelDate) >= new Date())
                .sort((a, b) => new Date(a.travelDate).getTime() - new Date(b.travelDate).getTime())
                .slice(0, 10)
                .map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-md border hover-elevate"
                    data-testid={`upcoming-ticket-${ticket.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                        <Plane className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{ticket.passengerName}</div>
                        <div className="text-sm text-muted-foreground">{ticket.route}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {new Date(ticket.travelDate).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {ticket.flightNumber} - {ticket.flightTime}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
