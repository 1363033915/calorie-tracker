import { View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { shortDate } from '../lib/date';
import { colors } from '../lib/theme';

export interface BarDatum {
  date: string;
  intake: number;
  over: boolean;
}

interface Props {
  data: BarDatum[]; // 日期升序
  threshold: number;
  width: number;
  height?: number;
}

const PAD = { top: 16, right: 8, bottom: 22, left: 36 };

export function CalorieBarChart({ data, threshold, width, height = 180 }: Props) {
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;

  const maxVal = Math.max(threshold, ...data.map((d) => d.intake), 1) * 1.12;
  const yOf = (v: number) => PAD.top + plotH * (1 - v / maxVal);

  const n = data.length;
  const slot = plotW / n;
  const barW = Math.max(2, Math.min(slot * 0.7, 26));

  // X 轴最多标 5 个日期，避免拥挤
  const labelEvery = Math.max(1, Math.ceil(n / 5));
  const thresholdY = yOf(threshold);

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Y 轴刻度（0 / 阈值 / 顶部） */}
        {[0, threshold, Math.round(maxVal)].map((v, i) => (
          <SvgText
            key={i}
            x={PAD.left - 6}
            y={yOf(v) + 4}
            fontSize={10}
            fill={colors.textMuted}
            textAnchor="end"
          >
            {Math.round(v)}
          </SvgText>
        ))}

        {/* 阈值虚线 */}
        <Line
          x1={PAD.left}
          y1={thresholdY}
          x2={width - PAD.right}
          y2={thresholdY}
          stroke={colors.danger}
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.7}
        />

        {/* 柱子 */}
        {data.map((d, i) => {
          const cx = PAD.left + slot * (i + 0.5);
          const y = yOf(d.intake);
          const h = PAD.top + plotH - y;
          return (
            <Rect
              key={d.date}
              x={cx - barW / 2}
              y={y}
              width={barW}
              height={Math.max(0, h)}
              rx={2}
              fill={d.over ? colors.danger : colors.intake}
            />
          );
        })}

        {/* 基线 */}
        <Line
          x1={PAD.left}
          y1={PAD.top + plotH}
          x2={width - PAD.right}
          y2={PAD.top + plotH}
          stroke={colors.border}
          strokeWidth={1}
        />

        {/* X 轴日期 */}
        {data.map((d, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <SvgText
              key={`x${d.date}`}
              x={PAD.left + slot * (i + 0.5)}
              y={height - 6}
              fontSize={10}
              fill={colors.textMuted}
              textAnchor="middle"
            >
              {shortDate(d.date)}
            </SvgText>
          ) : null
        )}
      </Svg>
    </View>
  );
}
