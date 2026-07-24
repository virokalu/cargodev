"use client";

// Shared "the segment under the cursor grows" hover treatment for the
// clickable dashboard charts — the same visual idea as the KPI cards
// lifting on hover, adapted per shape: a pie slice pops outward, a bar
// thickens in place with a lifted shadow (not stretched toward its value
// axis — see makeGrowingBarShape for why). Either way, the hovered segment
// itself changes, rather than the rest of the chart dimming around it.

import { useState } from "react";
import { Rectangle, Sector, type PieSectorDataItem } from "recharts";

export function useHoveredIndex() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  return {
    hoveredIndex,
    onEnter: (index: number) => setHoveredIndex(index),
    onLeave: () => setHoveredIndex(null),
  };
}

const PIE_GROW_PX = 10;

/** Pie `activeShape` renderer — pass as `activeShape={renderActivePieSlice}`
 * alongside `activeIndex={hoveredIndex ?? undefined}`. The hovered slice
 * pushes outward from the circle instead of the whole pie dimming around it. */
export function renderActivePieSlice(props: PieSectorDataItem) {
  return (
    <Sector
      {...props}
      outerRadius={(props.outerRadius ?? 0) + PIE_GROW_PX}
      style={{ cursor: "pointer" }}
    />
  );
}

const BAR_THICKEN_PX = 6;
const BAR_HOVER_SHADOW = "drop-shadow(0 3px 5px rgb(0 0 0 / 0.28))";

/** Bar `shape` renderer — the hovered bar thickens in place (grows in the
 * cross-axis direction only, centred on its own middle) plus a lifted
 * drop-shadow, rather than stretching toward its value axis. Stretching the
 * value-axis length reads as "the number changed"; a bar chart's length
 * *is* the data, so that's a real, misleading side effect a pie's outward
 * pop doesn't have (a pie's radius isn't what encodes its value). `orientation`
 * matches the chart's own bar direction: "vertical" bars (a plain BarChart,
 * values rising off the x-axis) thicken sideways (width); "horizontal" bars
 * (a BarChart with layout="vertical", values extending off the y-axis)
 * thicken vertically (height). `colorForIndex`, if given, colours each bar
 * individually (replaces per-bar `Cell` colouring, which doesn't compose
 * with a custom shape function). */
export function makeGrowingBarShape(
  hoveredIndex: number | null,
  orientation: "vertical" | "horizontal",
  colorForIndex?: (index: number) => string
) {
  return function GrowingBar(props: {
    x: number;
    y: number;
    width: number;
    height: number;
    radius?: number | [number, number, number, number];
    fill?: string;
    index: number;
  }) {
    const { x, y, width, height, radius, index } = props;
    const isActive = hoveredIndex === index;
    const grow = isActive ? BAR_THICKEN_PX : 0;
    const fill = colorForIndex ? colorForIndex(index) : props.fill;
    const style = { cursor: "pointer", filter: isActive ? BAR_HOVER_SHADOW : undefined };

    return orientation === "vertical" ? (
      <Rectangle x={x - grow / 2} y={y} width={width + grow} height={height} radius={radius} fill={fill} style={style} />
    ) : (
      <Rectangle x={x} y={y - grow / 2} width={width} height={height + grow} radius={radius} fill={fill} style={style} />
    );
  };
}
