import {
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ChartPieIcon
} from "@heroicons/react/24/solid";
import {
  Card,
  CardBody,
  CardHeader,
  Input,
  Tab,
  TabPanel,
  Tabs,
  TabsBody,
  TabsHeader,
  Typography
} from "@material-tailwind/react";
import { useEffect, useState } from "react";
import Chart from "react-apexcharts";

export function Analytics() {
  const [transactions, setTransactions] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [activeTab, setActiveTab] = useState("categories");

  // Cargar transacciones desde localStorage
  useEffect(() => {
    const savedTransactions = localStorage.getItem("transactions");
    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
    }
  }, []);

  // Obtener datos para gráfico de gastos por categoría
  const getCategoryData = () => {
    const categoryTotals = {};

    transactions
      .filter((t) => {
        if (t.type !== "expense") return false;
        const transactionMonth = t.date.slice(0, 7);
        return transactionMonth === selectedMonth;
      })
      .forEach((t) => {
        if (!categoryTotals[t.category]) {
          categoryTotals[t.category] = 0;
        }
        categoryTotals[t.category] += parseFloat(t.amount);
      });

    const categories = Object.keys(categoryTotals);
    const amounts = Object.values(categoryTotals);

    return {
      categories,
      amounts,
      total: amounts.reduce((sum, val) => sum + val, 0),
    };
  };

  // Obtener datos para gráfico de ingresos vs gastos mensual
  const getIncomeVsExpensesData = () => {
    const monthlyData = {};

    transactions.forEach((t) => {
      const month = t.date.slice(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expense: 0 };
      }
      monthlyData[month][t.type] += parseFloat(t.amount);
    });

    const months = Object.keys(monthlyData).sort();
    const incomes = months.map((m) => monthlyData[m].income);
    const expenses = months.map((m) => monthlyData[m].expense);

    return { months, incomes, expenses };
  };

  // Obtener datos para tendencias (últimos 30 días)
  const getTrendData = () => {
    const last30Days = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      last30Days.push(date.toISOString().slice(0, 10));
    }

    const dailyData = {};
    last30Days.forEach((date) => {
      dailyData[date] = { income: 0, expense: 0, balance: 0 };
    });

    transactions
      .filter((t) => {
        const transactionDate = t.date;
        return last30Days.includes(transactionDate);
      })
      .forEach((t) => {
        const date = t.date;
        dailyData[date][t.type] += parseFloat(t.amount);
      });

    // Calcular balance acumulado
    let runningBalance = 0;
    last30Days.forEach((date) => {
      runningBalance += dailyData[date].income - dailyData[date].expense;
      dailyData[date].balance = runningBalance;
    });

    return {
      dates: last30Days,
      incomes: last30Days.map((d) => dailyData[d].income),
      expenses: last30Days.map((d) => dailyData[d].expense),
      balances: last30Days.map((d) => dailyData[d].balance),
    };
  };

  // Obtener datos semanales (últimas 12 semanas)
  const getWeeklyData = () => {
    const weeks = [];
    const today = new Date();

    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (i * 7) - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      weeks.push({
        label: `S${12 - i}`,
        start: weekStart.toISOString().slice(0, 10),
        end: weekEnd.toISOString().slice(0, 10),
        income: 0,
        expense: 0,
      });
    }

    transactions.forEach((t) => {
      const transactionDate = new Date(t.date);
      weeks.forEach((week) => {
        const weekStart = new Date(week.start);
        const weekEnd = new Date(week.end);
        if (transactionDate >= weekStart && transactionDate <= weekEnd) {
          week[t.type] += parseFloat(t.amount);
        }
      });
    });

    return {
      labels: weeks.map((w) => w.label),
      incomes: weeks.map((w) => w.income),
      expenses: weeks.map((w) => w.expense),
    };
  };

  const categoryData = getCategoryData();
  const incomeVsExpenses = getIncomeVsExpensesData();
  const trendData = getTrendData();
  const weeklyData = getWeeklyData();

  // Configuración de gráfico de pastel - Gastos por categoría
  const pieChartOptions = {
    chart: {
      type: "donut",
      fontFamily: "inherit",
    },
    labels: categoryData.categories,
    colors: [
      "#FF6384",
      "#36A2EB",
      "#FFCE56",
      "#4BC0C0",
      "#9966FF",
      "#FF9F40",
      "#FF6384",
      "#C9CBCF",
      "#4BC0C0",
      "#FF6384",
    ],
    legend: {
      position: "bottom",
    },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total",
              formatter: () =>
                `$${categoryData.total.toLocaleString("es-ES", {
                  minimumFractionDigits: 2,
                })}`,
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `${val.toFixed(1)}%`,
    },
    tooltip: {
      y: {
        formatter: (val) =>
          `$${val.toLocaleString("es-ES", { minimumFractionDigits: 2 })}`,
      },
    },
  };

  // Configuración de gráfico de barras - Ingresos vs Gastos
  const barChartOptions = {
    chart: {
      type: "bar",
      fontFamily: "inherit",
      toolbar: {
        show: true,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
        endingShape: "rounded",
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    xaxis: {
      categories: incomeVsExpenses.months.map((m) => {
        const [year, month] = m.split("-");
        const date = new Date(year, month - 1);
        return date.toLocaleDateString("es-ES", {
          month: "short",
          year: "numeric",
        });
      }),
    },
    yaxis: {
      title: {
        text: "$ (pesos)",
      },
      labels: {
        formatter: (val) => `$${val.toLocaleString("es-ES")}`,
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter: (val) =>
          `$${val.toLocaleString("es-ES", { minimumFractionDigits: 2 })}`,
      },
    },
    colors: ["#10B981", "#EF4444"],
    legend: {
      position: "top",
    },
  };

  const barChartSeries = [
    {
      name: "Ingresos",
      data: incomeVsExpenses.incomes,
    },
    {
      name: "Gastos",
      data: incomeVsExpenses.expenses,
    },
  ];

  // Configuración de gráfico de línea - Tendencias diarias
  const lineChartOptions = {
    chart: {
      type: "line",
      fontFamily: "inherit",
      toolbar: {
        show: true,
      },
      zoom: {
        enabled: true,
      },
    },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    xaxis: {
      categories: trendData.dates.map((d) => {
        const date = new Date(d);
        return date.toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
        });
      }),
      labels: {
        rotate: -45,
        rotateAlways: true,
      },
    },
    yaxis: {
      title: {
        text: "$ (pesos)",
      },
      labels: {
        formatter: (val) => `$${val.toLocaleString("es-ES")}`,
      },
    },
    tooltip: {
      y: {
        formatter: (val) =>
          `$${val.toLocaleString("es-ES", { minimumFractionDigits: 2 })}`,
      },
    },
    colors: ["#10B981", "#EF4444", "#3B82F6"],
    legend: {
      position: "top",
    },
    grid: {
      borderColor: "#e7e7e7",
      row: {
        colors: ["#f3f3f3", "transparent"],
        opacity: 0.5,
      },
    },
  };

  const lineChartSeries = [
    {
      name: "Ingresos",
      data: trendData.incomes,
    },
    {
      name: "Gastos",
      data: trendData.expenses,
    },
    {
      name: "Balance Acumulado",
      data: trendData.balances,
    },
  ];

  // Configuración de gráfico de área - Tendencias semanales
  const areaChartOptions = {
    chart: {
      type: "area",
      fontFamily: "inherit",
      toolbar: {
        show: true,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    xaxis: {
      categories: weeklyData.labels,
    },
    yaxis: {
      title: {
        text: "$ (pesos)",
      },
      labels: {
        formatter: (val) => `$${val.toLocaleString("es-ES")}`,
      },
    },
    tooltip: {
      y: {
        formatter: (val) =>
          `$${val.toLocaleString("es-ES", { minimumFractionDigits: 2 })}`,
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
      },
    },
    colors: ["#10B981", "#EF4444"],
    legend: {
      position: "top",
    },
  };

  const areaChartSeries = [
    {
      name: "Ingresos",
      data: weeklyData.incomes,
    },
    {
      name: "Gastos",
      data: weeklyData.expenses,
    },
  ];

  return (
    <div className="mt-12">
      {/* Encabezado */}
      <div className="mb-6">
        <Typography variant="h4" color="blue-gray" className="mb-2">
          Análisis y Visualización
        </Typography>
        <Typography variant="small" className="font-normal text-blue-gray-500">
          Explora tus finanzas con gráficos interactivos
        </Typography>
      </div>

      {/* Tabs para diferentes visualizaciones */}
      <Tabs value={activeTab} className="mb-6">
        <TabsHeader
          className="bg-blue-gray-50"
          indicatorProps={{
            className: "bg-blue-500 shadow-md",
          }}
        >
          <Tab
            value="categories"
            onClick={() => setActiveTab("categories")}
            className={activeTab === "categories" ? "text-white" : ""}
          >
            <div className="flex items-center gap-2">
              <ChartPieIcon className="h-5 w-5" />
              Por Categoría
            </div>
          </Tab>
          <Tab
            value="comparison"
            onClick={() => setActiveTab("comparison")}
            className={activeTab === "comparison" ? "text-white" : ""}
          >
            <div className="flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5" />
              Ingresos vs Gastos
            </div>
          </Tab>
          <Tab
            value="trends"
            onClick={() => setActiveTab("trends")}
            className={activeTab === "trends" ? "text-white" : ""}
          >
            <div className="flex items-center gap-2">
              <ArrowTrendingUpIcon className="h-5 w-5" />
              Tendencias
            </div>
          </Tab>
        </TabsHeader>

        <TabsBody>
          {/* Gráfico de Gastos por Categoría */}
          <TabPanel value="categories">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="border border-blue-gray-100 shadow-sm">
                <CardHeader
                  floated={false}
                  shadow={false}
                  color="transparent"
                  className="m-0 p-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <Typography variant="h6" color="blue-gray">
                        Gastos por Categoría
                      </Typography>
                      <Typography
                        variant="small"
                        className="font-normal text-blue-gray-500 mt-1"
                      >
                        Distribución de gastos del mes
                      </Typography>
                    </div>
                    <Input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-48"
                    />
                  </div>
                </CardHeader>
                <CardBody>
                  {categoryData.amounts.length > 0 ? (
                    <Chart
                      options={pieChartOptions}
                      series={categoryData.amounts}
                      type="donut"
                      height={400}
                    />
                  ) : (
                    <div className="h-96 flex items-center justify-center">
                      <Typography color="blue-gray" className="text-center">
                        No hay gastos registrados para este mes
                      </Typography>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Tabla de categorías */}
              <Card className="border border-blue-gray-100 shadow-sm">
                <CardHeader
                  floated={false}
                  shadow={false}
                  color="transparent"
                  className="m-0 p-6"
                >
                  <Typography variant="h6" color="blue-gray">
                    Desglose Detallado
                  </Typography>
                  <Typography
                    variant="small"
                    className="font-normal text-blue-gray-500 mt-1"
                  >
                    Montos por categoría
                  </Typography>
                </CardHeader>
                <CardBody className="overflow-x-scroll px-0 pt-0 pb-2">
                  {categoryData.categories.length > 0 ? (
                    <table className="w-full min-w-max table-auto">
                      <thead>
                        <tr>
                          <th className="border-b border-blue-gray-50 py-3 px-6 text-left">
                            <Typography
                              variant="small"
                              className="font-bold uppercase text-blue-gray-400"
                            >
                              Categoría
                            </Typography>
                          </th>
                          <th className="border-b border-blue-gray-50 py-3 px-6 text-right">
                            <Typography
                              variant="small"
                              className="font-bold uppercase text-blue-gray-400"
                            >
                              Monto
                            </Typography>
                          </th>
                          <th className="border-b border-blue-gray-50 py-3 px-6 text-right">
                            <Typography
                              variant="small"
                              className="font-bold uppercase text-blue-gray-400"
                            >
                              %
                            </Typography>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryData.categories.map((category, index) => {
                          const amount = categoryData.amounts[index];
                          const percentage = (
                            (amount / categoryData.total) *
                            100
                          ).toFixed(1);
                          return (
                            <tr key={category}>
                              <td className="py-3 px-6 border-b border-blue-gray-50">
                                <Typography
                                  variant="small"
                                  className="font-semibold text-blue-gray-600"
                                >
                                  {category}
                                </Typography>
                              </td>
                              <td className="py-3 px-6 border-b border-blue-gray-50 text-right">
                                <Typography
                                  variant="small"
                                  className="font-bold text-red-500"
                                >
                                  $
                                  {amount.toLocaleString("es-ES", {
                                    minimumFractionDigits: 2,
                                  })}
                                </Typography>
                              </td>
                              <td className="py-3 px-6 border-b border-blue-gray-50 text-right">
                                <Typography
                                  variant="small"
                                  className="font-semibold text-blue-gray-600"
                                >
                                  {percentage}%
                                </Typography>
                              </td>
                            </tr>
                          );
                        })}
                        <tr>
                          <td className="py-3 px-6 border-t-2 border-blue-gray-100">
                            <Typography
                              variant="small"
                              className="font-bold text-blue-gray-900"
                            >
                              Total
                            </Typography>
                          </td>
                          <td className="py-3 px-6 border-t-2 border-blue-gray-100 text-right">
                            <Typography
                              variant="small"
                              className="font-bold text-blue-gray-900"
                            >
                              $
                              {categoryData.total.toLocaleString("es-ES", {
                                minimumFractionDigits: 2,
                              })}
                            </Typography>
                          </td>
                          <td className="py-3 px-6 border-t-2 border-blue-gray-100 text-right">
                            <Typography
                              variant="small"
                              className="font-bold text-blue-gray-900"
                            >
                              100%
                            </Typography>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-6 text-center">
                      <Typography color="blue-gray">
                        No hay datos para mostrar
                      </Typography>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </TabPanel>

          {/* Gráfico de Ingresos vs Gastos */}
          <TabPanel value="comparison">
            <Card className="border border-blue-gray-100 shadow-sm">
              <CardHeader
                floated={false}
                shadow={false}
                color="transparent"
                className="m-0 p-6"
              >
                <Typography variant="h6" color="blue-gray">
                  Evolución de Ingresos vs Gastos
                </Typography>
                <Typography
                  variant="small"
                  className="font-normal text-blue-gray-500 mt-1"
                >
                  Comparativa mensual de flujo de efectivo
                </Typography>
              </CardHeader>
              <CardBody>
                {incomeVsExpenses.months.length > 0 ? (
                  <Chart
                    options={barChartOptions}
                    series={barChartSeries}
                    type="bar"
                    height={450}
                  />
                ) : (
                  <div className="h-96 flex items-center justify-center">
                    <Typography color="blue-gray" className="text-center">
                      No hay datos suficientes para mostrar el gráfico
                    </Typography>
                  </div>
                )}
              </CardBody>
            </Card>
          </TabPanel>

          {/* Gráficos de Tendencias */}
          <TabPanel value="trends">
            <div className="space-y-6">
              {/* Tendencias diarias */}
              <Card className="border border-blue-gray-100 shadow-sm">
                <CardHeader
                  floated={false}
                  shadow={false}
                  color="transparent"
                  className="m-0 p-6"
                >
                  <Typography variant="h6" color="blue-gray">
                    Tendencias Diarias (Últimos 30 días)
                  </Typography>
                  <Typography
                    variant="small"
                    className="font-normal text-blue-gray-500 mt-1"
                  >
                    Evolución diaria con balance acumulado
                  </Typography>
                </CardHeader>
                <CardBody>
                  <Chart
                    options={lineChartOptions}
                    series={lineChartSeries}
                    type="line"
                    height={400}
                  />
                </CardBody>
              </Card>

              {/* Tendencias semanales */}
              <Card className="border border-blue-gray-100 shadow-sm">
                <CardHeader
                  floated={false}
                  shadow={false}
                  color="transparent"
                  className="m-0 p-6"
                >
                  <Typography variant="h6" color="blue-gray">
                    Tendencias Semanales (Últimas 12 semanas)
                  </Typography>
                  <Typography
                    variant="small"
                    className="font-normal text-blue-gray-500 mt-1"
                  >
                    Comparativa semanal de ingresos y gastos
                  </Typography>
                </CardHeader>
                <CardBody>
                  <Chart
                    options={areaChartOptions}
                    series={areaChartSeries}
                    type="area"
                    height={400}
                  />
                </CardBody>
              </Card>
            </div>
          </TabPanel>
        </TabsBody>
      </Tabs>
    </div>
  );
}

export default Analytics;
