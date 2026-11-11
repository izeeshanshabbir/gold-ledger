import React, { useMemo, useState } from 'react';
import { GestureResponderEvent, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { BorderRadius, Colors, Typography, hp, normalize, wp } from '../theme';

export type MarketChartPoint = {
  value: number;
  timestamp: number;
};

type MarketLineChartProps = {
  points: MarketChartPoint[];
  height?: number;
  lineColor: string;
  fillColor: string;
  valueLabel: string;
  formatValue: (value: number) => string;
  formatAxisValue: (value: number) => string;
  formatTimelineLabel: (timestamp: number, spanMs: number) => string;
  footerValueLabel?: string;
  footerChangeColor?: string;
  footerChangePrefix?: string;
  footerChangeValue?: number;
};

type PlotPoint = MarketChartPoint & {
  x: number;
  y: number;
};

const HORIZONTAL_PADDING = wp(3);
const TOP_PADDING = hp(1.2);
const BOTTOM_PADDING = hp(1.4);
const GRID_LINES = 4;
const TICK_COUNT = 3;
const TOOLTIP_WIDTH = wp(34);

const buildSmoothPath = (points: PlotPoint[]) => {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  return points.reduce((path, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }

    const previous = points[index - 1];
    const controlX = previous.x + (point.x - previous.x) / 2;

    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, '');
};

const getTimelineTicks = <T extends MarketChartPoint>(points: T[]) => {
  if (points.length === 0) return [];

  const maxIndex = points.length - 1;

  return Array.from({ length: TICK_COUNT }, (_, index) => {
    const pointIndex = Math.round((index / (TICK_COUNT - 1)) * maxIndex);
    return points[pointIndex];
  });
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const formatTooltipDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const MarketLineChart: React.FC<MarketLineChartProps> = ({
  points,
  height = hp(24),
  lineColor,
  fillColor,
  formatValue,
  formatAxisValue,
  formatTimelineLabel,
  footerValueLabel,
  footerChangeColor,
  footerChangePrefix,
  footerChangeValue,
}) => {
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const chart = useMemo(() => {
    const validPoints = points.filter(
      point =>
        Number.isFinite(point.value) &&
        Number.isFinite(point.timestamp) &&
        point.value >= 0,
    );
    const safePoints =
      validPoints.length > 0
        ? validPoints
        : [{ value: 0, timestamp: Date.now() }];
    const values = safePoints.map(point => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const rawRange = Math.max(max - min, Math.max(max * 0.012, 1));
    const yMin = Math.max(0, min - rawRange * 0.24);
    const yMax = max + rawRange * 0.24;
    const yRange = Math.max(yMax - yMin, 1);

    return {
      validPoints: safePoints,
      yMin,
      yMax,
      yRange,
    };
  }, [points]);

  const plotData = useMemo(() => {
    if (canvasWidth <= 0) return null;

    const plotLeft = HORIZONTAL_PADDING;
    const plotRight = canvasWidth - HORIZONTAL_PADDING;
    const plotTop = TOP_PADDING;
    const plotBottom = height - BOTTOM_PADDING;
    const plotWidth = Math.max(plotRight - plotLeft, 1);
    const plotHeight = Math.max(plotBottom - plotTop, 1);
    const plotPoints: PlotPoint[] = chart.validPoints.map((point, index) => {
      const x =
        chart.validPoints.length === 1
          ? plotLeft + plotWidth
          : plotLeft + (index / (chart.validPoints.length - 1)) * plotWidth;
      const y =
        plotBottom -
        ((point.value - chart.yMin) / chart.yRange) * plotHeight;

      return { ...point, x, y };
    });

    const path = buildSmoothPath(plotPoints);
    const areaPath =
      plotPoints.length > 0
        ? `${path} L ${plotPoints[plotPoints.length - 1].x} ${plotBottom} L ${plotPoints[0].x} ${plotBottom} Z`
        : '';
    const yTicks = Array.from({ length: GRID_LINES + 1 }, (_, index) => {
      const ratio = index / GRID_LINES;
      const value = chart.yMax - ratio * chart.yRange;
      const y = plotTop + ratio * plotHeight;
      return { value, y };
    });

    return {
      areaPath,
      path,
      plotBottom,
      plotLeft,
      plotPoints,
      plotRight,
      plotTop,
      yTicks,
    };
  }, [canvasWidth, chart.validPoints, chart.yMax, chart.yMin, chart.yRange, height]);

  const selectedPoint =
    selectedIndex !== null ? plotData?.plotPoints[selectedIndex] : undefined;
  const selectedTooltipLeft = selectedPoint
    ? clamp(selectedPoint.x - TOOLTIP_WIDTH / 2, 0, canvasWidth - TOOLTIP_WIDTH)
    : 0;
  const selectedTooltipTop = selectedPoint
    ? clamp(selectedPoint.y - hp(6.8), hp(0.2), height - hp(7.4))
    : 0;

  const handleSelectPoint = (event: GestureResponderEvent) => {
    if (!plotData?.plotPoints.length) return;

    const touchX = event.nativeEvent.locationX;
    const nearest = plotData.plotPoints.reduce(
      (best, point, index) => {
        const distance = Math.abs(point.x - touchX);
        return distance < best.distance ? { distance, index } : best;
      },
      { distance: Number.POSITIVE_INFINITY, index: 0 },
    );

    setSelectedIndex(nearest.index);
  };

  const renderChart = () => {
    if (!plotData) return null;
    const activePoint =
      selectedIndex !== null
        ? plotData.plotPoints[selectedIndex]
        : plotData.plotPoints[plotData.plotPoints.length - 1];

    return (
      <Svg width="100%" height={height}>
        <Defs>
          <LinearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={fillColor} stopOpacity="0.28" />
            <Stop offset="1" stopColor={fillColor} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {plotData.yTicks.map(tick => (
          <G key={`grid-${tick.y}`}>
            <Line
              x1={plotData.plotLeft}
              y1={tick.y}
              x2={plotData.plotRight}
              y2={tick.y}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />
          </G>
        ))}

        {plotData.areaPath.length > 0 && (
          <Path d={plotData.areaPath} fill="url(#chartFill)" />
        )}
        {plotData.path.length > 0 && (
          <Path
            d={plotData.path}
            fill="none"
            stroke={lineColor}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {activePoint && (
          <G>
            <Line
              x1={activePoint.x}
              y1={plotData.plotTop}
              x2={activePoint.x}
              y2={plotData.plotBottom}
              stroke={lineColor}
              strokeWidth={1}
              opacity={0.34}
            />
            <Circle
              cx={activePoint.x}
              cy={activePoint.y}
              r={10}
              fill={lineColor}
              opacity={0.12}
            />
            <Circle
              cx={activePoint.x}
              cy={activePoint.y}
              r={4.8}
              fill={Colors.backgroundCard}
              stroke={lineColor}
              strokeWidth={2.4}
            />
          </G>
        )}

      </Svg>
    );
  };

  const latest = chart.validPoints[chart.validPoints.length - 1];
  const first = chart.validPoints[0];
  const change = latest && first ? latest.value - first.value : 0;
  const isPositive = change >= 0;
  const displayPrefix = footerChangePrefix ?? (isPositive ? '+' : '');
  const displayChange = footerChangeValue ?? change;
  const timelineTicks = useMemo(
    () => getTimelineTicks(chart.validPoints),
    [chart.validPoints],
  );
  const spanMs = Math.max(
    (latest?.timestamp ?? 0) - (first?.timestamp ?? 0),
    0,
  );

  return (
    <View style={styles.container}>
      <View style={styles.rangeRow}>
        <Text style={styles.rangeText}>{formatAxisValue(chart.yMax)}</Text>
        <View style={styles.liveBadge}>
          <View style={[styles.liveDot, { backgroundColor: lineColor }]} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>

      <View style={styles.canvas}>
        <View
          style={styles.canvasSizer}
          onLayout={event => {
            setCanvasWidth(event.nativeEvent.layout.width);
          }}
          onStartShouldSetResponder={() => true}
          onResponderGrant={handleSelectPoint}
          onResponderMove={handleSelectPoint}
        >
          <View style={styles.svgWrap}>
            {canvasWidth > 0 && renderChart()}
          </View>
          {selectedPoint && (
            <View
              pointerEvents="none"
              style={[
                styles.tooltip,
                {
                  left: selectedTooltipLeft,
                  top: selectedTooltipTop,
                  borderColor: lineColor,
                },
              ]}
            >
              <Text style={styles.tooltipValue}>
                {formatValue(selectedPoint.value)}
              </Text>
              <Text style={styles.tooltipDate}>
                {formatTooltipDate(selectedPoint.timestamp)}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.timelineRow}>
        {timelineTicks.map((tick, index) => (
          <View
            key={`${tick.timestamp}-${index}`}
            style={[
              styles.timelineItem,
              index === 1 && styles.timelineItemCenter,
              index === timelineTicks.length - 1 && styles.timelineItemEnd,
            ]}
          >
            <Text style={styles.timelineLabel}>
              {formatTimelineLabel(tick.timestamp, spanMs)}
            </Text>
            <Text style={styles.timelineValue}>{formatAxisValue(tick.value)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>
          {footerValueLabel ?? 'Timeline move'}
        </Text>
        <Text
          style={[
            styles.footerValue,
            {
              color:
                footerChangeColor ??
                (isPositive ? Colors.success : Colors.danger),
            },
          ]}
        >
          {displayPrefix}
          {formatValue(displayChange)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: wp(3),
    paddingTop: hp(1.1),
    paddingBottom: hp(1.2),
    overflow: 'hidden',
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(0.4),
  },
  rangeText: {
    color: Colors.textMuted,
    fontSize: normalize(10),
    fontWeight: Typography.fontWeight.semibold,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BorderRadius.round,
    paddingHorizontal: wp(2.4),
    paddingVertical: hp(0.55),
  },
  liveDot: {
    width: wp(1.8),
    height: wp(1.8),
    borderRadius: wp(0.9),
    marginRight: wp(1.4),
  },
  liveText: {
    color: Colors.text,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  canvas: {
    width: '100%',
    overflow: 'hidden',
  },
  canvasSizer: {
    width: '100%',
    position: 'relative',
  },
  svgWrap: {
    width: '100%',
    alignItems: 'center',
  },
  tooltip: {
    position: 'absolute',
    width: TOOLTIP_WIDTH,
    backgroundColor: 'rgba(13,13,13,0.94)',
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: wp(2.2),
    paddingVertical: hp(0.7),
  },
  tooltipValue: {
    color: Colors.text,
    fontSize: Typography.fontSize.xs,
    fontWeight: '800',
  },
  tooltipDate: {
    color: Colors.textSecondary,
    fontSize: normalize(9),
    marginTop: hp(0.25),
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: wp(0.6),
    marginTop: hp(0.5),
  },
  timelineItem: {
    flex: 1,
    alignItems: 'flex-start',
  },
  timelineItemCenter: {
    alignItems: 'center',
  },
  timelineItemEnd: {
    alignItems: 'flex-end',
  },
  timelineLabel: {
    color: Colors.textSecondary,
    fontSize: normalize(10),
    fontWeight: Typography.fontWeight.semibold,
  },
  timelineValue: {
    color: Colors.textMuted,
    fontSize: normalize(9),
    marginTop: hp(0.2),
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: hp(1),
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: hp(0.9),
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
  },
  footerValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '800',
  },
});
