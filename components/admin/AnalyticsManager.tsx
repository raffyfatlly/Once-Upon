import React, { useMemo, useState, useEffect } from 'react';
import { Order } from '../../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { format, parseISO, isValid, startOfMonth, startOfDay } from 'date-fns';
import { Calendar, Filter } from 'lucide-react';

interface AnalyticsManagerProps {
  orders: Order[];
}

const ResponsiveContainerAny = ResponsiveContainer as any;
const BarChartAny = BarChart as any;
const BarAny = Bar as any;
const XAxisAny = XAxis as any;
const YAxisAny = YAxis as any;
const CartesianGridAny = CartesianGrid as any;
const TooltipAny = Tooltip as any;
const LineChartAny = LineChart as any;
const LineAny = Line as any;

export const AnalyticsManager: React.FC<AnalyticsManagerProps> = ({ orders }) => {
  const [filterYear, setFilterYear] = useState<string>('All');
  const [filterMonth, setFilterMonth] = useState<string>('All');

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    orders.forEach(o => {
      if (o.date) {
        years.add(o.date.substring(0, 4));
      }
    });
    return Array.from(years).sort().reverse();
  }, [orders]);

  const availableMonths = useMemo(() => {
    if (filterYear === 'All') return [];
    const months = new Set<string>();
    orders.forEach(o => {
      if (o.date && o.date.startsWith(filterYear)) {
        months.add(o.date.substring(5, 7));
      }
    });
    return Array.from(months).sort();
  }, [orders, filterYear]);

  // Reset month when year changes
  useEffect(() => {
    setFilterMonth('All');
  }, [filterYear]);

  const { chartData, chartType, summary } = useMemo(() => {
    // Filter out unpaid/failed
    let validOrders = orders.filter(o => !['failed', 'cancelled'].includes(o.status));

    if (filterYear !== 'All') {
      validOrders = validOrders.filter(o => o.date?.startsWith(filterYear));
    }

    if (filterYear !== 'All' && filterMonth !== 'All') {
      validOrders = validOrders.filter(o => o.date?.startsWith(`${filterYear}-${filterMonth}`));
    }

    let totalSales = 0;
    let totalOrdersCount = 0;

    const map = new Map<string, number>();
    const topProductsByDate = new Map<string, Map<string, { name: string, qty: number, revenue: number }>>();
    const overallProducts = new Map<string, { name: string, qty: number, revenue: number }>();
    
    const isDaily = filterYear !== 'All' && filterMonth !== 'All';

    validOrders.forEach(order => {
      if (!order.date) return;
      
      try {
        const d = parseISO(order.date);
        if (!isValid(d)) return;

        const orderTotal = Number(order.total) || 0;

        const key = isDaily 
          ? format(startOfDay(d), 'yyyy-MM-dd') 
          : format(startOfMonth(d), 'yyyy-MM');

        map.set(key, (map.get(key) || 0) + orderTotal);
        
        if (!topProductsByDate.has(key)) {
          topProductsByDate.set(key, new Map());
        }
        const dailyProductsMap = topProductsByDate.get(key)!;

        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            const itemRev = item.price * item.quantity;
            const normalizedName = item.name.replace(/\s*\(?baby\)?/i, '').trim();
            
            // Map for the specific date
            const existing = dailyProductsMap.get(normalizedName) || { name: normalizedName, revenue: 0, qty: 0 };
            existing.revenue += itemRev;
            existing.qty += item.quantity;
            dailyProductsMap.set(normalizedName, existing);

            // Map for the overall selected period
            const overallExisting = overallProducts.get(normalizedName) || { name: normalizedName, revenue: 0, qty: 0 };
            overallExisting.revenue += itemRev;
            overallExisting.qty += item.quantity;
            overallProducts.set(normalizedName, overallExisting);
          });
        }
        
        totalSales += orderTotal;
        totalOrdersCount++;
      } catch (e) {
        // Ignored unparsable dates
      }
    });

    const dataArray = Array.from(map.entries())
      .map(([date, sales]) => {
        const topProductsMap = topProductsByDate.get(date);
        const topProducts = topProductsMap 
          ? Array.from(topProductsMap.values()).sort((a,b) => b.revenue - a.revenue).slice(0, 3) 
          : [];
        return { 
          date, 
          sales, 
          topProducts
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(item => ({ 
        ...item, 
        displayDate: isDaily 
          ? format(parseISO(item.date), 'MMM dd') 
          : format(parseISO(`${item.date}-01`), 'MMM yyyy') 
      }));

    const topOverallProducts = Array.from(overallProducts.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      chartData: dataArray,
      chartType: isDaily ? 'daily' : 'monthly',
      summary: {
        totalSales,
        totalOrdersCount,
        averageOrderValue: totalOrdersCount > 0 ? totalSales / totalOrdersCount : 0,
        topProducts: topOverallProducts
      }
    };
  }, [orders, filterYear, filterMonth]);

  const monthNames: Record<string, string> = {
    '01': 'January', '02': 'February', '03': 'March', '04': 'April',
    '05': 'May', '06': 'June', '07': 'July', '08': 'August',
    '09': 'September', '10': 'October', '11': 'November', '12': 'December'
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const topProd = data.topProducts && data.topProducts.length > 0 ? data.topProducts[0] : null;
      
      return (
        <div className="bg-white p-3 border border-brand-latte/50 rounded-[2px] shadow-sm min-w-[150px]">
          <p className="text-sm font-bold text-gray-600 mb-2">{label}</p>
          <p className="text-xl font-serif text-gray-900 mb-1">
            RM {payload[0].value.toLocaleString('en-MY')}
          </p>
          {topProd && (
            <div className="mt-3 pt-2 border-t border-brand-latte/30">
              <p className="text-[10px] uppercase tracking-widest font-bold text-brand-flamingo mb-1">Top Product</p>
              <p className="text-xs text-gray-800 font-bold mb-0.5">{topProd.name}</p>
              <p className="text-[10px] text-gray-500">{topProd.qty} sold &bull; RM {topProd.revenue.toLocaleString('en-MY')}</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="font-serif text-2xl md:text-3xl text-gray-900">Analytics Overview</h2>
            <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">Track sales performance and trends</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <select 
                value={filterYear} 
                onChange={(e) => setFilterYear(e.target.value)} 
                className="appearance-none bg-white border border-brand-latte/30 px-4 py-3 pr-10 rounded-[2px] text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-brand-flamingo text-gray-600 w-full sm:w-32"
              >
                <option value="All">All Years</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <Calendar size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            
            <div className="relative">
              <select 
                value={filterMonth} 
                onChange={(e) => setFilterMonth(e.target.value)} 
                disabled={filterYear === 'All'}
                className="appearance-none bg-white border border-brand-latte/30 px-4 py-3 pr-10 rounded-[2px] text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-brand-flamingo disabled:bg-gray-50 disabled:text-gray-400 text-gray-600 w-full sm:w-40"
              >
                <option value="All">All Months</option>
                {availableMonths.map(month => (
                  <option key={month} value={month}>{monthNames[month] || month}</option>
                ))}
              </select>
              <Filter size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-[2px] shadow-sm border border-brand-latte/20 relative overflow-hidden">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Total Valid Sales</h3>
            <p className="font-serif text-2xl text-gray-900">RM {summary.totalSales.toLocaleString('en-MY')}</p>
          </div>
          <div className="bg-white p-5 rounded-[2px] shadow-sm border border-brand-latte/20 relative overflow-hidden">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Total Valid Orders</h3>
            <p className="font-serif text-2xl text-gray-900">{summary.totalOrdersCount}</p>
          </div>
          <div className="bg-white p-5 rounded-[2px] shadow-sm border border-brand-latte/20 relative overflow-hidden">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Average Order Value</h3>
            <p className="font-serif text-2xl text-gray-900">RM {Math.round(summary.averageOrderValue).toLocaleString('en-MY')}</p>
          </div>
          <div className="bg-white p-5 rounded-[2px] shadow-sm border border-brand-latte/20 relative overflow-hidden">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-brand-flamingo mb-1">Top Best Seller</h3>
            {summary.topProducts.length > 0 ? (
              <div>
                <p className="font-serif text-xl sm:text-lg lg:text-xl text-gray-900 line-clamp-1" title={summary.topProducts[0].name}>{summary.topProducts[0].name}</p>
                <p className="text-xs text-gray-500 mt-1">{summary.topProducts[0].qty} sold (RM {summary.topProducts[0].revenue.toLocaleString('en-MY')})</p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-1">No products data</p>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-6 rounded-[2px] shadow-sm border border-brand-latte/20">
            <h3 className="font-serif text-xl text-gray-900 mb-6">
              {chartType === 'daily' ? 'Daily Sales Trend' : 'Monthly Sales Trend'}
            </h3>
            <div className="w-full h-80">
              {chartData.length > 0 ? (
                <ResponsiveContainerAny width="100%" height="100%">
                  {chartType === 'monthly' ? (
                    <BarChartAny data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGridAny strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxisAny dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                      <YAxisAny 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        tickFormatter={(value: number) => `RM ${(value / 1000).toFixed(0)}k`}
                      />
                      <TooltipAny content={<CustomTooltip />} />
                      <BarAny dataKey="sales" fill="#D9C4B8" radius={[2, 2, 0, 0]} />
                    </BarChartAny>
                  ) : (
                    <LineChartAny data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGridAny strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxisAny dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                      <YAxisAny 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        tickFormatter={(value: number) => `RM ${(value / 1000).toFixed(0)}k`}
                      />
                      <TooltipAny content={<CustomTooltip />} />
                      <LineAny type="monotone" dataKey="sales" stroke="#D9C4B8" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                    </LineChartAny>
                  )}
                </ResponsiveContainerAny>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm uppercase tracking-widest font-bold">
                  No data available for selected period
                </div>
              )}
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2px] shadow-sm border border-brand-latte/20">
            <h3 className="font-serif text-xl text-gray-900 mb-6">Top Performing Products</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-brand-latte/10 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Rank</th>
                    <th className="px-4 py-3 font-medium">Product Name</th>
                    <th className="px-4 py-3 font-medium text-right">Quantity Sold</th>
                    <th className="px-4 py-3 font-medium text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.topProducts.map((product, index) => (
                    <tr key={index} className="border-b border-brand-latte/10 last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-400">#{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{product.name}</td>
                      <td className="px-4 py-3 text-right">{product.qty}</td>
                      <td className="px-4 py-3 text-right">RM {product.revenue.toLocaleString('en-MY')}</td>
                    </tr>
                  ))}
                  {summary.topProducts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">
                        No product data available for the selected period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

