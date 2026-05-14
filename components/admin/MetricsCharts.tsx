'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, BarChart, Bar, CartesianGrid } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function MetricsCharts({
  ticketsByDay,
  convosByDay,
}: {
  ticketsByDay: Array<{ day: string; human: number; ai: number }>;
  convosByDay: Array<{ day: string; total: number; resolved_by_ai: number; cost_cents: number }>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Tickets created by day</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={ticketsByDay}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="day" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar dataKey="ai" stackId="x" fill="#fa991d" name="AI-deflected → ticketed" />
              <Bar dataKey="human" stackId="x" fill="#2c79a8" name="Direct" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>AI conversations & deflection</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={convosByDay}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="day" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Line dataKey="total" stroke="#2c79a8" name="Conversations" />
              <Line dataKey="resolved_by_ai" stroke="#16a34a" name="Resolved by AI" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
