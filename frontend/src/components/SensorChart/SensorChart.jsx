import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import "./SensorChart.css";

function SensorChart({
  data = [],
  dataKey,
  title,
  unit = "",
  lineColor = "#6C5CE7",
}) {
  const chartData = data.map((item, index) => ({
    index: index + 1,
    value: Number(item[dataKey]) || 0,
  }));

  return (
    <div className="sensor-chart-card">

      {/* CHART HEADER */}
      <div className="sensor-chart-header">
        <div>
          <h3>{title}</h3>

          <p>
            Last {chartData.length} readings
            {unit ? ` • ${unit}` : ""}
          </p>
        </div>
      </div>


      {/* CHART */}
      <div className="sensor-chart">

        {chartData.length === 0 ? (

          <div className="chart-empty">
            No sensor history available
          </div>

        ) : (

          <ResponsiveContainer
            width="100%"
            height={300}
          >
            <LineChart
              data={chartData}
              margin={{
                top: 15,
                right: 20,
                left: 0,
                bottom: 5,
              }}
            >

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148, 163, 184, 0.12)"
              />

              <XAxis
                dataKey="index"
                tick={{
                  fill: "#94A3B8",
                  fontSize: 11,
                }}
                axisLine={{
                  stroke:
                    "rgba(148, 163, 184, 0.15)",
                }}
                tickLine={false}
              />

              <YAxis
                tick={{
                  fill: "#94A3B8",
                  fontSize: 11,
                }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                contentStyle={{
                  background: "#151B2E",
                  border:
                    "1px solid rgba(108, 92, 231, 0.35)",
                  borderRadius: "10px",
                  color: "#F8FAFC",
                }}
                labelStyle={{
                  color: "#94A3B8",
                }}
                formatter={(value) => [
                  `${value} ${unit}`,
                  title,
                ]}
              />

              <Line
                type="monotone"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={3}
                dot={{
                  r: 3,
                  fill: lineColor,
                }}
                activeDot={{
                  r: 6,
                }}
              />

            </LineChart>
          </ResponsiveContainer>

        )}

      </div>

    </div>
  );
}

export default SensorChart;