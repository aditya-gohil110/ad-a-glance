import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import Papa from "papaparse";
import { FaFacebookF, FaInstagram, FaGoogle, FaLinkedinIn } from "react-icons/fa";
import { getSummary } from "../api/client";
import { theme } from "../theme";
import type { MetricsSummaryResponse, PlatformSummary } from "../types";

const Page = styled.div`padding: 2rem; max-width: 1200px; margin: 0 auto;`;

const HeaderTop = styled.div`display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;`;
const Heading = styled.h1`font-size: 1.5rem; margin-bottom: 0.25rem;`;
const Sub = styled.p`color: ${theme.colors.textMuted}; font-size: 0.9rem; margin: 0;`;

const ExportAllButton = styled.button`
  background: ${theme.colors.primary}; color: white; border: none;
  border-radius: 8px; padding: 0.55rem 1rem; font-size: 0.85rem; font-weight: 600; cursor: pointer;
  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`;

const InsightBanner = styled.div<{ $accent: string }>`
  display: flex; align-items: center; gap: 0.7rem;
  background: ${theme.colors.surface}; border: 1px solid ${theme.colors.border};
  border-left: 3px solid ${(p) => p.$accent};
  border-radius: ${theme.radius};
  padding: 0.9rem 1.1rem;
  margin-bottom: 1.5rem;
  font-size: 0.85rem;
  color: ${theme.colors.text};
`;

const InsightDot = styled.span<{ $bg: string }>`
  width: 8px; height: 8px; border-radius: 50%; background: ${(p) => p.$bg}; flex-shrink: 0;
`;

const Grid = styled.div`display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 2rem;`;

const Card = styled.button<{ $accent: string }>`
  text-align: left;
  border: 1px solid ${theme.colors.border};
  border-top: 3px solid ${(p) => p.$accent};
  border-radius: ${theme.radius};
  padding: 1.25rem;
  background: ${theme.colors.surface};
  box-shadow: ${theme.shadow};
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 0 1px ${(p) => p.$accent}66, 0 10px 24px rgba(0,0,0,0.5);
  }
`;

const CardTop = styled.div`display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.9rem;`;

const Badge = styled.span<{ $bg: string }>`
  width: 26px; height: 26px; border-radius: 50%; background: ${(p) => p.$bg};
  color: white; display: flex; align-items: center; justify-content: center;
  font-size: 0.7rem; font-weight: 700; font-family: ${theme.font.display};
`;

const PlatformName = styled.span`font-weight: 600; font-size: 0.95rem;`;
const Spend = styled.div`font-family: ${theme.font.mono}; font-size: 1.6rem; font-weight: 600; letter-spacing: -0.02em;`;
const Meta = styled.div`display: flex; justify-content: space-between; align-items: baseline; margin-top: 0.6rem; font-size: 0.8rem; color: ${theme.colors.textMuted};`;
const Delta = styled.span<{ $up: boolean }>`font-weight: 600; color: ${(p) => (p.$up ? theme.colors.positive : theme.colors.negative)};`;

const ChartCard = styled.div`background: ${theme.colors.surface}; border: 1px solid ${theme.colors.border}; border-radius: ${theme.radius}; padding: 1.5rem; box-shadow: ${theme.shadow};`;
const ChartHeading = styled.h2`font-size: 1rem; font-weight: 600; margin-bottom: 1rem; color: ${theme.colors.text};`;

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

const SkeletonCard = styled.div`
  border: 1px solid ${theme.colors.border}; border-radius: ${theme.radius};
  padding: 1.25rem; background: ${theme.colors.surface};
  display: flex; flex-direction: column; gap: 0.7rem;
`;

const SkeletonRow = styled.div`display: flex; align-items: center; gap: 0.6rem;`;

const SkeletonCircle = styled.div`
  width: 26px; height: 26px; border-radius: 50%; background: ${theme.colors.border};
  animation: ${pulse} 1.4s ease-in-out infinite; flex-shrink: 0;
`;

function pctDelta(curr: number, prev: number) {
  if (prev === 0) return 0;
  return ((curr - prev) / prev) * 100;
}

function formatDateLabel(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildSparkline(values: number[], width = 220, height = 32) {
  if (values.length === 0) return { line: "", area: "" };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1 || 1);
  const line = values
    .map((v, i) => `${(i * stepX).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`)
    .join(" ");
  const area = `${line} ${width},${height} 0,${height}`;
  return { line, area };
}

function widget(label: string, Icon: React.ComponentType<{ size?: number }>, accent: string, p: PlatformSummary, path: string) {
  return {
    label, Icon, accent, path,
    totals: p.totals, prevTotals: p.previousTotals,
    delta: pctDelta(p.totals.spend, p.previousTotals.spend),
    sparkline: buildSparkline(p.dailyData.map((d) => d.spend)),
  };
}

