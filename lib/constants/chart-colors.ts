// Rotating palette for dashboard charts whose categories are org-specific
// and not known ahead of time (e.g. auction halls, transport companies,
// brands) — unlike FC/FL or Shipment Status, these can't be driven by a
// static ChartConfig key per slice/bar, so each item just gets the next
// colour in this list instead of a fixed one flat colour for the whole chart.
export const ROTATING_CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];
