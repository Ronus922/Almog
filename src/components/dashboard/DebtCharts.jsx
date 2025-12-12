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

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-slate-200 rounded shadow-sm" dir="rtl">
          <p className="text-xs font-medium">{payload[0].name}</p>
          <p className="text-xs text-slate-600">{payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* גרף עמודות - טווחי חוב */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-700">התפלגות חוב לפי טווח</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rangeData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  content={({ payload }) => (
                    <div className="flex flex-wrap justify-center gap-3 mt-2" dir="rtl">
                      {payload.map((entry, index) => (
                        <div key={index} className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.ranges[index] }} />
                          <span className="text-xs text-slate-600">{rangeData[index]?.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
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
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                  label={false}
                >
                  {typeData.map((entry, index) => (
                    <Cell key={index} fill={COLORS.types[index]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ direction: 'rtl', textAlign: 'right' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  content={({ payload }) => (
                    <div className="flex flex-wrap justify-center gap-4 mt-2" dir="rtl">
                      {typeData.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.types[index] }} />
                          <span className="text-xs text-slate-700 font-medium">{entry.name}</span>
                          <span className="text-xs text-slate-500">({formatCurrency(entry.value)})</span>
                        </div>
                      ))}
                    </div>
                  )}
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
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tick={false}
                  height={10}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={60}
                  content={({ payload }) => (
                    <div className="grid grid-cols-2 gap-2 mt-2" dir="rtl">
                      {statusData.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: entry.fill }} />
                          <span className="text-xs text-slate-700">{entry.name}</span>
                          <span className="text-xs text-slate-500">({entry.count})</span>
                        </div>
                      ))}
                    </div>
                  )}
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