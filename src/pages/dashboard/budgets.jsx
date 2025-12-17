import {
  BanknotesIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  IconButton,
  Input,
  Option,
  Progress,
  Select,
  Typography,
} from "@material-tailwind/react";
import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { mapBudgetToBackend, mapBudgetFromBackend, getOrCreateCategory } from "@/services/dataMapper";
import { useAuth } from "@/context/AuthContext";

// Categorías de gastos
const EXPENSE_CATEGORIES = [
  "Comida",
  "Transporte",
  "Servicios",
  "Entretenimiento",
  "Salud",
  "Educación",
  "Hogar",
  "Ropa",
  "Tecnología",
  "Otros Gastos",
];

export function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { isAuthenticated } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [formData, setFormData] = useState({
    category: "",
    limit: "",
    month: new Date().toISOString().slice(0, 7),
  });

  // Cargar presupuestos y transacciones desde API
  useEffect(() => {
    if (isAuthenticated) {
      loadBudgets();
      loadTransactions();
    }
  }, [isAuthenticated, currentMonth]);

  const loadBudgets = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.getBudgets();
      if (response.success) {
        const mapped = response.data.map(mapBudgetFromBackend);
        setBudgets(mapped);
      }
    } catch (err) {
      setError(err.message || "Error loading budgets");
      console.error("Error loading budgets:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await api.getTransactions({
        start_date: `${currentMonth}-01`,
        end_date: `${currentMonth}-31`,
      });
      if (response.success) {
        setTransactions(response.data || []);
      }
    } catch (err) {
      console.error("Error loading transactions:", err);
    }
  };

  // Calcular gasto por categoría en un mes específico
  const getSpentByCategory = (category, month) => {
    return transactions
      .filter((t) => {
        if (t.type !== "expense") return false;
        if (t.category !== category) return false;
        const transactionMonth = t.date.slice(0, 7);
        return transactionMonth === month;
      })
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  };

  // Obtener estado del presupuesto
  const getBudgetStatus = (spent, limit) => {
    const percentage = (spent / limit) * 100;
    if (percentage >= 100) {
      return { color: "red", label: "Excedido", icon: ExclamationTriangleIcon };
    } else if (percentage >= 80) {
      return { color: "orange", label: "Alerta", icon: ExclamationTriangleIcon };
    } else if (percentage >= 60) {
      return { color: "yellow", label: "Cuidado", icon: ExclamationTriangleIcon };
    } else {
      return { color: "green", label: "Bien", icon: CheckCircleIcon };
    }
  };

  // Calcular estadísticas generales del mes
  const getMonthStats = () => {
    const monthBudgets = budgets.filter((b) => b.month === currentMonth);
    let totalLimit = 0;
    let totalSpent = 0;

    monthBudgets.forEach((budget) => {
      totalLimit += parseFloat(budget.limit);
      totalSpent += getSpentByCategory(budget.category, currentMonth);
    });

    return { totalLimit, totalSpent, remaining: totalLimit - totalSpent };
  };

  const stats = getMonthStats();

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.category || !formData.limit) {
      alert("Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Get or create category
      const categoryId = await getOrCreateCategory(api, formData.category, "expense");

      const budgetData = {
        ...mapBudgetToBackend({ ...formData, category_id: categoryId }),
        start_date: `${formData.month}-01`,
      };

      if (editingBudget) {
        const response = await api.updateBudget(editingBudget.id, budgetData);
        if (response.success) {
          const updated = mapBudgetFromBackend(response.data);
          setBudgets(budgets.map((b) => (b.id === editingBudget.id ? updated : b)));
          setEditingBudget(null);
        }
      } else {
        // Check if budget already exists for this category and month
        const exists = budgets.find(
          (b) => b.category === formData.category && b.month === formData.month
        );
        if (exists) {
          alert(
            `Ya existe un presupuesto para ${formData.category} en ${formData.month}`
          );
          return;
        }

        const response = await api.createBudget(budgetData);
        if (response.success) {
          const newBudget = mapBudgetFromBackend(response.data);
          setBudgets([newBudget, ...budgets]);
        }
      }

      resetForm();
      setOpenDialog(false);
    } catch (err) {
      setError(err.message || "Error saving budget");
      alert(err.message || "Error saving budget");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      category: "",
      limit: "",
      month: currentMonth,
    });
  };

  const handleEdit = (budget) => {
    setEditingBudget(budget);
    setFormData({
      category: budget.category,
      limit: budget.limit.toString(),
      month: budget.month,
    });
    setOpenDialog(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este presupuesto?")) {
      setLoading(true);
      try {
        await api.deleteBudget(id);
        setBudgets(budgets.filter((b) => b.id !== id));
      } catch (err) {
        setError(err.message || "Error deleting budget");
        alert(err.message || "Error deleting budget");
      } finally {
        setLoading(false);
      }
    }
  };

  // Filtrar presupuestos del mes actual
  const currentMonthBudgets = budgets
    .filter((b) => b.month === currentMonth)
    .map((budget) => {
      const spent = getSpentByCategory(budget.category, currentMonth);
      const percentage = Math.min((spent / budget.limit) * 100, 100);
      const status = getBudgetStatus(spent, budget.limit);
      return { ...budget, spent, percentage, status };
    })
    .sort((a, b) => b.percentage - a.percentage);

  // Alertas activas
  const activeAlerts = currentMonthBudgets.filter(
    (b) => b.percentage >= 80 && b.percentage < 100
  );
  const exceededBudgets = currentMonthBudgets.filter((b) => b.percentage >= 100);

  return (
    <div className="mt-12">
      {/* Alertas */}
      {exceededBudgets.length > 0 && (
        <Alert color="red" className="mb-6" icon={<ExclamationTriangleIcon />}>
          <Typography variant="h6" className="mb-1">
            ¡Presupuestos excedidos!
          </Typography>
          <Typography variant="small">
            Has excedido {exceededBudgets.length} presupuesto(s):{" "}
            {exceededBudgets.map((b) => b.category).join(", ")}
          </Typography>
        </Alert>
      )}

      {activeAlerts.length > 0 && (
        <Alert color="orange" className="mb-6" icon={<ExclamationTriangleIcon />}>
          <Typography variant="h6" className="mb-1">
            ⚠️ Alerta de presupuesto
          </Typography>
          <Typography variant="small">
            Estás cerca de exceder {activeAlerts.length} presupuesto(s):{" "}
            {activeAlerts.map((b) => b.category).join(", ")}
          </Typography>
        </Alert>
      )}

      {/* Tarjetas de resumen */}
      <div className="mb-12 grid gap-y-10 gap-x-6 md:grid-cols-2 xl:grid-cols-3">
        <Card className="border border-blue-gray-100 shadow-sm">
          <CardHeader
            variant="gradient"
            color="blue"
            floated={false}
            shadow={false}
            className="absolute grid h-12 w-12 place-items-center"
          >
            <BanknotesIcon className="w-6 h-6 text-white" />
          </CardHeader>
          <CardBody className="p-4 text-right">
            <Typography variant="small" className="font-normal text-blue-gray-600">
              Presupuesto Total
            </Typography>
            <Typography variant="h4" color="blue-gray">
              ${stats.totalLimit.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
            </Typography>
          </CardBody>
        </Card>

        <Card className="border border-blue-gray-100 shadow-sm">
          <CardHeader
            variant="gradient"
            color="orange"
            floated={false}
            shadow={false}
            className="absolute grid h-12 w-12 place-items-center"
          >
            <ChartBarIcon className="w-6 h-6 text-white" />
          </CardHeader>
          <CardBody className="p-4 text-right">
            <Typography variant="small" className="font-normal text-blue-gray-600">
              Total Gastado
            </Typography>
            <Typography variant="h4" color="blue-gray">
              ${stats.totalSpent.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
            </Typography>
          </CardBody>
        </Card>

        <Card className="border border-blue-gray-100 shadow-sm">
          <CardHeader
            variant="gradient"
            color={stats.remaining >= 0 ? "green" : "red"}
            floated={false}
            shadow={false}
            className="absolute grid h-12 w-12 place-items-center"
          >
            <BanknotesIcon className="w-6 h-6 text-white" />
          </CardHeader>
          <CardBody className="p-4 text-right">
            <Typography variant="small" className="font-normal text-blue-gray-600">
              Disponible
            </Typography>
            <Typography variant="h4" color="blue-gray">
              ${stats.remaining.toLocaleString("es-ES", { minimumFractionDigits: 2 })}
            </Typography>
          </CardBody>
        </Card>
      </div>

      {/* Acciones principales */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Typography variant="h6" color="blue-gray">
            Presupuestos de
          </Typography>
          <Input
            type="month"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="w-48"
          />
        </div>
        <Button
          onClick={() => {
            setEditingBudget(null);
            resetForm();
            setOpenDialog(true);
          }}
          className="flex items-center gap-2"
          color="blue"
        >
          <PlusIcon className="h-5 w-5" />
          Nuevo Presupuesto
        </Button>
      </div>

      {/* Lista de presupuestos */}
      <Card className="border border-blue-gray-100 shadow-sm">
        <CardHeader
          floated={false}
          shadow={false}
          color="transparent"
          className="m-0 p-6"
        >
          <Typography variant="h6" color="blue-gray">
            Presupuestos por Categoría
          </Typography>
          <Typography variant="small" className="font-normal text-blue-gray-500 mt-1">
            Monitorea tus gastos y mantén el control
          </Typography>
        </CardHeader>
        <CardBody className="px-0 pt-0 pb-2">
          {currentMonthBudgets.length === 0 ? (
            <div className="p-6 text-center">
              <Typography color="blue-gray" className="font-normal">
                No hay presupuestos configurados para este mes. ¡Crea tu primer presupuesto!
              </Typography>
            </div>
          ) : (
            <div className="space-y-4 px-6">
              {currentMonthBudgets.map((budget) => {
                const StatusIcon = budget.status.icon;
                return (
                  <Card
                    key={budget.id}
                    className="border border-blue-gray-100 shadow-sm"
                  >
                    <CardBody className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg bg-${budget.status.color}-50`}
                          >
                            <StatusIcon
                              className={`h-5 w-5 text-${budget.status.color}-500`}
                            />
                          </div>
                          <div>
                            <Typography variant="h6" color="blue-gray">
                              {budget.category}
                            </Typography>
                            <Typography
                              variant="small"
                              className="font-normal text-blue-gray-500"
                            >
                              Límite: $
                              {budget.limit.toLocaleString("es-ES", {
                                minimumFractionDigits: 2,
                              })}
                            </Typography>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Chip
                            value={budget.status.label}
                            color={budget.status.color}
                            size="sm"
                            className="rounded-full"
                          />
                          <IconButton
                            variant="text"
                            size="sm"
                            onClick={() => handleEdit(budget)}
                          >
                            <PencilIcon className="h-4 w-4 text-blue-500" />
                          </IconButton>
                          <IconButton
                            variant="text"
                            size="sm"
                            onClick={() => handleDelete(budget.id)}
                          >
                            <TrashIcon className="h-4 w-4 text-red-500" />
                          </IconButton>
                        </div>
                      </div>

                      {/* Barra de progreso */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Typography variant="small" className="text-blue-gray-600">
                            Gastado: $
                            {budget.spent.toLocaleString("es-ES", {
                              minimumFractionDigits: 2,
                            })}
                          </Typography>
                          <Typography
                            variant="small"
                            className={`font-bold text-${budget.status.color}-500`}
                          >
                            {budget.percentage.toFixed(1)}%
                          </Typography>
                        </div>
                        <Progress
                          value={budget.percentage}
                          color={budget.status.color}
                          className="h-2"
                        />
                        <Typography
                          variant="small"
                          className="text-blue-gray-500 text-right"
                        >
                          Disponible: $
                          {Math.max(0, budget.limit - budget.spent).toLocaleString(
                            "es-ES",
                            { minimumFractionDigits: 2 }
                          )}
                        </Typography>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Dialog para agregar/editar presupuesto */}
      <Dialog open={openDialog} handler={() => setOpenDialog(false)} size="md">
        <DialogHeader>
          {editingBudget ? "Editar Presupuesto" : "Nuevo Presupuesto"}
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody divider className="space-y-4">
            <div>
              <Select
                label="Categoría"
                value={formData.category}
                onChange={(val) => setFormData({ ...formData, category: val })}
                disabled={!!editingBudget}
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <Option key={cat} value={cat}>
                    {cat}
                  </Option>
                ))}
              </Select>
              {editingBudget && (
                <Typography variant="small" className="text-blue-gray-500 mt-1">
                  No puedes cambiar la categoría al editar
                </Typography>
              )}
            </div>

            <div>
              <Input
                type="number"
                step="0.01"
                label="Límite de presupuesto"
                value={formData.limit}
                onChange={(e) =>
                  setFormData({ ...formData, limit: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Input
                type="month"
                label="Mes"
                value={formData.month}
                onChange={(e) =>
                  setFormData({ ...formData, month: e.target.value })
                }
                required
                disabled={!!editingBudget}
              />
              {editingBudget && (
                <Typography variant="small" className="text-blue-gray-500 mt-1">
                  No puedes cambiar el mes al editar
                </Typography>
              )}
            </div>
          </DialogBody>
          <DialogFooter className="space-x-2">
            <Button
              variant="outlined"
              color="red"
              onClick={() => {
                setOpenDialog(false);
                setEditingBudget(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" color="green">
              {editingBudget ? "Actualizar" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}

export default Budgets;
