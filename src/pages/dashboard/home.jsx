import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/api";
import { mapBudgetFromBackend, mapDebtFromBackend, mapGoalFromBackend, mapTransactionFromBackend } from "@/services/dataMapper";
import { StatisticsCard } from "@/widgets/cards";
import { StatisticsChart } from "@/widgets/charts";
import {
  ArrowDownCircleIcon,
  ArrowUpCircleIcon,
  ChartBarIcon,
  ClockIcon,
  CreditCardIcon,
  TrophyIcon,
} from "@heroicons/react/24/solid";
import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Progress,
  Typography,
} from "@material-tailwind/react";
import React, { useEffect, useState } from "react";

export function Home() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    totalGoals: 0,
    activeGoals: 0,
    totalBudgets: 0,
    totalDebts: 0,
    activeDebts: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [recentGoals, setRecentGoals] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load all data in parallel
      const [transactionsRes, goalsRes, budgetsRes, debtsRes, summaryRes] = await Promise.all([
        api.getTransactions({ start_date: new Date(new Date().setDate(1)).toISOString().split("T")[0] }),
        api.getGoals(),
        api.getBudgets(),
        api.getDebts(),
        api.getTransactionsSummary(),
      ]);

      // Process transactions
      if (transactionsRes.success) {
        const transactions = transactionsRes.data.map(mapTransactionFromBackend);
        const income = transactions
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const expense = transactions
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        // Get recent transactions (last 5)
        const recent = transactions
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 5);

        setRecentTransactions(recent);
        setAllTransactions(transactions);
        setStats((prev) => ({
          ...prev,
          totalIncome: income,
          totalExpense: expense,
          balance: income - expense,
        }));
      }

      // Process goals
      if (goalsRes.success) {
        const goals = goalsRes.data.map(mapGoalFromBackend);
        const active = goals.filter((g) => g.active && g.status === "active");
        const recent = active.slice(0, 3);
        setRecentGoals(recent);
        setStats((prev) => ({
          ...prev,
          totalGoals: goals.length,
          activeGoals: active.length,
        }));
      }

      // Process budgets
      if (budgetsRes.success) {
        const budgets = budgetsRes.data.map(mapBudgetFromBackend);
        setStats((prev) => ({
          ...prev,
          totalBudgets: budgets.length,
        }));
      }

      // Process debts
      if (debtsRes.success) {
        const debts = debtsRes.data.map(mapDebtFromBackend);
        const active = debts.filter((d) => d.active && parseFloat(d.currentBalance) > 0);
        setStats((prev) => ({
          ...prev,
          totalDebts: debts.length,
          activeDebts: active.length,
        }));
      }

      // Use summary if available
      if (summaryRes.success && summaryRes.data) {
        setStats((prev) => ({
          ...prev,
          totalIncome: summaryRes.data.total_income || prev.totalIncome,
          totalExpense: summaryRes.data.total_expense || prev.totalExpense,
          balance: (summaryRes.data.total_income || 0) - (summaryRes.data.total_expense || 0),
        }));
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Prepare chart data
  const getIncomeVsExpensesChart = () => {
    const last6Months = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      last6Months.push(date.toLocaleDateString("es-ES", { month: "short", year: "numeric" }));
    }

    const monthlyData = {};
    allTransactions.forEach((t) => {
      const monthKey = new Date(t.date).toLocaleDateString("es-ES", { month: "short", year: "numeric" });
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expense: 0 };
      }
      if (t.type === "income") {
        monthlyData[monthKey].income += parseFloat(t.amount);
      } else {
        monthlyData[monthKey].expense += parseFloat(t.amount);
      }
    });

    const incomes = last6Months.map((month) => monthlyData[month]?.income || 0);
    const expenses = last6Months.map((month) => monthlyData[month]?.expense || 0);

    return {
      type: "area",
      height: 240,
      series: [
        {
          name: "Ingresos",
          data: incomes,
        },
        {
          name: "Gastos",
          data: expenses,
        },
      ],
      options: {
        chart: {
          toolbar: {
            show: false,
          },
        },
        dataLabels: {
          enabled: false,
        },
        stroke: {
          curve: "smooth",
        },
        xaxis: {
          categories: last6Months,
        },
        yaxis: {
          labels: {
            formatter: (value) => formatCurrency(value),
          },
        },
        colors: ["#10b981", "#ef4444"],
        fill: {
          type: "gradient",
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.7,
            opacityTo: 0.9,
            stops: [0, 90, 100],
          },
        },
      },
    };
  };

  const getExpensesByCategoryChart = () => {
    const categoryTotals = {};
    const currentMonth = new Date().toISOString().slice(0, 7);

    allTransactions
      .filter((t) => {
        if (t.type !== "expense") return false;
        const transactionMonth = t.date.slice(0, 7);
        return transactionMonth === currentMonth;
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
      type: "donut",
      height: 240,
      series: amounts,
      options: {
        chart: {
          type: "donut",
        },
        labels: categories,
        colors: [
          "#ef4444",
          "#f97316",
          "#f59e0b",
          "#eab308",
          "#84cc16",
          "#22c55e",
          "#10b981",
          "#14b8a6",
          "#06b6d4",
          "#3b82f6",
          "#6366f1",
          "#8b5cf6",
          "#a855f7",
          "#d946ef",
          "#ec4899",
        ],
        legend: {
          show: true,
          position: "bottom",
        },
        plotOptions: {
          pie: {
            donut: {
              size: "70%",
              labels: {
                show: true,
                total: {
                  show: true,
                  label: "Total Gastos",
                  formatter: () => formatCurrency(amounts.reduce((a, b) => a + b, 0)),
                },
              },
            },
          },
        },
      },
    };
  };

  const getGoalsProgressChart = () => {
    const goalNames = recentGoals.map((g) => g.name);
    const goalProgress = recentGoals.map((g) => {
      const progress = (parseFloat(g.currentAmount) / parseFloat(g.targetAmount)) * 100;
      return Math.min(progress, 100);
    });

    return {
      type: "bar",
      height: 240,
      series: [
        {
          name: "Progreso",
          data: goalProgress,
        },
      ],
      options: {
        chart: {
          type: "bar",
          toolbar: {
            show: false,
          },
        },
        plotOptions: {
          bar: {
            horizontal: true,
            borderRadius: 4,
            dataLabels: {
              position: "top",
            },
          },
        },
        dataLabels: {
          enabled: true,
          formatter: (val) => `${val.toFixed(0)}%`,
          offsetX: 0,
          offsetY: -20,
          style: {
            fontSize: "12px",
            colors: ["#304758"],
          },
        },
        xaxis: {
          categories: goalNames,
          max: 100,
        },
        yaxis: {
          labels: {
            style: {
              fontSize: "12px",
            },
          },
        },
        colors: ["#3b82f6"],
        fill: {
          type: "gradient",
          gradient: {
            shade: "light",
            type: "horizontal",
            shadeIntensity: 0.25,
            gradientToColors: ["#6366f1"],
            inverseColors: true,
            opacityFrom: 1,
            opacityTo: 1,
            stops: [50, 0, 100, 100],
          },
        },
      },
    };
  };

  const getMonthlyTrendChart = () => {
    const last30Days = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      last30Days.push(date.toLocaleDateString("es-ES", { day: "numeric", month: "short" }));
    }

    const dailyData = {};
    last30Days.forEach((day) => {
      dailyData[day] = { income: 0, expense: 0 };
    });

    allTransactions.forEach((t) => {
      const dayKey = new Date(t.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
      if (dailyData[dayKey]) {
        if (t.type === "income") {
          dailyData[dayKey].income += parseFloat(t.amount);
        } else {
          dailyData[dayKey].expense += parseFloat(t.amount);
        }
      }
    });

    const incomes = last30Days.map((day) => dailyData[day]?.income || 0);
    const expenses = last30Days.map((day) => dailyData[day]?.expense || 0);

    return {
      type: "line",
      height: 240,
      series: [
        {
          name: "Ingresos",
          data: incomes,
        },
        {
          name: "Gastos",
          data: expenses,
        },
      ],
      options: {
        chart: {
          toolbar: {
            show: false,
          },
        },
        stroke: {
          curve: "smooth",
          width: 3,
        },
        xaxis: {
          categories: last30Days,
          labels: {
            rotate: -45,
            rotateAlways: false,
            show: true,
            style: {
              fontSize: "10px",
            },
          },
        },
        yaxis: {
          labels: {
            formatter: (value) => formatCurrency(value),
          },
        },
        colors: ["#10b981", "#ef4444"],
        markers: {
          size: 4,
          hover: {
            size: 6,
          },
        },
      },
    };
  };

  const statisticsCards = [
    {
      color: "green",
      icon: ArrowUpCircleIcon,
      title: "Total Ingresos",
      value: formatCurrency(stats.totalIncome),
      footer: {
        color: "text-green-500",
        value: "Este mes",
        label: "",
      },
    },
    {
      color: "red",
      icon: ArrowDownCircleIcon,
      title: "Total Gastos",
      value: formatCurrency(stats.totalExpense),
      footer: {
        color: "text-red-500",
        value: "Este mes",
        label: "",
      },
    },
    {
      color: stats.balance >= 0 ? "blue" : "orange",
      icon: ArrowUpCircleIcon,
      title: "Balance",
      value: formatCurrency(stats.balance),
      footer: {
        color: stats.balance >= 0 ? "text-blue-500" : "text-orange-500",
        value: stats.balance >= 0 ? "+" : "",
        label: "Balance actual",
      },
    },
    {
      color: "purple",
      icon: TrophyIcon,
      title: "Metas Activas",
      value: stats.activeGoals,
      footer: {
        color: "text-purple-500",
        value: `${stats.totalGoals}`,
        label: "total",
      },
    },
  ];

  if (loading) {
    return (
      <div className="mt-12 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-blue-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-12">
      {/* Statistics Cards */}
      <div className="mb-12 grid gap-y-10 gap-x-6 md:grid-cols-2 xl:grid-cols-4">
        {statisticsCards.map(({ icon, title, value, footer, color }) => (
          <StatisticsCard
            key={title}
            color={color}
            title={title}
            value={value}
            icon={React.createElement(icon, {
              className: "w-6 h-6 text-white",
            })}
            footer={
              <Typography className="font-normal text-blue-gray-600">
                <strong className={footer.color}>{footer.value}</strong>
                &nbsp;{footer.label}
              </Typography>
            }
          />
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Recent Transactions */}
        <Card className="border border-blue-gray-100 shadow-sm">
          <CardHeader
            floated={false}
            shadow={false}
            color="transparent"
            className="m-0 p-6"
          >
            <Typography variant="h6" color="blue-gray" className="mb-1">
              Últimas Transacciones
            </Typography>
            <Typography
              variant="small"
              className="font-normal text-blue-gray-500"
            >
              Tus transacciones más recientes
            </Typography>
          </CardHeader>
          <CardBody className="overflow-x-scroll px-0 pt-0 pb-2">
            {recentTransactions.length === 0 ? (
              <div className="p-6 text-center">
                <Typography color="blue-gray" className="font-normal">
                  No hay transacciones recientes
                </Typography>
              </div>
            ) : (
              <table className="w-full min-w-[640px] table-auto">
                <thead>
                  <tr>
                    {["Fecha", "Tipo", "Categoría", "Descripción", "Monto"].map(
                      (el) => (
                        <th
                          key={el}
                          className="border-b border-blue-gray-50 py-3 px-5 text-left"
                        >
                          <Typography
                            variant="small"
                            className="text-[11px] font-bold uppercase text-blue-gray-400"
                          >
                            {el}
                          </Typography>
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((transaction) => {
                    const className = "py-3 px-5 border-b border-blue-gray-50";
                    return (
                      <tr key={transaction.id}>
                        <td className={className}>
                          <Typography className="text-xs font-semibold text-blue-gray-600">
                            {new Date(transaction.date).toLocaleDateString("es-ES")}
                          </Typography>
                        </td>
                        <td className={className}>
                          <Chip
                            variant="gradient"
                            color={transaction.type === "income" ? "green" : "red"}
                            value={transaction.type === "income" ? "Ingreso" : "Gasto"}
                            className="py-0.5 px-2 text-[11px] font-medium w-fit"
                          />
                        </td>
                        <td className={className}>
                          <Typography className="text-xs font-semibold text-blue-gray-600">
                            {transaction.category}
                          </Typography>
                        </td>
                        <td className={className}>
                          <Typography className="text-xs font-normal text-blue-gray-500">
                            {transaction.description || "-"}
                          </Typography>
                        </td>
                        <td className={className}>
                          <Typography
                            className={`text-xs font-bold ${
                              transaction.type === "income"
                                ? "text-green-500"
                                : "text-red-500"
                            }`}
                          >
                            {transaction.type === "income" ? "+" : "-"}
                            {formatCurrency(transaction.amount)}
                          </Typography>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        {/* Active Goals */}
        <Card className="border border-blue-gray-100 shadow-sm">
          <CardHeader
            floated={false}
            shadow={false}
            color="transparent"
            className="m-0 p-6"
          >
            <Typography variant="h6" color="blue-gray" className="mb-1">
              Metas Activas
            </Typography>
            <Typography
              variant="small"
              className="font-normal text-blue-gray-500"
            >
              Progreso de tus metas financieras
            </Typography>
          </CardHeader>
          <CardBody className="pt-0">
            {recentGoals.length === 0 ? (
              <div className="p-6 text-center">
                <Typography color="blue-gray" className="font-normal">
                  No tienes metas activas
                </Typography>
              </div>
            ) : (
              <div className="space-y-4">
                {recentGoals.map((goal) => {
                  const progress = (parseFloat(goal.currentAmount) / parseFloat(goal.targetAmount)) * 100;
                  return (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Typography
                          variant="small"
                          color="blue-gray"
                          className="font-medium"
                        >
                          {goal.name}
                        </Typography>
                        <Typography
                          variant="small"
                          className="font-bold text-blue-gray-600"
                        >
                          {progress.toFixed(0)}%
                        </Typography>
                      </div>
                      <Progress value={progress} color="blue" />
                      <div className="flex justify-between">
                        <Typography
                          variant="small"
                          className="text-xs text-blue-gray-500"
                        >
                          {formatCurrency(goal.currentAmount)}
                        </Typography>
                        <Typography
                          variant="small"
                          className="text-xs text-blue-gray-500"
                        >
                          {formatCurrency(goal.targetAmount)}
                        </Typography>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="mb-6 grid grid-cols-1 gap-y-12 gap-x-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Income vs Expenses - Last 6 Months */}
        <StatisticsChart
          color="blue"
          chart={getIncomeVsExpensesChart()}
          title="Ingresos vs Gastos (6 meses)"
          description="Comparación mensual de ingresos y gastos"
          footer={
            <Typography
              variant="small"
              className="flex items-center font-normal text-blue-gray-600"
            >
              <ClockIcon strokeWidth={2} className="h-4 w-4 text-blue-gray-400" />
              &nbsp;Últimos 6 meses
            </Typography>
          }
        />

        {/* Expenses by Category */}
        <StatisticsChart
          color="red"
          chart={getExpensesByCategoryChart()}
          title="Gastos por Categoría"
          description="Distribución de gastos del mes actual"
          footer={
            <Typography
              variant="small"
              className="flex items-center font-normal text-blue-gray-600"
            >
              <ClockIcon strokeWidth={2} className="h-4 w-4 text-blue-gray-400" />
              &nbsp;Este mes
            </Typography>
          }
        />

        {/* Goals Progress */}
        {recentGoals.length > 0 && (
          <StatisticsChart
            color="purple"
            chart={getGoalsProgressChart()}
            title="Progreso de Metas"
            description="Estado actual de tus metas financieras"
            footer={
              <Typography
                variant="small"
                className="flex items-center font-normal text-blue-gray-600"
              >
                <TrophyIcon className="h-4 w-4 text-blue-gray-400" />
                &nbsp;Metas activas
              </Typography>
            }
          />
        )}

        {/* Monthly Trend - Last 30 Days */}
        <StatisticsChart
          color="green"
          chart={getMonthlyTrendChart()}
          title="Tendencia Diaria (30 días)"
          description="Ingresos y gastos diarios del último mes"
          footer={
            <Typography
              variant="small"
              className="flex items-center font-normal text-blue-gray-600"
            >
              <ClockIcon strokeWidth={2} className="h-4 w-4 text-blue-gray-400" />
              &nbsp;Últimos 30 días
            </Typography>
          }
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border border-blue-gray-100 shadow-sm">
          <CardBody className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <Typography variant="h6" color="blue-gray">
                  Presupuestos
                </Typography>
                <Typography variant="h4" color="blue">
                  {stats.totalBudgets}
                </Typography>
                <Typography variant="small" color="gray">
                  Configurados
                </Typography>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-blue-gray-100 shadow-sm">
          <CardBody className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-50 rounded-lg">
                <CreditCardIcon className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <Typography variant="h6" color="blue-gray">
                  Deudas Activas
                </Typography>
                <Typography variant="h4" color="red">
                  {stats.activeDebts}
                </Typography>
                <Typography variant="small" color="gray">
                  de {stats.totalDebts} total
                </Typography>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-blue-gray-100 shadow-sm">
          <CardBody className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <TrophyIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <Typography variant="h6" color="blue-gray">
                  Metas
                </Typography>
                <Typography variant="h4" color="purple">
                  {stats.activeGoals}
                </Typography>
                <Typography variant="small" color="gray">
                  Activas
                </Typography>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export default Home;
