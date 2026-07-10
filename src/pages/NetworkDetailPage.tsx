import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import Papa from "papaparse";
import { getInsights } from "../api/client";
import { theme } from "../theme";
import type { NetworkParam, DailyMetrics, FacebookDailyMetrics, InstagramDailyMetrics } from "../types";

type MetaView = "combined" | "facebook" | "instagram";

type ChartRow = {
  date: string;
  facebookSpend?: number;
  instagramSpend?: number;
  prevFacebookSpend?: number;
  prevInstagramSpend?: number;
  spend?: number;
  prevSpend?: number;
};

const NETWORK_META: Record<NetworkParam, { label: string; accents: string[] }> = {
  meta: { label: "Meta", accents: [theme.colors.facebook, theme.colors.instagram] },
  google: { label: "Google", accents: [theme.colors.google] },
  linkedin: { label: "LinkedIn", accents: [theme.colors.linkedin] },
};

const Page = styled.div`padding: 2rem; max-width: 1100px; margin: 0 auto;`;
const HeaderRow = styled.div`display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.25rem;`;
const Dots = styled.div`display: flex; gap: 3px;`;
const Dot = styled.span<{ $bg: string }>`width: 12px; height: 12px; border-radius: 50%; background: ${(p) => p.$bg};`;
const Title = styled.h1`font-size: 1.5rem;`;
const Sub = styled.p`color: ${theme.colors.textMuted}; font-size: 0.9rem; margin: 0 0 1.25rem;`;

const Segmented = styled.div`display: inline-flex; background: ${theme.colors.bg}; border-radius: 999px; padding: 3px; margin-bottom: 1.5rem; border: 1px solid ${theme.colors.border};`;
const SegButton = styled.button<{ $active: boolean }>`
  border: none;
  background: ${(p) => (p.$active ? theme.colors.surface : "transparent")};
  color: ${(p) => (p.$active ? theme.colors.text : theme.colors.textMuted)};
  box-shadow: ${(p) => (p.$active ? theme.shadow : "none")};
  padding: 0.4rem 1rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
`;

const Controls = styled.div`
  display: flex; gap: 0.75rem; align-items: flex-start; flex-wrap: wrap;
  background: ${theme.colors.surface}; border: 1px solid ${theme.colors.border};
  border-radius: ${theme.radius}; padding: 0.75rem 1rem; margin-bottom: 1.5rem;
  box-shadow: ${theme.shadow};
`;

const Field = styled.label`
  display: flex; flex-direction: column; gap: 0.25rem;
  font-size: 0.75rem; color: ${theme.colors.textMuted}; font-weight: 500;
  input {
    border: 1px solid ${theme.colors.border};
    border-radius: 8px;
    padding: 0.4rem 0.6rem;
    font-size: 0.85rem;
    color: ${theme.colors.text};
    background: ${theme.colors.bg};
    color-scheme: dark;
  }
`;

const Hint = styled.span`font-size: 0.7rem; color: ${theme.colors.textMuted};`;

const ExportButton = styled.button`
  margin-left: auto; margin-top: 1.1rem; background: ${theme.colors.primary}; color: white; border: none;
  border-radius: 8px; padding: 0.55rem 1rem; font-size: 0.85rem; font-weight: 600; cursor: pointer;
  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const ErrorBanner = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
  background: ${theme.colors.negativeBg}; border: 1px solid ${theme.colors.negative};
  border-radius: ${theme.radius}; padding: 1rem 1.25rem; margin-bottom: 2rem;
`;

const ErrorText = styled.span`color: ${theme.colors.negative}; font-size: 0.85rem;`;

const BackButton = styled.button`
  background: transparent; color: ${theme.colors.text}; border: 1px solid ${theme.colors.border};
  border-radius: 8px; padding: 0.5rem 1rem; font-size: 0.85rem; font-weight: 600; cursor: pointer; white-space: nowrap;
  &:hover { background: ${theme.colors.bg}; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
`;

