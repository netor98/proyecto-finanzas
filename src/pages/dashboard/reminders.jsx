import {
    BellIcon,
    CalendarDaysIcon,
    CheckCircleIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    PencilIcon,
    PlusIcon,
    TrashIcon
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
    Select,
    Switch,
    Typography,
} from "@material-tailwind/react";
import { useEffect, useState } from "react";

// Frecuencias de pago
const FREQUENCIES = {
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  quarterly: "Trimestral",
  yearly: "Anual",
};

// Categorías de pagos
const PAYMENT_CATEGORIES = [
  "Servicios",
  "Suscripciones",
  "Préstamos",
  "Seguros",
  "Alquiler",
  "Tarjeta de Crédito",
  "Otros",
];

export function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    category: "",
    frequency: "monthly",
    nextDueDate: new Date().toISOString().split("T")[0],
    isActive: true,
    notifyDaysBefore: "3",
  });

  // Cargar datos desde localStorage
  useEffect(() => {
    const savedReminders = localStorage.getItem("reminders");
    if (savedReminders) {
      setReminders(JSON.parse(savedReminders));
    }

    const savedTransactions = localStorage.getItem("transactions");
    if (savedTransactions) {
      setTransactions(JSON.parse(savedTransactions));
    }

    const savedBudgets = localStorage.getItem("budgets");
    if (savedBudgets) {
      setBudgets(JSON.parse(savedBudgets));
    }
  }, []);

  // Guardar recordatorios en localStorage
  useEffect(() => {
    if (reminders.length > 0) {
      localStorage.setItem("reminders", JSON.stringify(reminders));
    }
  }, [reminders]);

  // Generar notificaciones automáticas
  useEffect(() => {
    const newNotifications = [];

    // 1. Facturas próximas a vencer
    const today = new Date();
    reminders
      .filter((r) => r.isActive)
      .forEach((reminder) => {
        const dueDate = new Date(reminder.nextDueDate);
        const daysUntilDue = Math.ceil(
          (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        const notifyBefore = parseInt(reminder.notifyDaysBefore);

        if (daysUntilDue <= notifyBefore && daysUntilDue >= 0) {
          newNotifications.push({
            id: `reminder-${reminder.id}`,
            type: "reminder",
            severity: daysUntilDue <= 1 ? "urgent" : "warning",
            title: "Pago próximo a vencer",
            message: `${reminder.name} vence ${
              daysUntilDue === 0
                ? "hoy"
                : daysUntilDue === 1
                ? "mañana"
                : `en ${daysUntilDue} días`
            }`,
            amount: reminder.amount,
            date: reminder.nextDueDate,
          });
        } else if (daysUntilDue < 0) {
          newNotifications.push({
            id: `overdue-${reminder.id}`,
            type: "overdue",
            severity: "error",
            title: "Pago vencido",
            message: `${reminder.name} venció hace ${Math.abs(daysUntilDue)} día(s)`,
            amount: reminder.amount,
            date: reminder.nextDueDate,
          });
        }
      });

    // 2. Alertas de presupuesto excedido
    const currentMonth = new Date().toISOString().slice(0, 7);
    budgets
      .filter((b) => b.month === currentMonth)
      .forEach((budget) => {
        const spent = transactions
          .filter(
            (t) =>
              t.type === "expense" &&
              t.category === budget.category &&
              t.date.slice(0, 7) === currentMonth
          )
          .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const percentage = (spent / budget.limit) * 100;

        if (percentage >= 100) {
          newNotifications.push({
            id: `budget-exceeded-${budget.id}`,
            type: "budget-exceeded",
            severity: "error",
            title: "Presupuesto excedido",
            message: `Has excedido el presupuesto de ${budget.category}`,
            amount: spent - budget.limit,
            category: budget.category,
          });
        } else if (percentage >= 80) {
          newNotifications.push({
            id: `budget-warning-${budget.id}`,
            type: "budget-warning",
            severity: "warning",
            title: "Alerta de presupuesto",
            message: `Has usado el ${percentage.toFixed(
              0
            )}% del presupuesto de ${budget.category}`,
            amount: budget.limit - spent,
            category: budget.category,
          });
        }
      });

    // 3. Sugerencias de ahorro
    const currentMonthTransactions = transactions.filter(
      (t) => t.date.slice(0, 7) === currentMonth
    );
    const currentMonthExpenses = currentMonthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    // Calcular promedio de meses anteriores
    const previousMonths = [...new Set(transactions.map((t) => t.date.slice(0, 7)))]
      .filter((m) => m < currentMonth)
      .sort()
      .slice(-3);

    if (previousMonths.length > 0) {
      const avgPreviousExpenses =
        previousMonths.reduce((sum, month) => {
          const monthExpenses = transactions
            .filter((t) => t.type === "expense" && t.date.slice(0, 7) === month)
            .reduce((s, t) => s + parseFloat(t.amount), 0);
          return sum + monthExpenses;
        }, 0) / previousMonths.length;

      if (currentMonthExpenses < avgPreviousExpenses * 0.85) {
        newNotifications.push({
          id: "saving-achievement",
          type: "saving",
          severity: "success",
          title: "¡Excelente ahorro!",
          message: `Has reducido tus gastos un ${(
            ((avgPreviousExpenses - currentMonthExpenses) / avgPreviousExpenses) *
            100
          ).toFixed(0)}% vs el promedio`,
          amount: avgPreviousExpenses - currentMonthExpenses,
        });
      } else if (currentMonthExpenses > avgPreviousExpenses * 1.2) {
        newNotifications.push({
          id: "overspending-warning",
          type: "overspending",
          severity: "warning",
          title: "Alerta de sobre-gasto",
          message: `Estás gastando un ${(
            ((currentMonthExpenses - avgPreviousExpenses) / avgPreviousExpenses) *
            100
          ).toFixed(0)}% más que el promedio`,
          amount: currentMonthExpenses - avgPreviousExpenses,
        });
      }
    }

    setNotifications(newNotifications);
  }, [reminders, transactions, budgets]);

  // Calcular próxima fecha de pago
  const calculateNextDueDate = (currentDate, frequency) => {
    const date = new Date(currentDate);
    switch (frequency) {
      case "weekly":
        date.setDate(date.getDate() + 7);
        break;
      case "biweekly":
        date.setDate(date.getDate() + 14);
        break;
      case "monthly":
        date.setMonth(date.getMonth() + 1);
        break;
      case "quarterly":
        date.setMonth(date.getMonth() + 3);
        break;
      case "yearly":
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        break;
    }
    return date.toISOString().split("T")[0];
  };

  // Manejar envío del formulario
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.amount || !formData.category) {
      alert("Por favor completa todos los campos requeridos");
      return;
    }

    const reminder = {
      id: editingReminder ? editingReminder.id : Date.now(),
      ...formData,
      amount: parseFloat(formData.amount),
      notifyDaysBefore: parseInt(formData.notifyDaysBefore),
      createdAt: editingReminder
        ? editingReminder.createdAt
        : new Date().toISOString(),
    };

    if (editingReminder) {
      setReminders(
        reminders.map((r) => (r.id === editingReminder.id ? reminder : r))
      );
      setEditingReminder(null);
    } else {
      setReminders([reminder, ...reminders]);
    }

    resetForm();
    setOpenDialog(false);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      amount: "",
      category: "",
      frequency: "monthly",
      nextDueDate: new Date().toISOString().split("T")[0],
      isActive: true,
      notifyDaysBefore: "3",
    });
  };

  const handleEdit = (reminder) => {
    setEditingReminder(reminder);
    setFormData({
      name: reminder.name,
      amount: reminder.amount.toString(),
      category: reminder.category,
      frequency: reminder.frequency,
      nextDueDate: reminder.nextDueDate,
      isActive: reminder.isActive,
      notifyDaysBefore: reminder.notifyDaysBefore.toString(),
    });
    setOpenDialog(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("¿Estás seguro de eliminar este recordatorio?")) {
      setReminders(reminders.filter((r) => r.id !== id));
    }
  };

  const handleMarkAsPaid = (reminder) => {
    const nextDate = calculateNextDueDate(
      reminder.nextDueDate,
      reminder.frequency
    );
    setReminders(
      reminders.map((r) =>
        r.id === reminder.id ? { ...r, nextDueDate: nextDate } : r
      )
    );

    // Opcionalmente, crear una transacción automática
    const newTransaction = {
      id: Date.now(),
      type: "expense",
      amount: reminder.amount,
      category: reminder.category,
      description: `${reminder.name} (Pago recurrente)`,
      date: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
    };

    const updatedTransactions = [newTransaction, ...transactions];
    setTransactions(updatedTransactions);
    localStorage.setItem("transactions", JSON.stringify(updatedTransactions));
  };

  const toggleActive = (id) => {
    setReminders(
      reminders.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  };

  // Filtrar y ordenar recordatorios
  const activeReminders = reminders
    .filter((r) => r.isActive)
    .sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate));

  const inactiveReminders = reminders.filter((r) => !r.isActive);

  // Obtener severidad de la notificación
  const getSeverityColor = (severity) => {
    switch (severity) {
      case "error":
        return "red";
      case "urgent":
        return "orange";
      case "warning":
        return "amber";
      case "success":
        return "green";
      default:
        return "blue";
    }
  };

  return (
    <div className="mt-12">
      {/* Encabezado */}
      <div className="mb-6">
        <Typography variant="h4" color="blue-gray" className="mb-2">
          Recordatorios y Notificaciones
        </Typography>
        <Typography variant="small" className="font-normal text-blue-gray-500">
          Gestiona tus pagos recurrentes y recibe alertas automáticas
        </Typography>
      </div>

      {/* Notificaciones activas */}
      {notifications.length > 0 && (
        <div className="mb-6 space-y-3">
          {notifications.map((notification) => (
            <Alert
              key={notification.id}
              color={getSeverityColor(notification.severity)}
              icon={
                notification.severity === "success" ? (
                  <CheckCircleIcon className="h-6 w-6" />
                ) : (
                  <ExclamationTriangleIcon className="h-6 w-6" />
                )
              }
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Typography variant="h6" className="mb-1">
                    {notification.title}
                  </Typography>
                  <Typography variant="small">{notification.message}</Typography>
                  {notification.amount && (
                    <Typography variant="small" className="mt-1 font-bold">
                      Monto: $
                      {notification.amount.toLocaleString("es-ES", {
                        minimumFractionDigits: 2,
                      })}
                    </Typography>
                  )}
                </div>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Botón de acción */}
      <div className="mb-6">
        <Button
          onClick={() => {
            setEditingReminder(null);
            resetForm();
            setOpenDialog(true);
          }}
          className="flex items-center gap-2"
          color="blue"
        >
          <PlusIcon className="h-5 w-5" />
          Nuevo Recordatorio
        </Button>
      </div>

      {/* Recordatorios activos */}
      <Card className="border border-blue-gray-100 shadow-sm mb-6">
        <CardHeader
          floated={false}
          shadow={false}
          color="transparent"
          className="m-0 p-6"
        >
          <div className="flex items-center gap-2">
            <BellIcon className="h-6 w-6 text-blue-500" />
            <div>
              <Typography variant="h6" color="blue-gray">
                Pagos Recurrentes Activos
              </Typography>
              <Typography
                variant="small"
                className="font-normal text-blue-gray-500 mt-1"
              >
                Próximos pagos programados
              </Typography>
            </div>
          </div>
        </CardHeader>
        <CardBody className="px-0 pt-0 pb-2">
          {activeReminders.length === 0 ? (
            <div className="p-6 text-center">
              <Typography color="blue-gray" className="font-normal">
                No hay recordatorios activos. ¡Crea tu primer recordatorio!
              </Typography>
            </div>
          ) : (
            <div className="space-y-3 px-6">
              {activeReminders.map((reminder) => {
                const daysUntilDue = Math.ceil(
                  (new Date(reminder.nextDueDate).getTime() -
                    new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                const isOverdue = daysUntilDue < 0;
                const isUrgent = daysUntilDue <= 1 && daysUntilDue >= 0;

                return (
                  <Card
                    key={reminder.id}
                    className={`border shadow-sm ${
                      isOverdue
                        ? "border-red-500 bg-red-50"
                        : isUrgent
                        ? "border-orange-500 bg-orange-50"
                        : "border-blue-gray-100"
                    }`}
                  >
                    <CardBody className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div
                            className={`p-2 rounded-lg ${
                              isOverdue
                                ? "bg-red-100"
                                : isUrgent
                                ? "bg-orange-100"
                                : "bg-blue-50"
                            }`}
                          >
                            <CalendarDaysIcon
                              className={`h-5 w-5 ${
                                isOverdue
                                  ? "text-red-500"
                                  : isUrgent
                                  ? "text-orange-500"
                                  : "text-blue-500"
                              }`}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Typography variant="h6" color="blue-gray">
                                {reminder.name}
                              </Typography>
                              <Chip
                                value={FREQUENCIES[reminder.frequency]}
                                size="sm"
                                className="rounded-full"
                                color="blue-gray"
                              />
                            </div>
                            <Typography
                              variant="small"
                              className="text-blue-gray-600"
                            >
                              Categoría: {reminder.category}
                            </Typography>
                            <Typography
                              variant="small"
                              className="font-bold text-blue-gray-900 mt-1"
                            >
                              Monto: $
                              {reminder.amount.toLocaleString("es-ES", {
                                minimumFractionDigits: 2,
                              })}
                            </Typography>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={reminder.isActive}
                              onChange={() => toggleActive(reminder.id)}
                              color="blue"
                            />
                            <IconButton
                              variant="text"
                              size="sm"
                              onClick={() => handleEdit(reminder)}
                            >
                              <PencilIcon className="h-4 w-4 text-blue-500" />
                            </IconButton>
                            <IconButton
                              variant="text"
                              size="sm"
                              onClick={() => handleDelete(reminder.id)}
                            >
                              <TrashIcon className="h-4 w-4 text-red-500" />
                            </IconButton>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-blue-gray-100">
                        <div className="flex items-center gap-2">
                          <ClockIcon className="h-4 w-4 text-blue-gray-400" />
                          <Typography variant="small" className="text-blue-gray-600">
                            Vence:{" "}
                            {new Date(reminder.nextDueDate).toLocaleDateString(
                              "es-ES",
                              {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              }
                            )}
                          </Typography>
                          {isOverdue && (
                            <Chip
                              value={`Vencido hace ${Math.abs(daysUntilDue)} día(s)`}
                              size="sm"
                              color="red"
                              className="rounded-full"
                            />
                          )}
                          {isUrgent && (
                            <Chip
                              value={
                                daysUntilDue === 0
                                  ? "Vence hoy"
                                  : "Vence mañana"
                              }
                              size="sm"
                              color="orange"
                              className="rounded-full"
                            />
                          )}
                        </div>
                        <Button
                          size="sm"
                          color="green"
                          variant="outlined"
                          className="flex items-center gap-2"
                          onClick={() => handleMarkAsPaid(reminder)}
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                          Marcar como Pagado
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Recordatorios inactivos */}
      {inactiveReminders.length > 0 && (
        <Card className="border border-blue-gray-100 shadow-sm">
          <CardHeader
            floated={false}
            shadow={false}
            color="transparent"
            className="m-0 p-6"
          >
            <Typography variant="h6" color="blue-gray">
              Recordatorios Inactivos ({inactiveReminders.length})
            </Typography>
          </CardHeader>
          <CardBody className="px-0 pt-0 pb-2">
            <div className="space-y-3 px-6">
              {inactiveReminders.map((reminder) => (
                <Card
                  key={reminder.id}
                  className="border border-blue-gray-100 shadow-sm opacity-60"
                >
                  <CardBody className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Typography variant="h6" color="blue-gray">
                          {reminder.name}
                        </Typography>
                        <Chip
                          value="Inactivo"
                          size="sm"
                          color="gray"
                          className="rounded-full"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={reminder.isActive}
                          onChange={() => toggleActive(reminder.id)}
                          color="blue"
                        />
                        <IconButton
                          variant="text"
                          size="sm"
                          onClick={() => handleDelete(reminder.id)}
                        >
                          <TrashIcon className="h-4 w-4 text-red-500" />
                        </IconButton>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Dialog para agregar/editar recordatorio */}
      <Dialog open={openDialog} handler={() => setOpenDialog(false)} size="md">
        <DialogHeader>
          {editingReminder ? "Editar Recordatorio" : "Nuevo Recordatorio"}
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody divider className="space-y-4">
            <div>
              <Input
                type="text"
                label="Nombre del pago"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                placeholder="Ej: Netflix, Electricidad, Alquiler..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                step="0.01"
                label="Monto"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                required
              />
              <Select
                label="Categoría"
                value={formData.category}
                onChange={(val) => setFormData({ ...formData, category: val })}
              >
                {PAYMENT_CATEGORIES.map((cat) => (
                  <Option key={cat} value={cat}>
                    {cat}
                  </Option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Frecuencia"
                value={formData.frequency}
                onChange={(val) => setFormData({ ...formData, frequency: val })}
              >
                {Object.entries(FREQUENCIES).map(([key, label]) => (
                  <Option key={key} value={key}>
                    {label}
                  </Option>
                ))}
              </Select>
              <Input
                type="date"
                label="Próxima fecha de vencimiento"
                value={formData.nextDueDate}
                onChange={(e) =>
                  setFormData({ ...formData, nextDueDate: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Input
                type="number"
                label="Notificar con anticipación (días)"
                value={formData.notifyDaysBefore}
                onChange={(e) =>
                  setFormData({ ...formData, notifyDaysBefore: e.target.value })
                }
                min="0"
                max="30"
              />
              <Typography variant="small" className="text-blue-gray-500 mt-1">
                Recibirás una alerta antes de la fecha de vencimiento
              </Typography>
            </div>

            <div className="flex items-center justify-between">
              <Typography variant="small" className="text-blue-gray-600">
                Activar recordatorio
              </Typography>
              <Switch
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                color="blue"
              />
            </div>
          </DialogBody>
          <DialogFooter className="space-x-2">
            <Button
              variant="outlined"
              color="red"
              onClick={() => {
                setOpenDialog(false);
                setEditingReminder(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" color="green">
              {editingReminder ? "Actualizar" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}

export default Reminders;
