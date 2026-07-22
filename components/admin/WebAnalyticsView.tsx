import React, { useState, useEffect, useMemo } from 'react';
import { Order } from '../../types';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend
} from 'recharts';
import { 
  format, subDays, parseISO, isValid, startOfDay, isBefore, isAfter, subMonths 
} from 'date-fns';
import { 
  TrendingUp, Users, ShoppingCart, DollarSign, Award, ChevronDown, 
  Filter, RefreshCw, Layers, Sparkles, CheckCircle, AlertTriangle, 
  HelpCircle, Calendar 
} from 'lucide-react';

interface WebAnalyticsViewProps {
  orders: Order[];
}

interface AnalyticsEventDoc {
  visitorId: string;
  sessionId: string;
  timestamp: string;
  type: 'session_start' | 'view_item' | 'add_to_cart' | 'begin_checkout' | 'purchase';
  first_utm_source: string;
  first_utm_medium: string;
  first_utm_campaign: string;
  first_referrer: string;
  current_utm_source?: string;
  current_utm_medium?: string;
  current_utm_campaign?: string;
  productId?: string;
  productName?: string;
  price?: number;
  quantity?: number;
  value?: number;
  orderId?: string;
  isReturning: boolean;
}

export const WebAnalyticsView: React.FC<WebAnalyticsViewProps> = ({ orders }) => {
  const [dateFilterType, setDateFilterType] = useState<'today' | '7days' | '30days' | 'custom'>('30days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [groupMode, setGroupMode] = useState<'source' | 'campaign'>('source');

  const [events, setEvents] = useState<AnalyticsEventDoc[]>([]);
  const [earliestTrackedDate, setEarliestTrackedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Compute precise start and end dates for client-side filtering
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (dateFilterType === 'today') {
      start = startOfDay(now);
      end = now;
    } else if (dateFilterType === '7days') {
      start = startOfDay(subDays(now, 6));
      end = now;
    } else if (dateFilterType === '30days') {
      start = startOfDay(subDays(now, 29));
      end = now;
    } else if (dateFilterType === 'custom') {
      start = customStartDate ? startOfDay(parseISO(customStartDate)) : startOfDay(subDays(now, 30));
      end = customEndDate ? new Date(parseISO(customEndDate) + 'T23:59:59') : now;
    }

    return { startDate: start, endDate: end };
  }, [dateFilterType, customStartDate, customEndDate]);

  // Determine query cutoff date to optimize Firestore reads
  const queryCutoffIso = useMemo(() => {
    const now = new Date();
    if (dateFilterType === 'today') {
      return subDays(now, 1).toISOString();
    } else if (dateFilterType === '7days') {
      return subDays(now, 7).toISOString();
    } else if (dateFilterType === '30days') {
      return subDays(now, 30).toISOString();
    } else if (dateFilterType === 'custom') {
      if (customStartDate) {
        return startOfDay(parseISO(customStartDate)).toISOString();
      }
      return subDays(now, 30).toISOString();
    }
    return subDays(now, 30).toISOString();
  }, [dateFilterType, customStartDate]);

  // Fetch events newer than the query cutoff
  useEffect(() => {
    let active = true;
    const fetchEvents = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!db) {
          throw new Error("Firestore database is not connected.");
        }

        const eventsRef = collection(db, 'analytics_events');

        // Query oldest event globally to check when tracking commenced
        const qOldest = query(eventsRef, orderBy('timestamp', 'asc'), limit(1));
        const oldestSnapshot = await getDocs(qOldest);
        if (active && !oldestSnapshot.empty) {
          const oldestDoc = oldestSnapshot.docs[0].data();
          if (oldestDoc.timestamp) {
            setEarliestTrackedDate(new Date(oldestDoc.timestamp));
          }
        }
        
        // Query events from query cutoff onwards
        const q = query(
          eventsRef,
          where('timestamp', '>=', queryCutoffIso)
        );

        const snapshot = await getDocs(q);
        if (!active) return;

        const fetchedEvents: AnalyticsEventDoc[] = [];
        snapshot.forEach(doc => {
          fetchedEvents.push({ id: doc.id, ...doc.data() } as any);
        });

        // Sort events chronologically
        fetchedEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        setEvents(fetchedEvents);
      } catch (err: any) {
        console.error("Failed to load analytics events:", err);
        setError(err.message || "Failed to load analytics records.");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchEvents();
    return () => {
      active = false;
    };
  }, [queryCutoffIso, refreshTrigger]);

  // Main aggregated stats memo
  const stats = useMemo(() => {
    // Determine whether the selected reporting window begins before tracking commenced
    const isCalibrated = earliestTrackedDate ? startDate < earliestTrackedDate : false;
    const effectiveStartDate = earliestTrackedDate && startDate < earliestTrackedDate
      ? earliestTrackedDate
      : startDate;

    // Define valid paid sale statuses (aligned with SalesManager)
    const isPaidOrder = (status: string) => ['paid', 'packed', 'shipped', 'delivered'].includes(status);

    // 1. FILTER EVENTS AND ORDERS BASED ON TIMEFRAME
    const filteredEvents = events.filter(evt => {
      const t = new Date(evt.timestamp);
      return t >= startDate && t <= endDate;
    });

    // Orders in the user's selected date range (startDate to endDate)
    const rawFilteredOrders = orders.filter(o => {
      const t = new Date(o.date);
      return t >= startDate && t <= endDate;
    });

    const rawPaidOrders = rawFilteredOrders.filter(o => isPaidOrder(o.status));
    const rawPaidOrdersCount = rawPaidOrders.length;
    const rawPaidRevenue = rawPaidOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    // Calibrated orders align with the active visitor tracking period for mathematical conversion accuracy
    const calibratedOrders = orders.filter(o => {
      const t = new Date(o.date);
      return t >= effectiveStartDate && t <= endDate && isPaidOrder(o.status);
    });
    const calibratedPurchasesCount = calibratedOrders.length;

    // 2. BUILD VISITOR AND ORDER ATTRIBUTIONS
    // Build overall persistent visitor attribution mapping based on all fetched events
    const visitorUtmMap = new Map<string, { source: string; medium: string; campaign: string }>();
    events.forEach(evt => {
      if (evt.visitorId) {
        const src = evt.current_utm_source || evt.first_utm_source;
        const med = evt.current_utm_medium || evt.first_utm_medium;
        const camp = evt.current_utm_campaign || evt.first_utm_campaign;
        if (src) {
          visitorUtmMap.set(evt.visitorId, {
            source: src,
            medium: med || 'none',
            campaign: camp || 'none'
          });
        }
      }
    });

    // Build overall order attribution mapping based on purchase events (all events for safety)
    const orderAttributionMap = new Map<string, { source: string; medium: string; campaign: string }>();
    events.forEach(evt => {
      if (evt.type === 'purchase' && evt.orderId) {
        orderAttributionMap.set(evt.orderId, {
          source: evt.first_utm_source || 'direct',
          medium: evt.first_utm_medium || 'none',
          campaign: evt.first_utm_campaign || 'none'
        });
      }
    });

    // 3. INITIALIZE INTERMEDIATE AGGREGATORS
    const uniqueSessions = new Set<string>();
    const uniqueVisitors = new Set<string>();
    // Session-level visitor classification: maps sessionId -> 'new' | 'returning'
    const sessionVisitorTypeMap = new Map<string, 'new' | 'returning'>();

    let sessionStarts = 0;
    const productViewSessions = new Set<string>();
    const addToCartSessions = new Set<string>();
    const beginCheckoutSessions = new Set<string>();
    const purchaseSessions = new Set<string>();

    const productViewsMap = new Map<string, { id: string; name: string; views: number; additions: number; sales: number; revenue: number }>();
    const dailyTrendMap = new Map<string, { date: string; displayDate: string; visitors: Set<string>; views: number; addToCarts: number; checkouts: number; purchases: number; revenue: number }>();

    // Prepare date range keys for daily trends dynamically
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i <= Math.min(diffDays, 365); i++) {
      const d = subDays(endDate, i);
      const dateKey = format(d, 'yyyy-MM-dd');
      const displayDate = format(d, 'MMM dd');
      dailyTrendMap.set(dateKey, {
        date: dateKey,
        displayDate,
        visitors: new Set<string>(),
        views: 0,
        addToCarts: 0,
        checkouts: 0,
        purchases: 0,
        revenue: 0
      });
    }

    // 4. PROCESS ANALYTICS EVENTS FOR OVERVIEW AND GRAPHS
    filteredEvents.forEach(evt => {
      const { visitorId, sessionId, type, timestamp, isReturning } = evt;
      if (!sessionId || !visitorId) return;

      uniqueSessions.add(sessionId);
      uniqueVisitors.add(visitorId);

      // Classify session: If any event in the session has isReturning === false, this session belongs to a new visitor
      if (!sessionVisitorTypeMap.has(sessionId)) {
        sessionVisitorTypeMap.set(sessionId, isReturning ? 'returning' : 'new');
      } else if (!isReturning) {
        sessionVisitorTypeMap.set(sessionId, 'new');
      }

      // Trend mapping
      const eventDate = timestamp.substring(0, 10);
      if (dailyTrendMap.has(eventDate)) {
        dailyTrendMap.get(eventDate)!.visitors.add(visitorId);
      }

      // Funnel & Product aggregations
      if (type === 'session_start') {
        sessionStarts++;
      } else if (type === 'view_item') {
        productViewSessions.add(sessionId);
        
        const prodId = evt.productId || 'unknown';
        const prodName = evt.productName || 'Unknown Product';
        if (!productViewsMap.has(prodId)) {
          productViewsMap.set(prodId, { id: prodId, name: prodName, views: 0, additions: 0, sales: 0, revenue: 0 });
        }
        productViewsMap.get(prodId)!.views++;

        if (dailyTrendMap.has(eventDate)) {
          dailyTrendMap.get(eventDate)!.views++;
        }
      } else if (type === 'add_to_cart') {
        addToCartSessions.add(sessionId);

        const prodId = evt.productId || 'unknown';
        const prodName = evt.productName || 'Unknown Product';
        if (!productViewsMap.has(prodId)) {
          productViewsMap.set(prodId, { id: prodId, name: prodName, views: 0, additions: 0, sales: 0, revenue: 0 });
        }
        productViewsMap.get(prodId)!.additions += evt.quantity || 1;

        if (dailyTrendMap.has(eventDate)) {
          dailyTrendMap.get(eventDate)!.addToCarts++;
        }
      } else if (type === 'begin_checkout') {
        beginCheckoutSessions.add(sessionId);

        if (dailyTrendMap.has(eventDate)) {
          dailyTrendMap.get(eventDate)!.checkouts++;
        }
      } else if (type === 'purchase') {
        purchaseSessions.add(sessionId);

        if (dailyTrendMap.has(eventDate)) {
          dailyTrendMap.get(eventDate)!.purchases++;
          dailyTrendMap.get(eventDate)!.revenue += evt.value || 0;
        }
      }
    });

    // 5. PROCESS TRAFFIC-SOURCE UTM AGGREGATION
    interface UtmGroup {
      source: string;
      medium: string;
      campaign: string;
      visitors: Set<string>;
      addToCarts: Set<string>;
      purchases: number;
      revenue: number;
    }
    const utmGroupMap = new Map<string, UtmGroup>();

    // Aggregate visitors and cart additions from filtered events
    filteredEvents.forEach(evt => {
      if (!evt.visitorId) return;

      // Identify first-touch attribution parameters
      const utm = visitorUtmMap.get(evt.visitorId) || {
        source: evt.first_utm_source || 'direct',
        medium: evt.first_utm_medium || 'none',
        campaign: evt.first_utm_campaign || 'none'
      };

      const src = (utm.source || 'direct').toLowerCase();
      const med = (utm.medium || 'none').toLowerCase();
      const camp = (utm.campaign || 'none').toLowerCase();

      // Form group key depending on selected group mode
      const key = groupMode === 'source' ? src : `${src}|${med}|${camp}`;

      if (!utmGroupMap.has(key)) {
        utmGroupMap.set(key, {
          source: utm.source || 'direct',
          medium: groupMode === 'source' ? 'multiple' : (utm.medium || 'none'),
          campaign: groupMode === 'source' ? 'multiple' : (utm.campaign || 'none'),
          visitors: new Set<string>(),
          addToCarts: new Set<string>(),
          purchases: 0,
          revenue: 0
        });
      }

      const g = utmGroupMap.get(key)!;
      g.visitors.add(evt.visitorId);
      
      if (evt.type === 'add_to_cart') {
        g.addToCarts.add(evt.visitorId);
      }
    });

    // Aggregate purchases and revenue FROM LIVE ORDERS for 100% financial consistency
    rawPaidOrders.forEach(o => {
      // Identify order attribution
      let utm = orderAttributionMap.get(o.id);
      if (!utm) {
        if (o.source === 'pos') {
          utm = { source: 'pos', medium: 'pos', campaign: 'pos' };
        } else {
          utm = { source: 'direct', medium: 'none', campaign: 'none' };
        }
      }

      const src = utm.source.toLowerCase();
      const med = utm.medium.toLowerCase();
      const camp = utm.campaign.toLowerCase();

      const key = groupMode === 'source' ? src : `${src}|${med}|${camp}`;

      if (!utmGroupMap.has(key)) {
        utmGroupMap.set(key, {
          source: utm.source,
          medium: groupMode === 'source' ? 'multiple' : utm.medium,
          campaign: groupMode === 'source' ? 'multiple' : utm.campaign,
          visitors: new Set<string>(),
          addToCarts: new Set<string>(),
          purchases: 0,
          revenue: 0
        });
      }

      const g = utmGroupMap.get(key)!;
      g.purchases += 1;
      g.revenue += Number(o.total) || 0;
    });

    // Compile UTM data array and sort by revenue (highest first)
    const utmList = Array.from(utmGroupMap.values()).map(g => {
      const vCount = g.visitors.size;
      const convRate = vCount > 0 ? (g.purchases / vCount) * 100 : 0;
      return {
        source: g.source,
        medium: g.medium,
        campaign: g.campaign,
        visitors: vCount,
        addToCarts: g.addToCarts.size,
        purchases: g.purchases,
        revenue: g.revenue,
        conversionRate: convRate
      };
    }).sort((a, b) => b.revenue - a.revenue || b.visitors - a.visitors);

    // Identify winners and low-yield groups
    let bestRevenue = 0;
    let worstConversion = 100;
    let winnerKey = '';
    let loserKey = '';

    utmList.forEach((item, idx) => {
      const key = `${item.source}|${item.medium}|${item.campaign}`;
      if (item.revenue > bestRevenue) {
        bestRevenue = item.revenue;
        winnerKey = key;
      }
      
      // Look for non-performing or low-conversion sources that have significant traffic
      if (item.visitors >= 5 && item.conversionRate < worstConversion) {
        worstConversion = item.conversionRate;
        loserKey = key;
      }
    });

    // Fallback if no conversion loser found
    if (!loserKey && utmList.length > 1) {
      const lowestRev = utmList[utmList.length - 1];
      if (lowestRev.visitors > 0) {
        loserKey = `${lowestRev.source}|${lowestRev.medium}|${lowestRev.campaign}`;
      }
    }

    // 5.5. COMPILE AMBASSADOR-SPECIFIC CAMPAIGN METRICS
    interface AmbassadorStats {
      campaign: string;
      name: string;
      platform: string;
      visitors: Set<string>;
      addToCarts: Set<string>;
      purchases: number;
      revenue: number;
    }
    const ambassadorsMap = new Map<string, AmbassadorStats>();

    const formatAmbassadorName = (camp: string) => {
      let namePart = camp;
      if (camp.toLowerCase().startsWith('amb-')) {
        namePart = camp.substring(4);
      }
      return namePart
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    filteredEvents.forEach(evt => {
      const utm = visitorUtmMap.get(evt.visitorId || '');
      if (!utm) return;

      const isAmb = (utm.source || '').toLowerCase() === 'ambassador' || (utm.campaign || '').toLowerCase().startsWith('amb-');
      if (!isAmb) return;

      const camp = utm.campaign || 'unknown-ambassador';
      const med = utm.medium || 'instagram';

      if (!ambassadorsMap.has(camp)) {
        ambassadorsMap.set(camp, {
          campaign: camp,
          name: formatAmbassadorName(camp),
          platform: med,
          visitors: new Set<string>(),
          addToCarts: new Set<string>(),
          purchases: 0,
          revenue: 0
        });
      }

      const amb = ambassadorsMap.get(camp)!;
      if (evt.visitorId) {
        amb.visitors.add(evt.visitorId);
      }
      if (evt.type === 'add_to_cart') {
        if (evt.visitorId) {
          amb.addToCarts.add(evt.visitorId);
        }
      }
    });

    rawPaidOrders.forEach(o => {
      let utm = orderAttributionMap.get(o.id);
      if (!utm) return;

      const isAmb = utm.source.toLowerCase() === 'ambassador' || utm.campaign.toLowerCase().startsWith('amb-');
      if (!isAmb) return;

      const camp = utm.campaign;
      const med = utm.medium;

      if (!ambassadorsMap.has(camp)) {
        ambassadorsMap.set(camp, {
          campaign: camp,
          name: formatAmbassadorName(camp),
          platform: med,
          visitors: new Set<string>(),
          addToCarts: new Set<string>(),
          purchases: 0,
          revenue: 0
        });
      }

      const amb = ambassadorsMap.get(camp)!;
      amb.purchases += 1;
      amb.revenue += Number(o.total) || 0;
    });

    const ambassadorsList = Array.from(ambassadorsMap.values()).map(amb => {
      const vCount = amb.visitors.size;
      const convRate = vCount > 0 ? (amb.purchases / vCount) * 100 : 0;
      return {
        campaign: amb.campaign,
        name: amb.name,
        platform: amb.platform,
        visitors: vCount,
        addToCarts: amb.addToCarts.size,
        purchases: amb.purchases,
        revenue: amb.revenue,
        conversionRate: convRate
      };
    }).sort((a, b) => b.revenue - a.revenue || b.visitors - a.visitors);

    // 6. COMPILE PRODUCT VIEWS VS SALES
    rawPaidOrders.forEach(o => {
      if (o.items) {
        o.items.forEach(item => {
          const baseId = item.baseProductId || item.id;
          if (productViewsMap.has(baseId)) {
            productViewsMap.get(baseId)!.sales += item.quantity || 1;
            productViewsMap.get(baseId)!.revenue += (item.price || 0) * (item.quantity || 1);
          } else {
            productViewsMap.set(baseId, {
              id: baseId,
              name: item.name,
              views: 0,
              additions: 0,
              sales: item.quantity || 1,
              revenue: (item.price || 0) * (item.quantity || 1)
            });
          }
        });
      }
    });

    const productsList = Array.from(productViewsMap.values()).sort((a, b) => b.views - a.views || b.sales - a.sales);

    // 7. COMPUTE LOYALTY AND RETURNING SEGMENTS
    const emailOrderCounts: Record<string, number> = {};

    rawPaidOrders.forEach(o => {
      if (o.customerEmail) {
        const email = o.customerEmail.toLowerCase().trim();
        emailOrderCounts[email] = (emailOrderCounts[email] || 0) + 1;
      }
    });

    const uniqueEmails = Object.keys(emailOrderCounts);
    const repeatBuyersCount = uniqueEmails.filter(email => emailOrderCounts[email] >= 2).length;
    const repeatPurchaseRate = uniqueEmails.length > 0 
      ? (repeatBuyersCount / uniqueEmails.length) * 100 
      : 0;

    // Direct store sales for daily trend graph (override/sync with actual live paid orders)
    dailyTrendMap.forEach(v => {
      v.purchases = 0;
      v.revenue = 0;
    });

    rawPaidOrders.forEach(o => {
      const orderDateKey = format(new Date(o.date), 'yyyy-MM-dd');
      if (dailyTrendMap.has(orderDateKey)) {
        const dayTrend = dailyTrendMap.get(orderDateKey)!;
        dayTrend.purchases += 1;
        dayTrend.revenue += Number(o.total) || 0;
      }
    });

    // Compile trend charts data chronologically
    const trendData = Array.from(dailyTrendMap.values()).map(item => ({
      ...item,
      visitors: item.visitors.size
    })).reverse(); // show oldest to newest left-to-right

    const funnelVisitors = uniqueVisitors.size;
    const funnelViews = productViewSessions.size;
    const funnelCarts = addToCartSessions.size;
    const funnelCheckouts = beginCheckoutSessions.size;
    const funnelPurchases = isCalibrated ? calibratedPurchasesCount : rawPaidOrdersCount;

    const conversionRate = funnelVisitors > 0 ? (funnelPurchases / funnelVisitors) * 100 : 0;
    const averageOrderValue = rawPaidOrdersCount > 0 ? rawPaidRevenue / rawPaidOrdersCount : 0;
    const cartAbandonmentRate = funnelCarts > 0 ? ((funnelCarts - funnelPurchases) / funnelCarts) * 100 : 0;

    let newVisitorSessionsCount = 0;
    let returningVisitorSessionsCount = 0;
    sessionVisitorTypeMap.forEach(type => {
      if (type === 'new') {
        newVisitorSessionsCount++;
      } else {
        returningVisitorSessionsCount++;
      }
    });

    const totalSessionsCount = uniqueSessions.size;
    const newVisitorsPercent = totalSessionsCount > 0 
      ? (newVisitorSessionsCount / totalSessionsCount) * 100 
      : 0;
    const returningPercent = totalSessionsCount > 0 
      ? (returningVisitorSessionsCount / totalSessionsCount) * 100 
      : 0;

    return {
      isCalibrated,
      earliestTrackedDate,
      rawPaidOrdersCount,
      rawPaidRevenue,
      totalSessions: uniqueSessions.size,
      totalVisitorsCount: funnelVisitors,
      newVisitorSessionsCount,
      returningVisitorSessionsCount,
      funnel: {
        visitors: funnelVisitors,
        views: funnelViews,
        carts: funnelCarts,
        checkouts: funnelCheckouts,
        purchases: funnelPurchases,
      },
      conversionRate,
      averageOrderValue,
      cartAbandonmentRate,
      repeatPurchaseRate,
      newVisitorsPercent,
      returningPercent,
      utmList,
      ambassadorsList,
      winnerKey,
      loserKey,
      productsList,
      trendData
    };
  }, [events, orders, dateFilterType, customStartDate, customEndDate, groupMode, earliestTrackedDate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white border border-brand-latte/20 rounded-[2px] shadow-sm">
        <RefreshCw size={32} className="text-brand-flamingo animate-spin mb-4" />
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Loading Traffic Data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-[2px] flex flex-col items-center">
        <h3 className="font-serif text-lg mb-2">Could Not Retrieve Analytics Events</h3>
        <p className="text-xs max-w-md text-center font-light leading-relaxed mb-4">{error}</p>
        <button 
          id="btn-retry-analytics-sync"
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          className="bg-brand-flamingo text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-brand-gold transition-colors rounded-[2px]"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const funnelSteps = [
    { name: 'Visitors', value: stats.funnel.visitors, icon: Users, color: '#4B5563' },
    { name: 'Product Views', value: stats.funnel.views, icon: Layers, color: '#3B82F6' },
    { name: 'Add to Bag', value: stats.funnel.carts, icon: ShoppingCart, color: '#F59E0B' },
    { name: 'Began Checkout', value: stats.funnel.checkouts, icon: Filter, color: '#EC4899' },
    { name: 'Purchased', value: stats.funnel.purchases, icon: DollarSign, color: '#10B981' }
  ];

  return (
    <div className="space-y-8 animate-fade-in font-sans">
      
      {/* FILTER & DATE CONTROLS PANEL */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-5 border border-brand-latte/20 rounded-[2px] shadow-sm">
        
        {/* Presets Button Group */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Date Range:</span>
          <div className="flex gap-1 bg-brand-grey/10 p-0.5 rounded-[2px]">
            <button
              id="btn-filter-today"
              onClick={() => setDateFilterType('today')}
              className={`px-3 py-1 text-[10px] uppercase tracking-widest font-bold rounded-[2px] transition-colors ${dateFilterType === 'today' ? 'bg-brand-flamingo text-white' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Today
            </button>
            <button
              id="btn-filter-7days"
              onClick={() => setDateFilterType('7days')}
              className={`px-3 py-1 text-[10px] uppercase tracking-widest font-bold rounded-[2px] transition-colors ${dateFilterType === '7days' ? 'bg-brand-flamingo text-white' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Last 7 Days
            </button>
            <button
              id="btn-filter-30days"
              onClick={() => setDateFilterType('30days')}
              className={`px-3 py-1 text-[10px] uppercase tracking-widest font-bold rounded-[2px] transition-colors ${dateFilterType === '30days' ? 'bg-brand-flamingo text-white' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Last 30 Days
            </button>
            <button
              id="btn-filter-custom"
              onClick={() => setDateFilterType('custom')}
              className={`px-3 py-1 text-[10px] uppercase tracking-widest font-bold rounded-[2px] transition-colors ${dateFilterType === 'custom' ? 'bg-brand-flamingo text-white' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Custom Date Inputs */}
        {dateFilterType === 'custom' && (
          <div className="flex items-center gap-2 animate-fade-in">
            <div className="relative">
              <input
                id="input-custom-start-date"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-brand-grey/5 border border-brand-latte/20 p-1.5 text-xs text-gray-700 font-medium rounded-[1px] focus:outline-none focus:border-brand-flamingo"
              />
            </div>
            <span className="text-gray-400 text-xs">to</span>
            <div className="relative">
              <input
                id="input-custom-end-date"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-brand-grey/5 border border-brand-latte/20 p-1.5 text-xs text-gray-700 font-medium rounded-[1px] focus:outline-none focus:border-brand-flamingo"
              />
            </div>
          </div>
        )}

        <button 
          id="btn-sync-analytics"
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          className="flex items-center justify-center gap-2 px-3 py-1.5 border border-brand-latte/20 hover:border-brand-flamingo text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-brand-flamingo transition-colors rounded-[2px] bg-white cursor-pointer ml-auto xl:ml-0"
        >
          <RefreshCw size={12} /> Sync Logs
        </button>
      </div>

      {/* CALIBRATION ALERT BANNER */}
      {stats.isCalibrated && stats.earliestTrackedDate && (
        <div className="bg-amber-50/40 border border-amber-200 p-5 rounded-[2px] flex gap-4 items-start animate-fade-in shadow-sm">
          <AlertTriangle size={18} className="text-brand-flamingo mt-0.5 flex-shrink-0" />
          <div className="space-y-1.5">
            <h4 className="font-serif text-sm font-bold text-gray-900 uppercase tracking-wide">
              Active Tracking Alignment Calibration
            </h4>
            <p className="text-xs text-gray-600 font-light leading-relaxed max-w-4xl">
              Web visitor tracking commenced on <span className="font-semibold text-gray-950">{format(stats.earliestTrackedDate, 'MMMM dd, yyyy')}</span>. 
              Because your selected date range starts before this date, we have dynamically calibrated your analytics metrics 
              to include orders only from this tracking start date onwards. This alignment prevents older historical sales (which have 0 tracked visitors) 
              from skewing your overall store-wide conversion rates and funnel metrics, ensuring complete mathematical integrity.
            </p>
            <div className="text-[10px] uppercase tracking-widest font-bold text-brand-flamingo pt-1 flex flex-wrap gap-4">
              <span>Calibrated Range Orders Count: {stats.funnel.purchases}</span>
              <span className="text-gray-300">|</span>
              <span>Total Store Orders in Selected Period: {stats.rawPaidOrdersCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* OVERVIEW KEY PERFORMANCE CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        
        <div className="bg-white p-6 rounded-[2px] shadow-sm border border-brand-latte/20 flex flex-col justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Total Sales Revenue</p>
            <h3 className="font-serif text-3xl text-emerald-700">
              RM {stats.rawPaidRevenue.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="mt-4 pt-3 border-t border-brand-latte/10 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500">
            <span>{stats.rawPaidOrdersCount} Paid Orders</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2px] shadow-sm border border-brand-latte/20 flex flex-col justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Unique Visitors</p>
            <h3 className="font-serif text-3xl text-gray-900">{stats.totalVisitorsCount.toLocaleString()}</h3>
          </div>
          <div className="mt-4 pt-3 border-t border-brand-latte/10 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500">
            <span>Sessions: {stats.totalSessions}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2px] shadow-sm border border-brand-latte/20 flex flex-col justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Conversion Rate</p>
            <h3 className="font-serif text-3xl text-gray-900">{stats.conversionRate.toFixed(2)}%</h3>
          </div>
          <div className="mt-4 pt-3 border-t border-brand-latte/10 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500">
            <span>Completed orders: {stats.funnel.purchases}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2px] shadow-sm border border-brand-latte/20 flex flex-col justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Average Order Value</p>
            <h3 className="font-serif text-3xl text-gray-900">
              RM {stats.averageOrderValue.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="mt-4 pt-3 border-t border-brand-latte/10 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500">
            <span>Per Paid Order</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2px] shadow-sm border border-brand-latte/20 flex flex-col justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2">Cart Abandonment</p>
            <h3 className="font-serif text-3xl text-red-500">{stats.cartAbandonmentRate.toFixed(2)}%</h3>
          </div>
          <div className="mt-4 pt-3 border-t border-brand-latte/10 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500">
            <span>Left bag without purchase</span>
          </div>
        </div>

      </div>

      {/* CONVERSION FUNNEL BAR DIAGRAM */}
      <div className="bg-white p-6 rounded-[2px] shadow-sm border border-brand-latte/20">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="font-serif text-xl text-gray-900">eCommerce Conversion Funnel</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Milestone conversion rates for selected date range</p>
          </div>
        </div>

        <div className="space-y-6">
          {funnelSteps.map((step, idx) => {
            const pctOfTotal = stats.totalVisitorsCount > 0 ? (step.value / stats.totalVisitorsCount) * 100 : 0;
            const pctOfPrevious = idx > 0 && funnelSteps[idx - 1].value > 0
              ? (step.value / funnelSteps[idx - 1].value) * 100
              : 100;

            return (
              <div key={step.name} className="relative">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest mb-1.5 z-10 relative">
                  <div className="flex items-center gap-2">
                    <step.icon size={14} style={{ color: step.color }} />
                    <span className="text-gray-800">{step.name}</span>
                  </div>
                  <div className="flex gap-4 text-gray-500">
                    <span>{step.value.toLocaleString()} ({pctOfTotal.toFixed(1)}%)</span>
                    {idx > 0 && (
                      <span className="text-brand-flamingo">
                        {pctOfPrevious.toFixed(1)}% step-rate
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full h-3 bg-brand-grey/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${Math.min(pctOfTotal, 100)}%`,
                      backgroundColor: step.color
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TWO COLUMNS: TRENDS AND LOYALTY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Traffic & Revenue Trend Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[2px] shadow-sm border border-brand-latte/20">
          <h3 className="font-serif text-xl text-gray-900 mb-1">Traffic & Revenue Trends</h3>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-6">Daily visitor counts vs direct financial earnings</p>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={(val) => `RM ${val}`} />
                <Tooltip 
                  contentStyle={{ fontSize: '11px', fontFamily: 'monospace', borderRadius: '4px', border: '1px solid #D9C4B8' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                <Area yAxisId="left" type="monotone" dataKey="visitors" name="Unique Visitors" stroke="#3B82F6" fillOpacity={1} fill="url(#colorVisitors)" strokeWidth={2} />
                <Area yAxisId="right" type="monotone" dataKey="revenue" name="Revenue (RM)" stroke="#10B981" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Loyalty Segment */}
        <div className="bg-white p-6 rounded-[2px] shadow-sm border border-brand-latte/20 flex flex-col justify-between">
          <div>
            <h3 className="font-serif text-xl text-gray-900 mb-1">Customer Loyalty</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-8">Visitor segments and repeat purchase rate</p>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-1.5 text-gray-700">
                  <span>New Visitors</span>
                  <span>
                    {stats.newVisitorsPercent.toFixed(1)}% <span className="text-gray-400 font-normal">({stats.newVisitorSessionsCount} sessions)</span>
                  </span>
                </div>
                <div className="w-full h-2.5 bg-brand-grey/10 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-flamingo rounded-full" style={{ width: `${stats.newVisitorsPercent}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-1.5 text-gray-700">
                  <span>Returning Visitors</span>
                  <span>
                    {stats.returningPercent.toFixed(1)}% <span className="text-gray-400 font-normal">({stats.returningVisitorSessionsCount} sessions)</span>
                  </span>
                </div>
                <div className="w-full h-2.5 bg-brand-grey/10 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-gold rounded-full" style={{ width: `${stats.returningPercent}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-brand-latte/20 bg-brand-latte/5 p-4 rounded-[2px] text-center">
            <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Repeat Purchase Rate</p>
            <h4 className="font-serif text-4xl text-gray-900">{stats.repeatPurchaseRate.toFixed(1)}%</h4>
            <p className="text-[10px] text-gray-500 font-medium leading-relaxed mt-2 uppercase tracking-widest">
              From completed live orders
            </p>
          </div>
        </div>

      </div>

      {/* DETAILED REVENUE BY TRAFFIC ACQUISITION */}
      <div className="bg-white p-6 rounded-[2px] shadow-sm border border-brand-latte/20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-brand-latte/10 pb-4">
          <div>
            <h3 className="font-serif text-xl text-gray-900">Traffic Acquisition & UTM Revenue</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">
              Sales attributed to first-touch visitor acquisition logs (read-only order total mapping)
            </p>
          </div>

          {/* Grouping Toggle */}
          <div className="flex items-center gap-1 bg-brand-grey/15 p-0.5 rounded-[2px] self-end sm:self-auto">
            <button
              id="btn-group-source"
              onClick={() => setGroupMode('source')}
              className={`px-3 py-1 text-[10px] uppercase tracking-widest font-bold rounded-[1px] transition-colors ${groupMode === 'source' ? 'bg-brand-flamingo text-white' : 'text-gray-500 hover:text-gray-900'}`}
            >
              By Source
            </button>
            <button
              id="btn-group-campaign"
              onClick={() => setGroupMode('campaign')}
              className={`px-3 py-1 text-[10px] uppercase tracking-widest font-bold rounded-[1px] transition-colors ${groupMode === 'campaign' ? 'bg-brand-flamingo text-white' : 'text-gray-500 hover:text-gray-900'}`}
            >
              By Campaign
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600 border-collapse">
            <thead className="bg-brand-latte/10 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <tr>
                <th className="px-4 py-3 border-b border-brand-latte/10">Source (UTM)</th>
                <th className="px-4 py-3 border-b border-brand-latte/10">Medium</th>
                <th className="px-4 py-3 border-b border-brand-latte/10">Campaign</th>
                <th className="px-4 py-3 border-b border-brand-latte/10 text-right">Visitors</th>
                <th className="px-4 py-3 border-b border-brand-latte/10 text-right">Add-to-Carts</th>
                <th className="px-4 py-3 border-b border-brand-latte/10 text-right">Purchases</th>
                <th className="px-4 py-3 border-b border-brand-latte/10 text-right">Revenue</th>
                <th className="px-4 py-3 border-b border-brand-latte/10 text-right">Conv. Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-latte/10">
              {stats.utmList.map((utm, idx) => {
                const itemKey = `${utm.source}|${utm.medium}|${utm.campaign}`;
                const isWinner = itemKey === stats.winnerKey;
                const isLoser = itemKey === stats.loserKey;

                return (
                  <tr 
                    key={idx} 
                    className={`transition-colors ${
                      isWinner 
                        ? 'bg-green-50/40 hover:bg-green-50/60 font-medium' 
                        : isLoser 
                          ? 'bg-red-50/20 hover:bg-red-50/40' 
                          : 'hover:bg-gray-50/50'
                    }`}
                  >
                    <td className="px-4 py-3.5 flex items-center gap-2">
                      <span className="bg-brand-grey/25 px-2 py-0.5 rounded-[1px] font-mono font-bold text-gray-700">
                        {utm.source}
                      </span>
                      {isWinner && (
                        <span className="bg-green-100 text-green-800 text-[9px] px-1.5 py-0.5 rounded-[1px] font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse">
                          <Award size={10} /> 🏆 Winner
                        </span>
                      )}
                      {isLoser && (
                        <span className="bg-orange-50 text-orange-700 text-[9px] px-1.5 py-0.5 border border-orange-200 rounded-[1px] font-bold uppercase tracking-wider flex items-center gap-0.5">
                          <AlertTriangle size={10} /> Needs Attention
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 uppercase text-gray-400 font-semibold tracking-wider">
                      {utm.medium === 'multiple' ? (
                        <span className="italic text-[10px] text-gray-300">Collapsed</span>
                      ) : (
                        utm.medium
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-gray-500 max-w-[150px] truncate">
                      {utm.campaign === 'multiple' ? (
                        <span className="italic text-[10px] text-gray-300">Collapsed</span>
                      ) : (
                        utm.campaign
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-gray-800">{utm.visitors.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right font-medium text-gray-500">{utm.addToCarts.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-brand-gold">{utm.purchases}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-brand-green">
                      RM {utm.revenue.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`px-1.5 py-0.5 rounded-[1px] font-bold ${
                        utm.conversionRate >= 5 
                          ? 'bg-green-50 text-green-700' 
                          : utm.conversionRate > 0 
                            ? 'bg-yellow-50 text-yellow-700' 
                            : 'bg-gray-100 text-gray-400'
                      }`}>
                        {utm.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              {stats.utmList.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm italic font-light">
                    No UTM campaign logs tracked for this date range
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AMBASSADOR LEADERBOARD */}
      <div className="bg-white p-6 rounded-[2px] shadow-sm border border-brand-latte/20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-brand-latte/10 pb-4">
          <div>
            <h3 className="font-serif text-xl text-gray-900 flex items-center gap-2">
              <Users size={20} className="text-brand-flamingo" />
              Ambassador Campaign Performance
            </h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">
              Live leaderboard tracking of brand ambassador referrals, orders, and calculated earnings (10% standard commission)
            </p>
          </div>
          <span className="text-[10px] bg-brand-flamingo/10 text-brand-flamingo px-2.5 py-1 rounded-[2px] font-bold uppercase tracking-wider font-sans self-end sm:self-auto">
            {stats.ambassadorsList.length} Active Ambassadors
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600 border-collapse">
            <thead className="bg-brand-latte/10 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <tr>
                <th className="px-4 py-3 border-b border-brand-latte/10">Ambassador</th>
                <th className="px-4 py-3 border-b border-brand-latte/10">Channel / Platform</th>
                <th className="px-4 py-3 border-b border-brand-latte/10">UTM Campaign Code</th>
                <th className="px-4 py-3 border-b border-brand-latte/10 text-right">Referral Visitors</th>
                <th className="px-4 py-3 border-b border-brand-latte/10 text-right">Cart Additions</th>
                <th className="px-4 py-3 border-b border-brand-latte/10 text-right">Completed Orders</th>
                <th className="px-4 py-3 border-b border-brand-latte/10 text-right">Est. Commission (10%)</th>
                <th className="px-4 py-3 border-b border-brand-latte/10 text-right">Sales Revenue</th>
                <th className="px-4 py-3 border-b border-brand-latte/10 text-right">Conv. Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-latte/10">
              {stats.ambassadorsList.map((amb, idx) => {
                const estCommission = amb.revenue * 0.10;
                
                return (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-gray-900 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-brand-flamingo/10 text-brand-flamingo font-serif flex items-center justify-center text-xs">
                        {amb.name.charAt(0)}
                      </div>
                      <span>{amb.name}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[1px] ${
                        amb.platform === 'instagram' 
                          ? 'bg-pink-50 text-pink-700 border border-pink-100'
                          : amb.platform === 'tiktok'
                            ? 'bg-gray-950 text-white'
                            : amb.platform === 'youtube'
                              ? 'bg-red-50 text-red-700 border border-red-100'
                              : amb.platform === 'threads'
                                ? 'bg-zinc-100 text-zinc-900 border border-zinc-200'
                                : 'bg-brand-latte/10 text-gray-600'
                      }`}>
                        {amb.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-gray-500">{amb.campaign}</td>
                    <td className="px-4 py-3.5 text-right font-medium text-gray-800">{amb.visitors.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right font-medium text-gray-500">{amb.addToCarts.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-brand-flamingo">{amb.purchases}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-brand-gold">
                      RM {estCommission.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-brand-green">
                      RM {amb.revenue.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`px-1.5 py-0.5 rounded-[1px] font-bold ${
                        amb.conversionRate >= 5 
                          ? 'bg-green-50 text-green-700' 
                          : amb.conversionRate > 0 
                            ? 'bg-yellow-50 text-yellow-700' 
                            : 'bg-gray-100 text-gray-400'
                      }`}>
                        {amb.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              {stats.ambassadorsList.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-2 py-4">
                      <Users size={32} className="text-gray-300 mb-1" />
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-800">No Ambassadors Tracked Yet</p>
                      <p className="text-[11px] font-light leading-relaxed text-gray-400">
                        Create tracking links with the <strong className="font-semibold text-gray-600">Ambassador Link</strong> category in the UTM Link Builder to tag brand advocates and track referral performance.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TOP PRODUCTS BY VIEWS VS SALES */}
      <div className="bg-white p-6 rounded-[2px] shadow-sm border border-brand-latte/20">
        <h3 className="font-serif text-xl text-gray-900 mb-1">Top Products: Views vs sales</h3>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-6">Comparing product detail page visits against checkout purchase quantities</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 border-collapse">
            <thead className="bg-brand-latte/10 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <tr>
                <th className="px-4 py-3 border-b border-brand-latte/10">Product Name</th>
                <th className="px-4 py-3 border-b border-brand-latte/10 text-right">Product Views</th>
                <th className="px-4 py-3 border-b border-brand-latte/10 text-right">Cart Additions</th>
                <th className="px-4 py-3 border-b border-brand-latte/10 text-right">Direct Sales</th>
                <th className="px-4 py-3 border-b border-brand-latte/10 text-right">Generated Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-latte/10">
              {stats.productsList.map((prod, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3.5 font-medium text-gray-900">{prod.name}</td>
                  <td className="px-4 py-3.5 text-right text-blue-500 font-bold">{prod.views.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-right text-yellow-500 font-bold">{prod.additions.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-right text-green-500 font-bold">{prod.sales.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-gray-900">RM {prod.revenue.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
              {stats.productsList.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm italic font-light">
                    No product interactive logs tracked for this date range
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