const SkeletonBlock = styled.div<{ $h: string; $w?: string }>`
  height: ${(p) => p.$h};
  width: ${(p) => p.$w || "100%"};
  background: ${theme.colors.border};
  border-radius: 6px;
  animation: ${pulse} 1.4s ease-in-out infinite;
`;

const KpiRow = styled.div`display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem;`;
const Kpi = styled.div`border: 1px solid ${theme.colors.border}; border-radius: ${theme.radius}; padding: 1rem 1.25rem; min-width: 150px; background: ${theme.colors.surface}; box-shadow: ${theme.shadow};`;
const KpiLabel = styled.div`font-size: 0.75rem; color: ${theme.colors.textMuted}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.3rem;`;
const KpiValue = styled.div`font-family: ${theme.font.mono}; font-size: 1.4rem; font-weight: 600; display: flex; align-items: baseline; gap: 0.5rem;`;

const DeltaPill = styled.span<{ $up: boolean }>`
  font-family: ${theme.font.body}; font-size: 0.7rem; font-weight: 700;
  padding: 0.15rem 0.45rem; border-radius: 999px;
  background: ${(p) => (p.$up ? theme.colors.positiveBg : theme.colors.negativeBg)};
  color: ${(p) => (p.$up ? theme.colors.positive : theme.colors.negative)};
`;