export default function Dashboard() {
  const [data, setData] = useState<MetricsSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getSummary().then(setData).catch((e) => setError(e.message));
  }, []);

  const widgets = useMemo(() => {
    if (!data) return [];
    return [
      widget("Facebook", FaFacebookF, theme.colors.facebook, data.meta.facebook, "/meta?view=facebook"),
      widget("Instagram", FaInstagram, theme.colors.instagram, data.meta.instagram, "/meta?view=instagram"),
      widget("Google", FaGoogle, theme.colors.google, data.google, "/google"),
      widget("LinkedIn", FaLinkedinIn, theme.colors.linkedin, data.linkedin, "/linkedin"),
    ];
  }, [data]);

  const insight = useMemo(() => {
    const withEfficiency = widgets
      .filter((w) => w.totals.conversions > 0)
      .map((w) => ({
        ...w,
        costPerConversion: w.totals.spend / w.totals.conversions,
        prevCostPerConversion: w.prevTotals.conversions > 0 ? w.prevTotals.spend / w.prevTotals.conversions : null,
      }));
    if (withEfficiency.length === 0) return null;
    const best = withEfficiency.reduce((a, b) => (a.costPerConversion < b.costPerConversion ? a : b));
    const change = best.prevCostPerConversion
      ? ((best.costPerConversion - best.prevCostPerConversion) / best.prevCostPerConversion) * 100
      : null;
    return { ...best, change };
  }, [widgets]);

  const trendData = useMemo(() => {
    if (!data) return [];
    const fb = data.meta.facebook.dailyData;
    const ig = data.meta.instagram.dailyData;
    const g = data.google.dailyData;
    const li = data.linkedin.dailyData;
    return fb.map((d, i) => ({
      date: formatDateLabel(d.date),
      facebook: d.spend,
      instagram: ig[i]?.spend ?? 0,
      google: g[i]?.spend ?? 0,
      linkedin: li[i]?.spend ?? 0,
    }));
  }, [data]);

  function downloadAllCsv() {
    if (!data) return;
    const rows = widgets.map((w) => ({
      platform: w.label,
      spend: w.totals.spend,
      previous_spend: w.prevTotals.spend,
      spend_change_pct: pctDelta(w.totals.spend, w.prevTotals.spend).toFixed(1),
      impressions: w.totals.impressions,
      clicks: w.totals.clicks,
      conversions: w.totals.conversions,
      cost_per_conversion: w.totals.conversions > 0 ? (w.totals.spend / w.totals.conversions).toFixed(2) : "",
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ad_a_glance_overview_${data.period.startDate}_to_${data.period.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (error) return <Page>Couldn't load metrics: {error}</Page>;

  return (
    <Page>
      <HeaderTop>
        <div>
          <Heading>Overview</Heading>
          <Sub>Last 30 days across all platforms</Sub>
        </div>
        <ExportAllButton onClick={downloadAllCsv} disabled={!data}>Export all (CSV)</ExportAllButton>
      </HeaderTop>

      {!data ? (
        <>
          <SkeletonBlock $h="52px" $w="100%" style={{ marginBottom: "1.5rem" }} />
          <Grid>
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i}>
                <SkeletonRow>
                  <SkeletonCircle />
                  <SkeletonBlock $h="14px" $w="70px" />
                </SkeletonRow>
                <SkeletonBlock $h="28px" $w="100px" />
                <SkeletonBlock $h="32px" />
                <SkeletonBlock $h="12px" $w="80%" />
              </SkeletonCard>
            ))}
          </Grid>
          <SkeletonBlock $h="332px" />
        </>
      ) : (
        <>
          {insight && (
            <InsightBanner $accent={insight.accent}>
              <InsightDot $bg={insight.accent} />
              <span>
                <strong>{insight.label}</strong> was your most cost-efficient channel this period — ${insight.costPerConversion.toFixed(2)} per conversion
                {insight.change !== null && (
                  <>, {insight.change <= 0 ? "down" : "up"} {Math.abs(insight.change).toFixed(1)}% vs last period</>
                )}
                .
              </span>
            </InsightBanner>
          )}

          <Grid>
            {widgets.map((w) => (
              <Card key={w.label} $accent={w.accent} onClick={() => navigate(w.path)}>
                <CardTop>
                  <Badge $bg={w.accent}><w.Icon size={12} /></Badge>
                  <PlatformName>{w.label}</PlatformName>
                </CardTop>
                <Spend>${w.totals.spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Spend>
                <svg width="100%" height="32" viewBox="0 0 220 32" preserveAspectRatio="none" style={{ display: "block", margin: "10px 0" }}>
                  <polygon points={w.sparkline.area} fill={w.accent} fillOpacity={0.14} />
                  <polyline points={w.sparkline.line} fill="none" stroke={w.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <Meta>
                  <span>{w.totals.impressions.toLocaleString()} impr · {w.totals.clicks.toLocaleString()} clicks</span>
                  <Delta $up={w.delta >= 0}>{w.delta >= 0 ? "▲" : "▼"} {Math.abs(w.delta).toFixed(1)}%</Delta>
                </Meta>
              </Card>
            ))}
          </Grid>

          <ChartCard>
            <ChartHeading>Spend by platform · last 30 days</ChartHeading>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: theme.colors.textMuted }} interval={4} />
                <YAxis tick={{ fontSize: 12, fill: theme.colors.textMuted }} />
                <Tooltip contentStyle={{ background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, borderRadius: 8, color: theme.colors.text }} />
                <Legend />
                <Line type="monotone" dataKey="facebook" name="Facebook" stroke={theme.colors.facebook} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="instagram" name="Instagram" stroke={theme.colors.instagram} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="google" name="Google" stroke={theme.colors.google} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="linkedin" name="LinkedIn" stroke={theme.colors.linkedin} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
    </Page>
  );
}
