import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Order } from '../../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';
import { format, parseISO, isValid, startOfMonth, startOfDay } from 'date-fns';
import { Calendar, Filter, Tag, ChevronDown, Check, Search, X } from 'lucide-react';

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
const LegendAny = Legend as any;

const COMPARISON_COLORS = [
  '#E07A5F', // Flamingo/Terracotta
  '#3D5A80', // Deep Blue/Ocean
  '#81B29A', // Sage Green
  '#E09F3E', // Amber/Yellow
  '#9A7B56', // Muted Bronze
  '#7209B7', // Purple Accent
];

const getNormalizedProductInfo = (item: { name: string; collection?: string; category?: string; isCheckoutAddon?: boolean }) => {
  const collection = item.collection || '';
  const category = item.category || '';
  let name = item.name.trim();

  // Determine if it is an Add-on product
  const isAddon = Boolean(item.isCheckoutAddon) || 
                  collection.toLowerCase().includes('add-on') || 
                  collection.toLowerCase().includes('addon') || 
                  category.toLowerCase().includes('add-on') || 
                  category.toLowerCase().includes('addon') ||
                  name.toLowerCase().includes('perfume') || 
                  name.toLowerCase().includes('hair oil') || 
                  name.toLowerCase().includes('oil') ||
                  name.toLowerCase().includes('gift box') ||
                  name.toLowerCase().includes('tote');

  if (isAddon) {
    return {
      key: name,
      displayLabel: name,
      group: 'other'
    };
  }

  // Determine if it is a blanket
  const isBlanket = collection === 'Blankets' || 
                    collection.toLowerCase().includes('blanket') ||
                    category.toLowerCase().includes('blanket') ||
                    (!collection && !category && (name.toLowerCase().includes('blanket') || name.toLowerCase().includes('castle') || name.toLowerCase().includes('flight')));

  if (isBlanket) {
    if (name.includes('(Adult)')) {
      const baseName = name.replace('(Adult)', '').trim();
      return {
        key: `${baseName}|Adult|Blankets`,
        displayLabel: `${baseName} (Adult Blanket)`,
        group: 'blanket'
      };
    } else if (name.includes('(Baby)')) {
      const baseName = name.replace('(Baby)', '').trim();
      return {
        key: `${baseName}|Baby|Blankets`,
        displayLabel: `${baseName} (Baby Blanket)`,
        group: 'blanket'
      };
    } else {
      return {
        key: `${name}|Baby|Blankets`,
        displayLabel: `${name} (Baby Blanket)`,
        group: 'blanket'
      };
    }
  }

  // Determine if it is a swaddle
  const isSwaddle = collection === 'Swaddle' || 
                    collection === 'Swaddles' || 
                    collection.toLowerCase().includes('swaddle') ||
                    category.toLowerCase().includes('swaddle');

  if (isSwaddle) {
    const baseName = name.replace('(Swaddle)', '').trim();
    return {
      key: `${baseName}|Swaddle`,
      displayLabel: `${baseName} (Swaddle)`,
      group: 'swaddle'
    };
  }

  // Fallback
  return {
    key: name,
    displayLabel: name,
    group: 'other'
  };
};

