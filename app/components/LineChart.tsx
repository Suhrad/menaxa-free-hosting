import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ApexCharts to avoid SSR issues
const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface ChartData {
  date: string;
  value: number;
}

interface LineChartProps {
  data: ChartData[];
}

export const LineChart: React.FC<LineChartProps> = ({ data }) => {
  // Create series data for ApexCharts
  const series = [
    {
      name: 'Amount (USD)',
      data: data.map(item => item.value)
    }
  ];

  // Format chart options
  const options = {
    chart: {
      type: 'area',
      fontFamily: 'inherit',
      toolbar: {
        show: false,
      },
      animations: {
        enabled: true
      },
      background: 'transparent',
    },
    dataLabels: {
      enabled: false
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'vertical',
        shadeIntensity: 0.5,
        opacityFrom: 0.7,
        opacityTo: 0.1,
        stops: [0, 90, 100]
      }
    },
    stroke: {
      width: 3,
      curve: 'smooth',
      lineCap: 'round',
      colors: ['#6366f1'], // Indigo color
    },
    theme: {
      mode: 'dark'
    },
    grid: {
      borderColor: 'rgba(255, 255, 255, 0.1)',
      strokeDashArray: 3,
      position: 'back',
    },
    xaxis: {
      categories: data.map(item => item.date),
      labels: {
        style: {
          colors: '#94a3b8'
        }
      },
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      },
    },
    yaxis: {
      labels: {
        formatter: (value: number) => {
          return '$' + value.toLocaleString();
        },
        style: {
          colors: '#94a3b8'
        }
      }
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (value: number) => {
          return '$' + value.toLocaleString();
        }
      }
    },
    colors: ['#6366f1'],
  };

  return (
    <div className="w-full h-full">
      {typeof window !== 'undefined' && (
        <ApexChart
          options={options as any}
          series={series}
          type="area"
          height="100%"
        />
      )}
    </div>
  );
}; 