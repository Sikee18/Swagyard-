'use client';

import { jsPDF } from 'jspdf';
import type { AnalyticsData } from './pos-analytics';

export type AnalyticsTab = 'revenue' | 'today' | 'products' | 'coupons';

const STORE_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Swagyard';

export function periodLabel(preset: string, from: string, to: string) {
  if (preset === 'custom' || ((from || to) && preset === 'all')) return `Custom Range (${from || 'Start'} to ${to || 'End'})`;
  switch (preset) {
    case 'today':
      return 'Today';
    case 'week':
      return 'This Week';
    case 'month':
      return 'This Month';
    case 'year':
      return 'This Year';
    default:
      return 'All Time';
  }
}

const f2 = (n: number) => (n || 0).toFixed(2);

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function exportAnalyticsCsv(data: AnalyticsData, tab: AnalyticsTab, preset: string, from: string, to: string) {
  const rows: string[][] = [
    [`${STORE_NAME} - POS & Store Analytics Report`],
    [`Exported on: ${new Date().toLocaleString('en-IN')}`],
    [`Active View: ${tab.toUpperCase()}`],
    [`Filter Period: ${periodLabel(preset, from, to)}`],
    [],
  ];
  if (tab === 'revenue') {
    rows.push(
      ['--- REVENUE & PROFIT SUMMARY ---'],
      ['Metric', 'Value'],
      ['Total Revenue (INR)', f2(data.totalCompletedRevenue)],
      ['Total Expenses (INR)', f2(data.totalExpenses)],
      ['Net Profit / Loss (INR)', f2(data.netProfit)],
      ['Completed Bills Count', String(data.completedOrders)],
      ['Offline (Walk-in) Revenue (INR)', f2(data.posRevenue)],
      ['Offline Bills Count', String(data.offlineOrderCount)],
      ['Online Revenue (INR)', f2(data.onlinePosRevenue)],
      ['Online Bills Count', String(data.onlineBillCount)],
      ['Total Items Sold', String(Math.round(data.totalProductsSold))],
      ['Average Revenue Per Bill (INR)', f2(data.averageRevenuePerBill)],
      ['Cash Collected (INR)', f2(data.cashCollected)],
      ['QR Collected (INR)', f2(data.qrCollected)],
      ['Card Collected (INR)', f2(data.cardCollected)]
    );
    if (data.otherCollected > 0) rows.push(['Other / Online Collected (INR)', f2(data.otherCollected)]);
    rows.push(['Top Performing Product', data.bestProduct], [], ['--- WEEKLY REVENUE TREND ---'], ['Day', 'Date', 'Revenue (INR)']);
    data.weeklySales.forEach((d) => rows.push([d.day, d.date, f2(d.revenue)]));
    rows.push([], ['--- TOP PRODUCTS BY REVENUE ---'], ['Rank', 'Product Name', 'Quantity Sold', 'Revenue (INR)', 'Bill Count']);
    [...data.topProducts]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20)
      .forEach((p, i) => rows.push([String(i + 1), p.name, String(Math.round(p.qty)), f2(p.revenue), String(p.billCount)]));
  } else if (tab === 'today') {
    rows.push(
      ["--- TODAY'S SALES OVERVIEW ---"],
      ['Metric', 'Value'],
      ["Today's Revenue (INR)", f2(data.todaySales)],
      ["Today's Completed Orders", String(data.todayCompletedOrdersCount)],
      ["Today's Items Sold", String(Math.round(data.todayItemsSold))],
      ["Today's Average Order Value (INR)", f2(data.todayAvgOrderValue)],
      [],
      ["--- TODAY'S HOURLY SALES TREND ---"],
      ['Hour Slot', 'Revenue (INR)']
    );
    data.todayHourlyTrend.forEach((h) => rows.push([h.hour, f2(h.revenue)]));
    rows.push([], ['--- TOP PRODUCTS SOLD TODAY ---'], ['Rank', 'Product Name', 'Units Sold', 'Revenue (INR)']);
    data.todayTopProducts.forEach((p, i) => rows.push([String(i + 1), p.name, String(Math.round(p.qty)), f2(p.revenue)]));
  } else if (tab === 'products') {
    rows.push(
      ['--- PRODUCT PERFORMANCE BREAKDOWN ---'],
      ['Rank', 'Product Name', 'Variant', 'Units Sold', 'Revenue (INR)', 'Cost (INR)', 'Profit (INR)', 'Margin (%)', 'Bill Count']
    );
    data.topProducts.forEach((p, i) =>
      rows.push([
        String(i + 1),
        p.name,
        p.variant || '-',
        String(Math.round(p.qty)),
        f2(p.revenue),
        p.hasCost ? f2(p.cost) : 'N/A',
        p.hasCost ? f2(p.profit) : 'N/A',
        p.hasCost ? p.margin.toFixed(1) : 'N/A',
        String(p.billCount),
      ])
    );
    rows.push(
      [],
      ['Total Product Cost (INR)', f2(data.totalProductCost)],
      ['Total Product Profit (INR)', f2(data.totalProductProfit)],
      ['Overall Profit Margin (%)', data.overallProfitMargin.toFixed(1)],
      ['Products without cost price (excluded from profit)', String(data.productsWithoutCost)],
      [],
      ['--- CATEGORY PERFORMANCE ---'],
      ['Rank', 'Category Name', 'Units Sold', 'Revenue (INR)']
    );
    data.topCategories.forEach((c, i) => rows.push([String(i + 1), c.name, String(Math.round(c.qty)), f2(c.revenue)]));
  } else {
    rows.push(
      ['--- COUPON PERFORMANCE SUMMARY ---'],
      ['Metric', 'Value'],
      ['Total Discount Given via Coupons (INR)', f2(data.totalCouponDiscounts)],
      ['Total Coupon Usage Count', String(data.totalCouponOrders)],
      ['Coupon Usage Rate (%)', `${data.couponUsageRate.toFixed(1)}%`],
      [],
      ['--- COUPON USAGE LIST ---'],
      ['Rank', 'Coupon Code', 'Times Used', 'Total Discounts (INR)']
    );
    data.topCoupons.forEach((c, i) => rows.push([String(i + 1), c.code, String(c.usage), f2(c.discounts)]));
  }
  const csv = rows
    .map((r) =>
      r
        .map((v) => {
          const s = String(v ?? '');
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(',')
    )
    .join('\r\n');
  download(
    `${STORE_NAME}_Analytics_${tab}_${preset || 'all'}_${new Date().toISOString().slice(0, 10)}.csv`,
    new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  );
}

const pdfMoney = (n: number) => `Rs. ${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Executive PDF: KPI grid, a bar chart for the active view, and its main table. */
export function exportAnalyticsPdf(data: AnalyticsData, tab: AnalyticsTab, preset: string, from: string, to: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const left = 14;
  const width = 182;
  let y = 14;

  doc.setFillColor('#111111');
  doc.rect(0, 0, 210, 26, 'F');
  doc.setTextColor('#C9B79C');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`${STORE_NAME} - POS Analytics`, left, y + 2);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#FFFFFF');
  doc.text(`${tab.toUpperCase()} view  |  ${periodLabel(preset, from, to)}  |  ${new Date().toLocaleString('en-IN')}`, left, y + 8);
  y = 34;

  const kpis: [string, string][] =
    tab === 'revenue'
      ? [
          ['Total Revenue', pdfMoney(data.totalCompletedRevenue)],
          [data.isProfitable ? 'Net Profit' : 'Net Loss', pdfMoney(Math.abs(data.netProfit))],
          ['Total Expenses', pdfMoney(data.totalExpenses)],
          ['Completed Bills', String(data.completedOrders)],
          ['Average Revenue Per Bill', pdfMoney(data.averageRevenuePerBill)],
          ['Total Items Sold', String(Math.round(data.totalProductsSold))],
        ]
      : tab === 'today'
        ? [
            ["Today's Revenue", pdfMoney(data.todaySales)],
            ['Completed Orders', String(data.todayCompletedOrdersCount)],
            ['Items Sold', String(Math.round(data.todayItemsSold))],
            ['Avg Order Value', pdfMoney(data.todayAvgOrderValue)],
          ]
        : tab === 'products'
          ? [
              ['Total Product Revenue', pdfMoney(data.totalCompletedRevenue)],
              ['Total Products Sold', String(Math.round(data.totalProductsSold))],
              ['Total Product Profit', pdfMoney(data.totalProductProfit)],
              ['Profit Margin', `${data.overallProfitMargin.toFixed(1)}%`],
            ]
          : [
              ['Coupons Used', String(data.totalCouponOrders)],
              ['Total Discounts Given', pdfMoney(data.totalCouponDiscounts)],
              ['Usage Rate', `${data.couponUsageRate.toFixed(1)}%`],
              ['Unique Coupons', String(data.topCoupons.length)],
            ];

  const cellW = width / 3;
  kpis.forEach(([label, value], i) => {
    const x = left + (i % 3) * cellW;
    const top = y + Math.floor(i / 3) * 20;
    doc.setFillColor('#FBFAF6');
    doc.setDrawColor('#DDD2BE');
    doc.roundedRect(x, top, cellW - 3, 17, 2, 2, 'FD');
    doc.setFontSize(7.5);
    doc.setTextColor('#6B7280');
    doc.text(label.toUpperCase(), x + 3, top + 6);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#111111');
    doc.text(value, x + 3, top + 13);
    doc.setFont('helvetica', 'normal');
  });
  y += Math.ceil(kpis.length / 3) * 20 + 6;

  const series: { label: string; value: number }[] =
    tab === 'revenue'
      ? data.monthlyTrend.map((m) => ({ label: m.month, value: m.revenue }))
      : tab === 'today'
        ? data.todayHourlyTrend.filter((_, i) => i >= 8 && i <= 22).map((h) => ({ label: h.hour, value: h.revenue }))
        : tab === 'products'
          ? data.topCategories.slice(0, 8).map((c) => ({ label: c.name.slice(0, 10), value: c.revenue }))
          : data.couponDailyTrend.map((d) => ({ label: d.day, value: d.orders }));
  const chartTitle =
    tab === 'revenue' ? `Revenue Trend ${data.chartYear}` : tab === 'today' ? 'Hourly Sales Today' : tab === 'products' ? 'Revenue by Category' : 'Coupon Usage (Last 7 Days)';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor('#111111');
  doc.text(chartTitle, left, y);
  y += 4;
  const chartH = 50;
  const max = Math.max(1, ...series.map((s) => s.value));
  const slot = width / Math.max(1, series.length);
  doc.setDrawColor('#F1EBE0');
  doc.line(left, y + chartH, left + width, y + chartH);
  series.forEach((s, i) => {
    const h = (s.value / max) * (chartH - 6);
    const barW = Math.min(12, slot * 0.6);
    const x = left + i * slot + (slot - barW) / 2;
    doc.setFillColor(tab === 'revenue' ? '#C9B79C' : '#111111');
    if (h > 0) doc.rect(x, y + chartH - h, barW, h, 'F');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#6B7280');
    doc.text(s.label, x + barW / 2, y + chartH + 4, { align: 'center' });
  });
  y += chartH + 12;

  const table: { head: string[]; rows: string[][] } =
    tab === 'coupons'
      ? { head: ['#', 'Code', 'Orders Used', 'Total Discount'], rows: data.topCoupons.map((c, i) => [String(i + 1), c.code, String(c.usage), pdfMoney(c.discounts)]) }
      : tab === 'today'
        ? { head: ['#', 'Product', 'Sold', 'Revenue'], rows: data.todayTopProducts.map((p, i) => [String(i + 1), p.name, String(Math.round(p.qty)), pdfMoney(p.revenue)]) }
        : {
            head: ['#', 'Product', 'Qty Sold', 'Revenue', 'Profit'],
            rows: [...data.topProducts]
              .sort((a, b) => b.revenue - a.revenue)
              .slice(0, 15)
              .map((p, i) => [String(i + 1), p.variant ? `${p.name} (${p.variant})` : p.name, String(Math.round(p.qty)), pdfMoney(p.revenue), p.hasCost ? pdfMoney(p.profit) : '—']),
          };
  const colW = width / table.head.length;
  const colX = (i: number) => left + (i === 0 ? 0 : 10 + (i - 1) * ((width - 10) / (table.head.length - 1)));
  doc.setFillColor('#FAF7F2');
  doc.rect(left, y - 4, width, 7, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#374151');
  table.head.forEach((h, i) => doc.text(h.toUpperCase(), colX(i) + 1, y));
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#111111');
  y += 7;
  if (table.rows.length === 0) {
    doc.text('No data in selected period', left + 1, y);
  }
  for (const row of table.rows) {
    if (y > 285) {
      doc.addPage();
      y = 16;
    }
    row.forEach((v, i) => doc.text(String(v).slice(0, i === 1 ? 45 : 20), colX(i) + 1, y, { maxWidth: i === 1 ? colW * 2 : colW }));
    y += 6;
  }

  doc.save(`${STORE_NAME}_Analytics_${tab}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