const ChartCard = styled.div`background: ${theme.colors.surface}; border: 1px solid ${theme.colors.border}; border-radius: ${theme.radius}; padding: 1.5rem; box-shadow: ${theme.shadow};`;

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateLong(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function pctDelta(curr: number, prev: number) {
  if (prev === 0) return 0;
  return ((curr - prev) / prev) * 100;
}

function metaTotals(view: MetaView, totals: any, prevTotals: any) {
  if (view === "facebook") return { curr: totals.facebook, prev: prevTotals.facebook };
  if (view === "instagram") return { curr: totals.instagram, prev: prevTotals.instagram };
  const fb = totals.facebook, ig = totals.instagram;
  const fbPrev = prevTotals.facebook, igPrev = prevTotals.instagram;
  return {
    curr: {
      spend: fb.spend + ig.spend, impressions: fb.impressions + ig.impressions,
      clicks: fb.clicks + ig.clicks, conversions: fb.conversions + ig.conversions,
    },
    prev: {
      spend: fbPrev.spend + igPrev.spend, impressions: fbPrev.impressions + igPrev.impressions,
      clicks: fbPrev.clicks + igPrev.clicks, conversions: fbPrev.conversions + igPrev.conversions,
    },
  };
}

export default function NetworkDetailPage({ network }: { network: NetworkParam }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [range, setRange] = useState({ start: isoDaysAgo(13), end: isoDaysAgo(0) });
  const [lastGoodRange, setLastGoodRange] = useState(range);
  const [subView, setSubView] = useState<MetaView>(
    network === "meta" ? ((searchParams.get("view") as MetaView) || "combined") : "combined"
  );
  const [data, setData] = useState<any>(null);
  const [prevData, setPrevData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const meta = NETWORK_META[network];

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setPrevData(null);
    getInsights(network as any, range.start, range.end)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setLastGoodRange(range);
        getInsights(network as any, d.previousPeriod.startDate, d.previousPeriod.endDate)
          .then((pd) => { if (!cancelled) setPrevData(pd); })
          .catch(() => { /* previous-period overlay is best-effort */ });
      })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [network, range]);

  function selectSubView(v: MetaView) {
    setSubView(v);
    setSearchParams(v === "combined" ? {} : { view: v });
  }

  function backToLastGoodRange() {
    setError(null);
    setRange(lastGoodRange);
  }

  const combined = useMemo(() => {
    if (!data) return null;
    let curr, prev;
    if (network === "meta") {
      ({ curr, prev } = metaTotals(subView, data.totals, data.previousTotals));
    } else {
      curr = data.totals;
      prev = data.previousTotals;
    }
    return {
      spend: curr.spend, impressions: curr.impressions, clicks: curr.clicks, conversions: curr.conversions,
      deltas: {
        spend: pctDelta(curr.spend, prev.spend), impressions: pctDelta(curr.impressions, prev.impressions),
        clicks: pctDelta(curr.clicks, prev.clicks), conversions: pctDelta(curr.conversions, prev.conversions),
      },
    };
  }, [data, network, subView]);

  const chartData = useMemo<ChartRow[]>(() => {
    if (!data) return [];
    if (network === "meta") {
      const fbDaily: FacebookDailyMetrics[] = data.dailyData.facebook;
      const igDaily: InstagramDailyMetrics[] = data.dailyData.instagram;
      const prevFbDaily: FacebookDailyMetrics[] | undefined = prevData?.dailyData?.facebook;
      const prevIgDaily: InstagramDailyMetrics[] | undefined = prevData?.dailyData?.instagram;
      return fbDaily.map((d, i) => ({
        date: formatDateLabel(d.date),
        facebookSpend: subView !== "instagram" ? d.spend : undefined,
        instagramSpend: subView !== "facebook" ? (igDaily[i]?.spend ?? 0) : undefined,
        prevFacebookSpend: subView !== "instagram" ? prevFbDaily?.[i]?.spend : undefined,
        prevInstagramSpend: subView !== "facebook" ? prevIgDaily?.[i]?.spend : undefined,
      }));
    }
    const prevDaily: DailyMetrics[] | undefined = prevData?.dailyData;
    return (data.dailyData as DailyMetrics[]).map((d, i) => ({
      date: formatDateLabel(d.date),
      spend: d.spend,
      prevSpend: prevDaily?.[i]?.spend,
    }));
  }, [data, prevData, network, subView]);

  function downloadCsv() {
    if (!data) return;
    let rows: Record<string, any>[] = [];
    if (network === "meta") {
      const fbDaily: FacebookDailyMetrics[] = data.dailyData.facebook;
      const igDaily: InstagramDailyMetrics[] = data.dailyData.instagram;
      if (subView === "facebook") {
        rows = fbDaily.map((d) => ({ date: d.date, network: "facebook", impressions: d.impressions, clicks: d.clicks, spend: d.spend, conversions: d.conversions, reach: d.reach, likes: d.likes, comments: d.comments, shares: d.shares, ctr: d.ctr, cpc: d.cpc, cpm: d.cpm }));
      } else if (subView === "instagram") {
        rows = igDaily.map((d) => ({ date: d.date, network: "instagram", impressions: d.impressions, clicks: d.clicks, spend: d.spend, conversions: d.conversions, reach: d.reach, likes: d.likes, comments: d.comments, saves: d.saves, ctr: d.ctr, cpc: d.cpc, cpm: d.cpm }));
      } else {
        rows = fbDaily.map((d, i) => ({
          date: d.date, network: "meta",
          facebook_spend: d.spend, facebook_impressions: d.impressions, facebook_clicks: d.clicks, facebook_conversions: d.conversions,
          instagram_spend: igDaily[i]?.spend, instagram_impressions: igDaily[i]?.impressions,
          instagram_clicks: igDaily[i]?.clicks, instagram_conversions: igDaily[i]?.conversions,
        }));
      }
    } else {
      rows = (data.dailyData as DailyMetrics[]).map((d) => ({
        date: d.date, network, impressions: d.impressions, clicks: d.clicks, spend: d.spend,
        conversions: d.conversions, ctr: d.ctr, cpc: d.cpc, cpm: d.cpm,
      }));
    }
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${network}${network === "meta" ? "_" + subView : ""}_${range.start}_to_${range.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Page>
      <HeaderRow>
        <Dots>{meta.accents.map((c, i) => <Dot key={i} $bg={c} />)}</Dots>
        <Title>{meta.label}</Title>
      </HeaderRow>
      <Sub>{formatDateLong(range.start)} – {formatDateLong(range.end)} · vs. previous period</Sub>

      {network === "meta" && (
        <Segmented>
          {(["combined", "facebook", "instagram"] as MetaView[]).map((v) => (
            <SegButton key={v} $active={subView === v} onClick={() => selectSubView(v)}>
              {v === "combined" ? "Combined" : v === "facebook" ? "Facebook" : "Instagram"}
            </SegButton>
          ))}
        </Segmented>
      )}

      <Controls>
        <Field>From
          <input type="date" value={range.start} onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))} />
          <Hint>{formatDateLong(range.start)}</Hint>
        </Field>
        <Field>To
          <input type="date" value={range.end} onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))} />
          <Hint>{formatDateLong(range.end)}</Hint>
        </Field>
        <ExportButton onClick={downloadCsv} disabled={!data || !!error}>Export CSV</ExportButton>
      </Controls>

      {error && (
        <ErrorBanner>
          <ErrorText>Couldn't load {meta.label} data: {error}</ErrorText>
          <BackButton onClick={backToLastGoodRange}>Back to {formatDateLabel(lastGoodRange.start)} → {formatDateLabel(lastGoodRange.end)}</BackButton>
        </ErrorBanner>
      )}

      {!error && (!data || !combined) && (
        <>
          <KpiRow>
            {[0, 1, 2, 3].map((i) => (
              <Kpi key={i}>
                <SkeletonBlock $h="10px" $w="50%" style={{ marginBottom: "10px" }} />
                <SkeletonBlock $h="22px" $w="70%" />
              </Kpi>
            ))}
          </KpiRow>
          <SkeletonBlock $h="332px" />
        </>
      )}

      {!error && data && combined && (
        <>
          <KpiRow>
            {([
              ["Spend", combined.spend, combined.deltas.spend, (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
              ["Impressions", combined.impressions, combined.deltas.impressions, (v: number) => v.toLocaleString()],
              ["Clicks", combined.clicks, combined.deltas.clicks, (v: number) => v.toLocaleString()],
              ["Conversions", combined.conversions, combined.deltas.conversions, (v: number) => `${v}`],
            ] as const).map(([label, val, delta, fmt]) => (
              <Kpi key={label}>
                <KpiLabel>{label}</KpiLabel>
                <KpiValue>
                  {fmt(val)}
                  <DeltaPill $up={delta >= 0}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%</DeltaPill>
                </KpiValue>
              </Kpi>
            ))}
          </KpiRow>

          <ChartCard>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: theme.colors.textMuted }} />
                <YAxis tick={{ fontSize: 12, fill: theme.colors.textMuted }} />
                <Tooltip contentStyle={{ background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, borderRadius: 8, color: theme.colors.text }} />
                <Legend />
                {network === "meta" && subView !== "instagram" && (
                  <>
                    <Area type="monotone" dataKey="facebookSpend" name="Facebook spend" stroke={theme.colors.facebook} fill={theme.colors.facebook} fillOpacity={0.12} strokeWidth={2} dot={false} />
                    {prevData && <Line type="monotone" dataKey="prevFacebookSpend" name="Facebook (previous)" stroke={theme.colors.facebook} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />}
                  </>
                )}
                {network === "meta" && subView !== "facebook" && (
                  <>
                    <Area type="monotone" dataKey="instagramSpend" name="Instagram spend" stroke={theme.colors.instagram} fill={theme.colors.instagram} fillOpacity={0.12} strokeWidth={2} dot={false} />
                    {prevData && <Line type="monotone" dataKey="prevInstagramSpend" name="Instagram (previous)" stroke={theme.colors.instagram} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />}
                  </>
                )}
                {network !== "meta" && (
                  <>
                    <Area type="monotone" dataKey="spend" name="Spend" stroke={meta.accents[0]} fill={meta.accents[0]} fillOpacity={0.12} strokeWidth={2} dot={false} />
                    {prevData && <Line type="monotone" dataKey="prevSpend" name="Previous period" stroke={meta.accents[0]} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />}
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
    </Page>
  );
}
