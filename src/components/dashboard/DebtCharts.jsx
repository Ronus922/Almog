import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = {
  ranges: ['#22c55e', '#eab308', '#f97316', '#ef4444'],
  types: ['#3b82f6', '#a855f7'],
  statuses: ['#22c55e', '#eab308', '#f97316', '#6b7280', '#ef4444', '#3b82f6']
};

export default function DebtCharts({ records }) {
  // התפלגות חוב לפי טווחים
  const debtRanges = [
    { name: '0-500', min: 0, max: 500 },
    { name: '500-1,000', min: 500, max: 1000 },
    { name: '1,000-5,000', min: 1000, max: 5000 },
    { name: '5,000+', min: 5000, max: Infinity }
  ];

  const rangeData = debtRanges.map(range => ({
    name: range.name,
    count: records.filter(r => {
      const debt = r.totalDebt || 0;
      return debt >= range.min && debt < range.max;
    }).length
  }));

  // חלוקת חוב לפי סוג
  const totalMonthly = records.reduce((sum, r) => sum + (r.monthlyDebt || 0), 0);
  const totalSpecial = records.reduce((sum, r) => sum + (r.specialDebt || 0), 0);
  
  const typeData = [
    { name: 'חוב חודשי', value: totalMonthly },
    { name: 'חוב מיוחד', value: totalSpecial }
  ].filter(d => d.value > 0);

  // מספר דירות לפי סטטוס
  const statusOrder = ['סדיר', 'חייב', 'חייב משמעותי', 'מועמד לתביעה', 'בתביעה', 'בהסדר'];
  const statusData = statusOrder.map((status, idx) => ({
    name: status,
    count: records.filter(r => r.status === status).length,
    fill: COLORS.statuses[idx]
  }));

  const formatCurrency = (value) => 
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* גרף עמודות - טווחי חוב */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-700">התפלגות חוב לפי טווח</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rangeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
                <Tooltip 
                  formatter={(value) => [`${value} דירות`, 'מספר']}
                  contentStyle={{ direction: 'rtl', textAlign: 'right' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {rangeData.map((entry, index) => (
                    <Cell key={index} fill={COLORS.ranges[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* גרף עוגה - סוגי חוב */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-700">חלוקת חוב לפי סוג</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {typeData.map((entry, index) => (
                    <Cell key={index} fill={COLORS.types[index]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ direction: 'rtl', textAlign: 'right' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* גרף עמודות - סטטוסים */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-700">דירות לפי סטטוס</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value) => [`${value} דירות`, 'מספר']}
                  contentStyle={{ direction: 'rtl', textAlign: 'right' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}