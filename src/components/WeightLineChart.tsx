import { View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { shortDate } from '../lib/date';
import { colors } from '../lib/theme';

export interface LineDatum {
  date: string;
  weightKg: number;
}

interface Props {
  data: LineDatum[]; // 日期升序
  width: number;
  height?: number;
}

const PAD = { top: 16, right: 12, bottom: 22, left: 40 };

/** Catmull-Rom 转 cubic Bézier，得到平滑曲线路径 */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function WeightLineChart({ data, width, height = 180 }: Props) {
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const n = data.length;

  const vals = data.map((d) => d.weightKg);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (min === max) {
    min -= 0.5;
    max += 0.5;
  }
  const span = max - min;
  // 上下各留 8% 边距
  const lo = min - span * 0.08;
  const hi = max + span * 0.08;

  const xOf = (i: number) => PAD.left + (n === 1 ? plotW / 2 : (plotW * i) / (n - 1));
  const yOf = (v: number) => PAD.top + plotH * (1 - (v - lo) / (hi - lo));

  const pts = data.map((d, i) => ({ x: xOf(i), y: yOf(d.weightKg) }));
  const path = smoothPath(pts);
  const areaPath = path
    ? `${path} L ${pts[n - 1].x} ${PAD.top + plotH} L ${pts[0].x} ${PAD.top + plotH} Z`
    : '';

  const labelEvery = Math.max(1, Math.ceil(n / 5));
  const yTicks = [hi, (hi + lo) / 2, lo];

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Y 轴刻度线 */}
        {yTicks.map((v, i) => (
          <Line
            key={`g${i}`}
            x1={PAD.left}
            y1={yOf(v)}
            x2={width - PAD.right}
            y2={yOf(v)}
            stroke={colors.border}
            strokeWidth={1}
            opacity={i === 2 ? 1 : 0.5}
          />
        ))}
        {yTicks.map((v, i) => (
          <SvgText
            key={`yl${i}`}
            x={PAD.left - 6}
            y={yOf(v) + 4}
            fontSize={10}
            fill={colors.textMuted}
            textAnchor="end"
          >
            {v.toFixed(1)}
          </SvgText>
        ))}

        {/* 面积 + 曲线 */}
        {areaPath ? <Path d={areaPath} fill={colors.primary} opacity={0.08} /> : null}
        {path ? <Path d={path} stroke={colors.primary} strokeWidth={2.5} fill="none" /> : null}

        {/* 数据点（点数不多时显示，避免拥挤） */}
        {n <= 31 &&
          pts.map((p, i) => (
            <Circle key={`p${i}`} cx={p.x} cy={p.y} r={2.5} fill={colors.primary} />
          ))}

        {/* X 轴日期 */}
        {data.map((d, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <SvgText
              key={`x${d.date}`}
              x={xOf(i)}
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