export const AnalyticsManager: React.FC<AnalyticsManagerProps> = ({ orders }) => {
  const [filterYear, setFilterYear] = useState<string>('All');
  const [filterMonth, setFilterMonth] = useState<string>('All');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const isAllProducts = selectedProducts.length === 0 || selectedProducts.includes('All');

  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleProductToggle = (key: string) => {
    setSelectedProducts(prev => {
      if (key === 'All') {
        return [];
      }
      const withoutAll = prev.filter(k => k !== 'All');
      if (withoutAll.includes(key)) {
        const next = withoutAll.filter(k => k !== key);
        return next;
      } else {
        return [...withoutAll, key];
      }
    });
  };

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

  const availableProducts = useMemo(() => {
    const itemsMap = new Map<string, { key: string; displayLabel: string; group: string }>();
    orders.forEach(o => {
      if (o.items && Array.isArray(o.items)) {
        o.items.forEach(i => {
          if (i && i.name) {
            const info = getNormalizedProductInfo(i);
            if (!itemsMap.has(info.key)) {
              itemsMap.set(info.key, info);
            }
          }
        });
      }
    });
    return Array.from(itemsMap.values()).sort((a, b) => {
      const weightA = a.group === 'swaddle' ? 1 : a.group === 'blanket' ? 2 : 3;
      const weightB = b.group === 'swaddle' ? 1 : b.group === 'blanket' ? 2 : 3;
      if (weightA !== weightB) {
        return weightA - weightB;
      }
      return a.displayLabel.localeCompare(b.displayLabel);
    });
  }, [orders]);

  const filteredProductsForSelection = useMemo(() => {
    if (!productSearchQuery) return availableProducts;
    const query = productSearchQuery.toLowerCase();
    return availableProducts.filter(p => 
      p.displayLabel.toLowerCase().includes(query) || 
      p.group.toLowerCase().includes(query)
    );
  }, [availableProducts, productSearchQuery]);

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

    const dateDataMap = new Map<string, { total: number; productSales: Record<string, number> }>();
    const topProductsByDate = new Map<string, Map<string, { name: string, qty: number, revenue: number }>>();
    const overallProducts = new Map<string, { name: string, key: string, qty: number, revenue: number }>();
    
    const isDaily = filterYear !== 'All' && filterMonth !== 'All';

    validOrders.forEach(order => {
      if (!order.date) return;
      
      try {
        const d = parseISO(order.date);
        if (!isValid(d)) return;

        let orderTotal = 0;
        let hasMatchingProduct = false;
        const productSalesOnThisOrder: Record<string, number> = {};

        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            if (!item || !item.name) return;
            const info = getNormalizedProductInfo(item);
            
            const isMatched = isAllProducts || selectedProducts.includes(info.key);
            if (!isMatched) return;

            const itemRev = (item.price || 0) * (item.quantity || 0);
            orderTotal += itemRev;
            hasMatchingProduct = true;

            productSalesOnThisOrder[info.key] = (productSalesOnThisOrder[info.key] || 0) + itemRev;
          });
        }

        // If we filter by product and the order doesn't have it, skip
        if (!isAllProducts && !hasMatchingProduct) {
          return;
        }

        // Use actual order total if 'All' products are selected, else use specific product total
        const finalSalesVal = isAllProducts ? (Number(order.total) || 0) : orderTotal;

        const key = isDaily 
          ? format(startOfDay(d), 'yyyy-MM-dd') 
          : format(startOfMonth(d), 'yyyy-MM');

        const existingDateData = dateDataMap.get(key) || { total: 0, productSales: {} };
        existingDateData.total += finalSalesVal;
        
        // Accumulate individual product sales for this date
        Object.entries(productSalesOnThisOrder).forEach(([pKey, pRev]) => {
          existingDateData.productSales[pKey] = (existingDateData.productSales[pKey] || 0) + pRev;
        });
        dateDataMap.set(key, existingDateData);
        
        if (!topProductsByDate.has(key)) {
          topProductsByDate.set(key, new Map());
        }
        const dailyProductsMap = topProductsByDate.get(key)!;

        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            if (!item || !item.name) return;
            const info = getNormalizedProductInfo(item);
            
            const isMatched = isAllProducts || selectedProducts.includes(info.key);
            if (!isMatched) return;
            
            const itemRev = (item.price || 0) * (item.quantity || 0);
            const normalizedName = info.displayLabel;
            
            // Map for the specific date
            const existing = dailyProductsMap.get(normalizedName) || { name: normalizedName, revenue: 0, qty: 0 };
            existing.revenue += itemRev;
            existing.qty += item.quantity || 0;
            dailyProductsMap.set(normalizedName, existing);

            // Map for the overall selected period
            const overallExisting = overallProducts.get(info.key) || { name: normalizedName, key: info.key, revenue: 0, qty: 0 };
            overallExisting.revenue += itemRev;
            overallExisting.qty += item.quantity || 0;
            overallProducts.set(info.key, overallExisting);
          });
        }
        
        totalSales += finalSalesVal;
        totalOrdersCount++;
      } catch (e) {
        // Ignored unparsable dates
      }
    });

    const dataArray = Array.from(dateDataMap.entries())
      .map(([date, val]) => {
        const topProductsMap = topProductsByDate.get(date);
        const topProducts = topProductsMap 
          ? Array.from(topProductsMap.values()).sort((a,b) => b.revenue - a.revenue).slice(0, 3) 
          : [];
        return { 
          date, 
          sales: val.total, 
          topProducts,
          ...val.productSales
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
  }, [orders, filterYear, filterMonth, selectedProducts, isAllProducts]);

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
        <div className="bg-white p-3 border border-brand-latte/50 rounded-[2px] shadow-sm min-w-[200px] max-w-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</p>
          
          {payload.length > 1 ? (
            <div className="space-y-1.5">
              {payload.map((entry: any, index: number) => (
                <div key={index} className="flex justify-between items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
                    <span className="truncate max-w-[150px]" title={entry.name}>{entry.name}</span>
                  </span>
                  <span className="font-bold text-gray-900">RM {entry.value.toLocaleString('en-MY')}</span>
                </div>
              ))}
              <div className="mt-2 pt-2 border-t border-brand-latte/20 flex justify-between items-center text-xs font-bold text-gray-900">
                <span>Total Combined:</span>
                <span>RM {payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0).toLocaleString('en-MY')}</span>
              </div>
            </div>
          ) : (
            <div>
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
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Custom Multi-Product Comparison Dropdown */}
            <div ref={dropdownRef} className="relative flex-1 sm:flex-initial">
              <button
                type="button"
                onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                className="flex justify-between items-center bg-white border border-brand-latte/30 px-4 py-3 rounded-[2px] text-xs font-bold uppercase tracking-widest text-gray-600 w-full sm:w-64 md:w-80 cursor-pointer hover:border-brand-flamingo transition-colors focus:outline-none"
              >
                <span className="truncate mr-2">
                  {isAllProducts 
                    ? "All Products (Total)" 
                    : selectedProducts.length === 1 
                      ? availableProducts.find(p => p.key === selectedProducts[0])?.displayLabel || selectedProducts[0]
                      : `Comparing: ${selectedProducts.length} Products`
                  }
                </span>
                <ChevronDown size={14} className="text-gray-400 shrink-0 transition-transform duration-200" />
              </button>

              {isProductDropdownOpen && (
                <div className="absolute left-0 mt-1 w-full bg-white border border-brand-latte/30 rounded-[2px] shadow-lg z-50 p-4 space-y-3 min-w-[280px]">
                  {/* Search Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search product..."
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="w-full bg-brand-latte/5 border border-brand-latte/20 rounded-[2px] px-3 py-2 pl-8 text-xs font-medium text-gray-700 placeholder-gray-400 focus:outline-none focus:border-brand-flamingo"
                    />
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    {productSearchQuery && (
                      <button 
                        type="button" 
                        onClick={() => setProductSearchQuery('')} 
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Quick Filters */}
                  <div className="flex flex-wrap gap-1.5 pb-2 border-b border-brand-latte/10 text-[9px] font-bold uppercase tracking-wider text-gray-500">
                    <button
                      type="button"
                      onClick={() => setSelectedProducts([])}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-[2px] transition-colors"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const swaddles = availableProducts.filter(p => p.group === 'swaddle').map(p => p.key);
                        setSelectedProducts(swaddles);
                      }}
                      className="px-2 py-1 bg-brand-latte/10 hover:bg-brand-latte/20 text-brand-flamingo rounded-[2px] transition-colors"
                    >
                      Swaddles
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const blankets = availableProducts.filter(p => p.group === 'blanket').map(p => p.key);
                        setSelectedProducts(blankets);
                      }}
                      className="px-2 py-1 bg-brand-latte/10 hover:bg-brand-latte/20 text-brand-flamingo rounded-[2px] transition-colors"
                    >
                      Blankets
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const addons = availableProducts.filter(p => p.group === 'other').map(p => p.key);
                        setSelectedProducts(addons);
                      }}
                      className="px-2 py-1 bg-brand-latte/10 hover:bg-brand-latte/20 text-brand-flamingo rounded-[2px] transition-colors"
                    >
                      Add-ons
                    </button>
                  </div>

                  {/* Scrollable list */}
                  <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {/* All option */}
                    <label className="flex items-center space-x-2.5 p-1.5 hover:bg-gray-50 rounded-[2px] cursor-pointer text-xs font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={isAllProducts}
                        onChange={() => setSelectedProducts([])}
                        className="rounded-[2px] border-gray-300 text-brand-flamingo focus:ring-brand-flamingo/30 w-3.5 h-3.5"
                      />
                      <span>All Products (Total Sales)</span>
                    </label>

                    {filteredProductsForSelection.map(prod => {
                      const isChecked = selectedProducts.includes(prod.key);
                      return (
                        <label 
                          key={prod.key} 
                          className="flex items-center space-x-2.5 p-1.5 hover:bg-gray-50 rounded-[2px] cursor-pointer text-xs font-semibold text-gray-700"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleProductToggle(prod.key)}
                            className="rounded-[2px] border-gray-300 text-brand-flamingo focus:ring-brand-flamingo/30 w-3.5 h-3.5"
                          />
                          <span className="flex-1 truncate">{prod.displayLabel}</span>
                          <span className={`text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-[2px] ${
                            prod.group === 'swaddle' ? 'bg-[#3D5A80]/10 text-[#3D5A80]' :
                            prod.group === 'blanket' ? 'bg-[#E07A5F]/10 text-[#E07A5F]' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {prod.group}
                          </span>
                        </label>
                      );
                    })}

                    {filteredProductsForSelection.length === 0 && (
                      <div className="text-center py-4 text-xs text-gray-400">
                        No products match your search
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

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
                      {!isAllProducts && <LegendAny iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />}
                      {isAllProducts ? (
                        <BarAny dataKey="sales" name="All Sales" fill="#D9C4B8" radius={[2, 2, 0, 0]} />
                      ) : (
                        selectedProducts.map((prodKey, idx) => {
                          const prodInfo = availableProducts.find(p => p.key === prodKey);
                          const color = COMPARISON_COLORS[idx % COMPARISON_COLORS.length];
                          return (
                            <BarAny 
                              key={prodKey} 
                              dataKey={prodKey} 
                              name={prodInfo ? prodInfo.displayLabel : prodKey} 
                              fill={color} 
                              radius={[2, 2, 0, 0]} 
                            />
                          );
                        })
                      )}
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
                      {!isAllProducts && <LegendAny iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />}
                      {isAllProducts ? (
                        <LineAny type="monotone" dataKey="sales" name="All Sales" stroke="#D9C4B8" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                      ) : (
                        selectedProducts.map((prodKey, idx) => {
                          const prodInfo = availableProducts.find(p => p.key === prodKey);
                          const color = COMPARISON_COLORS[idx % COMPARISON_COLORS.length];
                          return (
                            <LineAny 
                              key={prodKey} 
                              type="monotone" 
                              dataKey={prodKey} 
                              name={prodInfo ? prodInfo.displayLabel : prodKey} 
                              stroke={color} 
                              strokeWidth={2} 
                              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} 
                              activeDot={{ r: 6 }} 
                            />
                          );
                        })
                      )}
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
            <h3 className="font-serif text-xl text-gray-900 mb-6">
              {isAllProducts ? 'Top Performing Products' : 'Product Comparison Table'}
            </h3>
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
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {!isAllProducts && (
                            <span 
                              className="w-2.5 h-2.5 rounded-full inline-block shrink-0 animate-pulse" 
                              style={{ 
                                backgroundColor: (() => {
                                  const idx = selectedProducts.indexOf(product.key || '');
                                  return idx !== -1 ? COMPARISON_COLORS[idx % COMPARISON_COLORS.length] : '#D9C4B8';
                                })()
                              }} 
                            />
                          )}
                          <span>{product.name}</span>
                        </div>
                      </td>
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

