'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from "next-themes";
import React from 'react';

interface PollOption {
  id: string;
  option_text: string;
  votes_count: number;
}

interface PollResultsChartProps {
  pollOptions: PollOption[];
  colorIndex?: number; // New optional prop for color index
}

export default function PollResultsChart({ pollOptions, colorIndex = 0 }: PollResultsChartProps) {
  const totalVotes = pollOptions.reduce((sum, option) => sum + option.votes_count, 0);
  const { theme } = useTheme();

  // Determine stroke color for grid and axes based on theme
  const strokeColor = theme === "dark" ? "hsl(var(--foreground))" : "hsl(var(--foreground))"; // Use foreground color for clear grid in light mode
  const axisColor = theme === "dark" ? "oklch(99% 0 0)" : "hsl(var(--foreground))"; // Keep foreground for axis, primary for stroke

  // Dynamically select chart bar color based on colorIndex
  const chartColors = [
    "--chart-1",
    "--chart-2",
    "--chart-3",
    "--chart-4",
    "--chart-5",
  ];
  const effectiveColorIndex = colorIndex % chartColors.length;
  const selectedColorVar = chartColors[effectiveColorIndex];

  const [barFillColor, setBarFillColor] = React.useState("hsl(var(--primary))");

  React.useEffect(() => {
    // Client-side execution to get computed style
    if (typeof window !== 'undefined') {
      const style = getComputedStyle(document.documentElement);
      setBarFillColor(style.getPropertyValue(selectedColorVar).trim());
    }
  }, [selectedColorVar, theme]); // Recalculate if color variable or theme changes

  const chartData = pollOptions.map(option => ({
    name: option.option_text,
    Votes: option.votes_count,
    Percentage: totalVotes > 0 ? (option.votes_count / totalVotes) * 100 : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <XAxis dataKey="name" stroke={theme === "dark" ? axisColor : "#000000"} tick={{ fill: axisColor }} axisLine={true} tickLine={true} strokeWidth={2} />
        <YAxis stroke={theme === "dark" ? axisColor : "#000000"} tick={{ fill: axisColor }} axisLine={true} tickLine={true} strokeWidth={2} />
        <Tooltip formatter={(value, name) => [`${value} (${value === 0 ? 0 : (value / totalVotes * 100).toFixed(2)}%)`, name]} />
        <Legend />
        <Bar dataKey="Votes" fill={barFillColor} />
      </BarChart>
    </ResponsiveContainer>
  );
}
