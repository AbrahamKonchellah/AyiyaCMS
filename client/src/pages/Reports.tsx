import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import reportsService, { ReportsDto } from '../services/reportsService';
import './Phase4.css';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatMoney(n: number) {
  return `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
}

function exportCSV(data: object[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const rows = [keys.join(','), ...data.map(r => keys.map(k => JSON.stringify((r as any)[k] ?? '')).join(','))];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [data, setData]           = useState<ReportsDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    reportsService.get().then(setData).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return (
    <div style={{ maxWidth: 1100 }}>
      <div className="page-header"><div><h1>Reports</h1></div></div>
      {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton-block" style={{ height: 200, borderRadius: 6, marginBottom: 20 }} />)}
    </div>
  );
  if (!data) return null;

  const trendData = data.financial.monthlyTrend.map(m => ({
    name: `${MONTHS[m.month - 1]} ${m.year}`,
    Invoiced: m.invoiced,
    Collected: m.collected,
  }));

  return (
    <div style={{ maxWidth: 1100 }}>
      <div className="page-header">
        <div><h1>Reports</h1><div className="page-header-meta">Firm-wide analytics</div></div>
        <button className="btn-secondary" onClick={() => window.print()}>Print / Export PDF</button>
      </div>

      {/* Case Performance */}
      <div className="info-card" style={{ marginBottom: 20 }}>
        <div className="info-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Case Performance</h3>
          <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => exportCSV([data.casePerformance], 'case-performance.csv')}>Export CSV</button>
        </div>
        <div className="info-card-body" style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
          <div className="report-stat"><div className="report-stat-value">{data.casePerformance.active}</div><div className="report-stat-label">Active Matters</div></div>
          <div className="report-stat"><div className="report-stat-value">{data.casePerformance.closed}</div><div className="report-stat-label">Closed Matters</div></div>
          <div className="report-stat"><div className="report-stat-value">{data.casePerformance.avgDaysToClose.toFixed(0)} days</div><div className="report-stat-label">Avg. Days to Close</div></div>
        </div>
      </div>

      {/* Lawyer Productivity */}
      <div className="info-card" style={{ marginBottom: 20 }}>
        <div className="info-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Lawyer Productivity</h3>
          <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => exportCSV(data.productivity, 'productivity.csv')}>Export CSV</button>
        </div>
        <div className="data-table-wrapper" style={{ borderRadius: 0, border: 'none' }}>
          <table className="data-table">
            <thead><tr><th>Name</th><th>Total Hours</th><th>Billed Hours</th><th>Billing Rate</th><th>Amount</th></tr></thead>
            <tbody>
              {data.productivity.map(p => (
                <tr key={p.userId}>
                  <td>{p.name}</td>
                  <td>{p.totalHours.toFixed(1)}h</td>
                  <td>{p.billedHours.toFixed(1)}h</td>
                  <td>
                    <div className="report-bar-wrap">
                      <div className="report-bar" style={{ width: `${p.totalHours > 0 ? (p.billedHours / p.totalHours) * 100 : 0}%` }} />
                      <span>{p.totalHours > 0 ? Math.round((p.billedHours / p.totalHours) * 100) : 0}%</span>
                    </div>
                  </td>
                  <td>{formatMoney(p.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="info-card" style={{ marginBottom: 20 }}>
        <div className="info-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Financial Summary</h3>
          <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => exportCSV(data.financial.monthlyTrend, 'financial-trend.csv')}>Export CSV</button>
        </div>
        <div className="info-card-body">
          <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', marginBottom: 24 }}>
            <div className="report-stat"><div className="report-stat-value">{formatMoney(data.financial.totalInvoiced)}</div><div className="report-stat-label">Total Invoiced</div></div>
            <div className="report-stat"><div className="report-stat-value" style={{ color: 'var(--green-700)' }}>{formatMoney(data.financial.totalCollected)}</div><div className="report-stat-label">Collected</div></div>
            <div className="report-stat"><div className="report-stat-value" style={{ color: '#92620A' }}>{formatMoney(data.financial.totalOutstanding)}</div><div className="report-stat-label">Outstanding</div></div>
          </div>
          {trendData.length > 0 && (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}/>
                <Tooltip formatter={(v) => typeof v === 'number' ? formatMoney(v) : ''} />
                <Legend />
                <Bar dataKey="Invoiced" fill="#1A5C52" radius={[3,3,0,0]} />
                <Bar dataKey="Collected" fill="#D4A853" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Client Activity */}
      <div className="info-card">
        <div className="info-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Client Activity</h3>
          <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => exportCSV(data.clientActivity, 'client-activity.csv')}>Export CSV</button>
        </div>
        <div className="data-table-wrapper" style={{ borderRadius: 0, border: 'none' }}>
          <table className="data-table">
            <thead><tr><th>Client</th><th>Total Matters</th><th>Active Matters</th><th>Last Activity</th></tr></thead>
            <tbody>
              {data.clientActivity.map(c => (
                <tr key={c.clientId}>
                  <td>{c.clientName}</td>
                  <td>{c.matterCount}</td>
                  <td>{c.activeMatters > 0 ? <span className="badge badge-active">{c.activeMatters}</span> : <span style={{ color: 'var(--text-soft)' }}>—</span>}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                    {c.lastUpdated ? new Date(c.lastUpdated).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}