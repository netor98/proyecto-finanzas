import {
    AcademicCapIcon,
    BanknotesIcon,
    BeakerIcon,
    CakeIcon,
    CheckCircleIcon,
    HeartIcon,
    HomeModernIcon,
    PencilIcon,
    PlusIcon,
    ShoppingBagIcon,
    TrashIcon,
    TrophyIcon,
    XMarkIcon,
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
    Input,
    Option,
    Progress,
    Select,
    Switch,
    Textarea,
    Typography,
} from "@material-tailwind/react";
import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { mapGoalToBackend, mapGoalFromBackend } from "@/services/dataMapper";
import { useAuth } from "@/context/AuthContext";

// Categorías de metas
const GOAL_CATEGORIES = {
  emergency: { label: "Fondo de Emergencia", icon: BeakerIcon, color: "red" },
  vacation: { label: "Vacaciones", icon: CakeIcon, color: "blue" },
  purchase: { label: "Compra Grande", icon: ShoppingBagIcon, color: "purple" },
  home: { label: "Vivienda", icon: HomeModernIcon, color: "green" },
  education: { label: "Educación", icon: AcademicCapIcon, color: "indigo" },
  health: { label: "Salud", icon: HeartIcon, color: "pink" },
  other: { label: "Otro", icon: TrophyIcon, color: "amber" },
};

// Frecuencias de ahorro automático
const SAVING_FREQUENCIES = {
  none: "Sin ahorro automático",
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  quarterly: "Trimestral",
};

export function Goals() {
  const [goals, setGoals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { isAuthenticated } = useAuth();

  // Estado del formulario
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "emergency",
    targetAmount: "",
    currentAmount: "0",
    deadline: "",
    autoSaveEnabled: false,
    autoSaveAmount: "",
    autoSaveFrequency: "monthly",
    autoSaveDay: "1",
    active: true,
  });

  // Cargar datos desde API
  useEffect(() => {
    if (isAuthenticated) {
      loadGoals();
      loadTransactions();
    }
  }, [isAuthenticated]);

  const loadGoals = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.getGoals();
      if (response.success) {
        const mapped = response.data.map(mapGoalFromBackend);
        setGoals(mapped);
      }
    } catch (err) {
      setError(err.message || "Error loading goals");
      console.error("Error loading goals:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await api.getTransactions();
      if (response.success) {
        setTransactions(response.data || []);
      }
    } catch (err) {
      console.error("Error loading transactions:", err);
    }
  };

  // Generar notificaciones y aplicar reglas de ahorro automático
  useEffect(() => {
    generateNotifications();
    applyAutoSaveRules();
  }, [goals, transactions]);

  // Generar notificaciones inteligentes
  const generateNotifications = () => {
    const alerts = [];
    const today = new Date();

    goals.forEach((goal) => {
      if (!goal.active) return;

      const progress = (parseFloat(goal.currentAmount) / parseFloat(goal.targetAmount)) * 100;
      const daysUntilDeadline = goal.deadline
        ? Math.ceil((new Date(goal.deadline) - today) / (1000 * 60 * 60 * 24))
        : null;

      // Meta completada
      if (progress >= 100) {
        alerts.push({
          type: "success",
          title: "🎉 ¡Meta Alcanzada!",
          message: `¡Felicitaciones! Has completado tu meta "${goal.name}". Has ahorrado ${formatCurrency(goal.currentAmount)}.`,
        });
      }
      // Cerca de completar (90%+)
      else if (progress >= 90) {
        alerts.push({
          type: "info",
          title: "🎯 ¡Casi lo logras!",
          message: `Estás al ${progress.toFixed(0)}% de tu meta "${goal.name}". Solo te faltan ${formatCurrency(
            parseFloat(goal.targetAmount) - parseFloat(goal.currentAmount)
          )}.`,
        });
      }
      // Buen progreso (50%+)
      else if (progress >= 50) {
        alerts.push({
          type: "info",
          title: "💪 ¡Excelente Progreso!",
          message: `Has alcanzado el ${progress.toFixed(0)}% de tu meta "${goal.name}". ¡Sigue así!`,
        });
      }

      // Alertas de fecha límite
      if (daysUntilDeadline !== null) {
        if (daysUntilDeadline < 0 && progress < 100) {
          alerts.push({
            type: "error",
            title: "⚠️ Fecha Límite Vencida",
            message: `La fecha límite de "${goal.name}" ya pasó. Progreso actual: ${progress.toFixed(0)}%`,
          });
        } else if (daysUntilDeadline <= 30 && daysUntilDeadline > 0 && progress < 75) {
          const monthlyNeeded =
            (parseFloat(goal.targetAmount) - parseFloat(goal.currentAmount)) / (daysUntilDeadline / 30);
          alerts.push({
            type: "warning",
            title: "⏰ Fecha Límite Cercana",
            message: `Te quedan ${daysUntilDeadline} días para "${goal.name}". Necesitas ahorrar aprox. ${formatCurrency(
              monthlyNeeded
            )}/mes para alcanzarla.`,
          });
        }
      }

      // Alerta de ahorro automático configurado
      if (goal.autoSaveEnabled && progress < 100) {
        alerts.push({
          type: "info",
          title: "🤖 Ahorro Automático Activo",
          message: `Se están guardando ${formatCurrency(goal.autoSaveAmount)} ${
            SAVING_FREQUENCIES[goal.autoSaveFrequency].toLowerCase()
          } para "${goal.name}".`,
        });
      }
    });

    setNotifications(alerts);
  };

  // Aplicar reglas de ahorro automático
  const applyAutoSaveRules = () => {
    const today = new Date();
    const updatedGoals = [...goals];
    let hasChanges = false;

    updatedGoals.forEach((goal, index) => {
      if (!goal.autoSaveEnabled || !goal.active) return;

      const lastSave = goal.lastAutoSave ? new Date(goal.lastAutoSave) : null;
      let shouldSave = false;

      // Verificar si debe ejecutarse el ahorro según la frecuencia
      if (!lastSave) {
        shouldSave = true; // Primera vez
      } else {
        const daysSinceLastSave = Math.floor((today - lastSave) / (1000 * 60 * 60 * 24));

        switch (goal.autoSaveFrequency) {
          case "weekly":
            shouldSave = daysSinceLastSave >= 7;
            break;
          case "biweekly":
            shouldSave = daysSinceLastSave >= 14;
            break;
          case "monthly":
            shouldSave = today.getDate() === parseInt(goal.autoSaveDay) && daysSinceLastSave >= 28;
            break;
          case "quarterly":
            shouldSave = daysSinceLastSave >= 90;
            break;
        }
      }

      if (shouldSave && parseFloat(goal.currentAmount) < parseFloat(goal.targetAmount)) {
        const saveAmount = parseFloat(goal.autoSaveAmount);
        updatedGoals[index].currentAmount = (parseFloat(goal.currentAmount) + saveAmount).toString();
        updatedGoals[index].lastAutoSave = today.toISOString();
        hasChanges = true;

        // Crear transacción automática
        const newTransaction = {
          id: Date.now() + Math.random(),
          type: "expense",
          category: "Ahorro",
          amount: saveAmount.toString(),
          description: `Ahorro automático para: ${goal.name}`,
          date: today.toISOString().split("T")[0],
          createdAt: new Date().toISOString(),
        };

        const updatedTransactions = [...transactions, newTransaction];
        setTransactions(updatedTransactions);
        localStorage.setItem("transactions", JSON.stringify(updatedTransactions));
      }
    });

    if (hasChanges) {
      setGoals(updatedGoals);
    }
  };

  // Formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(amount) || 0);
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return "Sin fecha límite";
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Calcular días restantes
  const getDaysRemaining = (deadline) => {
    if (!deadline) return null;
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diff = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Calcular progreso
  const getProgress = (current, target) => {
    const percentage = (parseFloat(current) / parseFloat(target)) * 100;
    return Math.min(percentage, 100);
  };

  // Obtener color del progreso
  const getProgressColor = (progress) => {
    if (progress >= 100) return "green";
    if (progress >= 75) return "blue";
    if (progress >= 50) return "amber";
    if (progress >= 25) return "orange";
    return "red";
  };

  // Abrir dialog para crear/editar
  const handleOpenDialog = (goal = null) => {
    if (goal) {
      setEditingGoal(goal);
      setFormData(goal);
    } else {
      setEditingGoal(null);
      setFormData({
        name: "",
        description: "",
        category: "emergency",
        targetAmount: "",
        currentAmount: "0",
        deadline: "",
        autoSaveEnabled: false,
        autoSaveAmount: "",
        autoSaveFrequency: "monthly",
        autoSaveDay: "1",
        active: true,
      });
    }
    setOpenDialog(true);
  };

  // Cerrar dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingGoal(null);
  };

  // Guardar meta
  const handleSaveGoal = async () => {
    if (!formData.name || !formData.targetAmount) {
      alert("Por favor completa los campos requeridos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const backendData = mapGoalToBackend(formData);

      if (editingGoal) {
        const response = await api.updateGoal(editingGoal.id, backendData);
        if (response.success) {
          const updated = mapGoalFromBackend(response.data);
          setGoals(goals.map((g) => (g.id === editingGoal.id ? updated : g)));
        }
      } else {
        const response = await api.createGoal(backendData);
        if (response.success) {
          const newGoal = mapGoalFromBackend(response.data);
          setGoals([...goals, newGoal]);
        }
      }

      handleCloseDialog();
    } catch (err) {
      setError(err.message || "Error saving goal");
      alert(err.message || "Error saving goal");
    } finally {
      setLoading(false);
    }
  };

  // Eliminar meta
  const handleDeleteGoal = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar esta meta?")) {
      setLoading(true);
      try {
        await api.deleteGoal(id);
        setGoals(goals.filter((g) => g.id !== id));
      } catch (err) {
        setError(err.message || "Error deleting goal");
        alert(err.message || "Error deleting goal");
      } finally {
        setLoading(false);
      }
    }
  };

  // Agregar ahorro manual
  const handleAddSaving = async (goalId) => {
    const amount = prompt("¿Cuánto deseas agregar a esta meta?");
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
      setLoading(true);
      try {
        const response = await api.addFundsToGoal(goalId, parseFloat(amount));
        if (response.success) {
          const updated = mapGoalFromBackend(response.data);
          setGoals(goals.map((g) => (g.id === goalId ? updated : g)));
          loadGoals(); // Reload to get updated data
        }
      } catch (err) {
        alert(err.message || "Error adding funds");
      } finally {
        setLoading(false);
      }
    }
  };

  // Retirar ahorro
  const handleWithdrawSaving = async (goalId) => {
    const goal = goals.find((g) => g.id === goalId);
    const amount = prompt(
      `Saldo actual: ${formatCurrency(goal.currentAmount)}\n¿Cuánto deseas retirar?`
    );

    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
      const withdrawAmount = parseFloat(amount);
      const currentAmount = parseFloat(goal.currentAmount);

      if (withdrawAmount > currentAmount) {
        alert("No puedes retirar más de lo que tienes ahorrado");
        return;
      }

      setLoading(true);
      try {
        const response = await api.withdrawFundsFromGoal(goalId, withdrawAmount);
        if (response.success) {
          const updated = mapGoalFromBackend(response.data);
          setGoals(goals.map((g) => (g.id === goalId ? updated : g)));
          loadGoals(); // Reload to get updated data
        }
      } catch (err) {
        alert(err.message || "Error withdrawing funds");
      } finally {
        setLoading(false);
      }
    }
  };

  // Marcar meta como completada
  const handleCompleteGoal = (goalId) => {
    setGoals(
      goals.map((g) =>
        g.id === goalId
          ? {
              ...g,
              currentAmount: g.targetAmount,
              active: false,
              completedAt: new Date().toISOString(),
            }
          : g
      )
    );
  };

  // Filtrar metas activas e inactivas
  const activeGoals = goals.filter((g) => g.active);
  const completedGoals = goals.filter((g) => !g.active);

  // Calcular estadísticas
  const totalSaved = goals.reduce((sum, g) => sum + parseFloat(g.currentAmount), 0);
  const totalTarget = goals.reduce((sum, g) => sum + parseFloat(g.targetAmount), 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <div className="mt-12">
      {/* Notificaciones */}
      {notifications.length > 0 && (
        <div className="mb-6 space-y-3">
          {notifications.map((notification, index) => (
            <Alert key={index} color={notification.type} className="flex items-center gap-3">
              <div className="flex-1">
                <Typography variant="h6" className="mb-1">
                  {notification.title}
                </Typography>
                <Typography variant="small">{notification.message}</Typography>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {/* Encabezado con estadísticas generales */}
      <Card className="mb-6">
        <CardHeader
          floated={false}
          shadow={false}
          className="rounded-none bg-gradient-to-tr from-blue-600 to-blue-400 p-6"
        >
          <div className="flex items-center justify-between">
            <div className="text-white">
              <Typography variant="h4" className="mb-2">
                Metas Financieras
              </Typography>
              <Typography variant="small" className="font-normal opacity-80">
                Planifica y alcanza tus objetivos de ahorro
              </Typography>
            </div>
            <Button
              onClick={() => handleOpenDialog()}
              className="flex items-center gap-2"
              color="white"
            >
              <PlusIcon className="h-5 w-5" />
              Nueva Meta
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Typography variant="small" color="gray" className="mb-1">
                Total Ahorrado
              </Typography>
              <Typography variant="h4" color="green">
                {formatCurrency(totalSaved)}
              </Typography>
            </div>
            <div className="text-center">
              <Typography variant="small" color="gray" className="mb-1">
                Meta Total
              </Typography>
              <Typography variant="h4" color="blue">
                {formatCurrency(totalTarget)}
              </Typography>
            </div>
            <div className="text-center">
              <Typography variant="small" color="gray" className="mb-1">
                Progreso General
              </Typography>
              <Typography variant="h4" color="purple">
                {overallProgress.toFixed(1)}%
              </Typography>
            </div>
            <div className="text-center">
              <Typography variant="small" color="gray" className="mb-1">
                Metas Activas
              </Typography>
              <Typography variant="h4" color="orange">
                {activeGoals.length}
              </Typography>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Metas Activas */}
      {activeGoals.length > 0 && (
        <div className="mb-8">
          <Typography variant="h5" className="mb-4">
            Metas Activas ({activeGoals.length})
          </Typography>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeGoals.map((goal) => {
              const CategoryIcon = GOAL_CATEGORIES[goal.category].icon;
              const progress = getProgress(goal.currentAmount, goal.targetAmount);
              const progressColor = getProgressColor(progress);
              const daysRemaining = getDaysRemaining(goal.deadline);
              const remaining = parseFloat(goal.targetAmount) - parseFloat(goal.currentAmount);

              return (
                <Card key={goal.id} className="border-2 border-gray-200">
                  <CardHeader
                    floated={false}
                    shadow={false}
                    className={`rounded-t-lg bg-gradient-to-br from-${
                      GOAL_CATEGORIES[goal.category].color
                    }-500 to-${GOAL_CATEGORIES[goal.category].color}-700 p-4`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 text-white">
                        <CategoryIcon className="h-8 w-8" />
                        <div>
                          <Typography variant="h6">{goal.name}</Typography>
                          <Typography variant="small" className="opacity-80">
                            {GOAL_CATEGORIES[goal.category].label}
                          </Typography>
                        </div>
                      </div>
                      <Chip
                        value={`${progress.toFixed(0)}%`}
                        color="white"
                        className="text-gray-900"
                      />
                    </div>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    {goal.description && (
                      <Typography variant="small" color="gray">
                        {goal.description}
                      </Typography>
                    )}

                    {/* Progreso visual */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Typography variant="small" className="font-semibold">
                          Progreso
                        </Typography>
                        <Typography variant="small" color={progressColor}>
                          {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                        </Typography>
                      </div>
                      <Progress value={progress} color={progressColor} />
                      <Typography variant="small" color="gray" className="mt-1">
                        Faltan {formatCurrency(remaining)}
                      </Typography>
                    </div>

                    {/* Fecha límite */}
                    {goal.deadline && (
                      <div className="flex justify-between items-center">
                        <Typography variant="small" color="gray">
                          Fecha límite:
                        </Typography>
                        <Chip
                          value={
                            daysRemaining > 0
                              ? `${daysRemaining} días`
                              : daysRemaining === 0
                              ? "Hoy"
                              : "Vencida"
                          }
                          color={
                            daysRemaining > 30
                              ? "green"
                              : daysRemaining > 7
                              ? "amber"
                              : daysRemaining >= 0
                              ? "orange"
                              : "red"
                          }
                          size="sm"
                        />
                      </div>
                    )}

                    {/* Ahorro automático */}
                    {goal.autoSaveEnabled && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <BanknotesIcon className="h-4 w-4 text-blue-600" />
                          <Typography variant="small" className="font-semibold text-blue-900">
                            Ahorro Automático
                          </Typography>
                        </div>
                        <Typography variant="small" color="gray">
                          {formatCurrency(goal.autoSaveAmount)} {SAVING_FREQUENCIES[goal.autoSaveFrequency].toLowerCase()}
                        </Typography>
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        color="green"
                        className="flex-1"
                        onClick={() => handleAddSaving(goal.id)}
                      >
                        Agregar
                      </Button>
                      <Button
                        size="sm"
                        color="orange"
                        className="flex-1"
                        onClick={() => handleWithdrawSaving(goal.id)}
                      >
                        Retirar
                      </Button>
                      <Button
                        size="sm"
                        color="blue"
                        onClick={() => handleOpenDialog(goal)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        color="red"
                        onClick={() => handleDeleteGoal(goal.id)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>

                    {progress >= 100 && (
                      <Button
                        fullWidth
                        color="green"
                        className="flex items-center justify-center gap-2"
                        onClick={() => handleCompleteGoal(goal.id)}
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                        Marcar como Completada
                      </Button>
                    )}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Mensaje si no hay metas activas */}
      {activeGoals.length === 0 && (
        <Card className="mb-8">
          <CardBody className="text-center py-12">
            <TrophyIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <Typography variant="h5" color="gray" className="mb-2">
              No tienes metas activas
            </Typography>
            <Typography color="gray" className="mb-4">
              Crea tu primera meta financiera para comenzar a ahorrar
            </Typography>
            <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2 mx-auto">
              <PlusIcon className="h-5 w-5" />
              Crear Meta
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Metas Completadas */}
      {completedGoals.length > 0 && (
        <div>
          <Typography variant="h5" className="mb-4 flex items-center gap-2">
            <TrophyIcon className="h-6 w-6 text-yellow-700" />
            Metas Completadas ({completedGoals.length})
          </Typography>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedGoals.map((goal) => {
              const CategoryIcon = GOAL_CATEGORIES[goal.category].icon;

              return (
                <Card key={goal.id} className="border-2 border-green-200 bg-green-50">
                  <CardHeader
                    floated={false}
                    shadow={false}
                    className="rounded-t-lg bg-gradient-to-br from-green-500 to-green-700 p-4"
                  >
                    <div className="flex items-center justify-between text-white">
                      <div className="flex items-center gap-3">
                        <CategoryIcon className="h-8 w-8" />
                        <div>
                          <Typography variant="h6">{goal.name}</Typography>
                          <Typography variant="small" className="opacity-80">
                            {GOAL_CATEGORIES[goal.category].label}
                          </Typography>
                        </div>
                      </div>
                      <CheckCircleIcon className="h-8 w-8" />
                    </div>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <Typography variant="small" color="gray">
                          Monto alcanzado:
                        </Typography>
                        <Typography variant="small" className="font-bold text-green-900">
                          {formatCurrency(goal.currentAmount)}
                        </Typography>
                      </div>
                      {goal.completedAt && (
                        <div className="flex justify-between">
                          <Typography variant="small" color="gray">
                            Completada:
                          </Typography>
                          <Typography variant="small">
                            {formatDate(goal.completedAt.split("T")[0])}
                          </Typography>
                        </div>
                      )}
                      <Button
                        size="sm"
                        color="red"
                        fullWidth
                        onClick={() => handleDeleteGoal(goal.id)}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialog para crear/editar meta */}
      <Dialog open={openDialog} handler={handleCloseDialog} size="lg">
        <DialogHeader>
          {editingGoal ? "Editar Meta" : "Nueva Meta Financiera"}
        </DialogHeader>
        <DialogBody divider className="h-[70vh] overflow-y-auto">
          <div className="space-y-4">
            {/* Nombre */}
            <div>
              <Typography variant="small" className="mb-2 font-semibold">
                Nombre de la Meta *
              </Typography>
              <Input
                label="Ej: Fondo de emergencia, Vacaciones 2026"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Descripción */}
            <div>
              <Typography variant="small" className="mb-2 font-semibold">
                Descripción
              </Typography>
              <Textarea
                label="Describe tu meta (opcional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Categoría */}
            <div>
              <Typography variant="small" className="mb-2 font-semibold">
                Categoría
              </Typography>
              <Select
                label="Selecciona una categoría"
                value={formData.category}
                onChange={(value) => setFormData({ ...formData, category: value })}
              >
                {Object.entries(GOAL_CATEGORIES).map(([key, { label, icon: Icon }]) => (
                  <Option key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      {label}
                    </div>
                  </Option>
                ))}
              </Select>
            </div>

            {/* Montos */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Typography variant="small" className="mb-2 font-semibold">
                  Monto Objetivo *
                </Typography>
                <Input
                  type="number"
                  label="$0.00"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                />
              </div>
              <div>
                <Typography variant="small" className="mb-2 font-semibold">
                  Monto Actual
                </Typography>
                <Input
                  type="number"
                  label="$0.00"
                  value={formData.currentAmount}
                  onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                />
              </div>
            </div>

            {/* Fecha límite */}
            <div>
              <Typography variant="small" className="mb-2 font-semibold">
                Fecha Límite
              </Typography>
              <Input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>

            {/* Ahorro automático */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Typography variant="small" className="font-semibold">
                    Ahorro Automático
                  </Typography>
                  <Typography variant="small" color="gray">
                    Configura reglas de ahorro automático
                  </Typography>
                </div>
                <Switch
                  checked={formData.autoSaveEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, autoSaveEnabled: e.target.checked })
                  }
                />
              </div>

              {formData.autoSaveEnabled && (
                <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
                  <div>
                    <Typography variant="small" className="mb-2 font-semibold">
                      Monto a Ahorrar
                    </Typography>
                    <Input
                      type="number"
                      label="$0.00"
                      value={formData.autoSaveAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, autoSaveAmount: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <Typography variant="small" className="mb-2 font-semibold">
                      Frecuencia
                    </Typography>
                    <Select
                      label="¿Con qué frecuencia?"
                      value={formData.autoSaveFrequency}
                      onChange={(value) =>
                        setFormData({ ...formData, autoSaveFrequency: value })
                      }
                    >
                      {Object.entries(SAVING_FREQUENCIES).map(([key, label]) => (
                        <Option key={key} value={key} disabled={key === "none"}>
                          {label}
                        </Option>
                      ))}
                    </Select>
                  </div>

                  {formData.autoSaveFrequency === "monthly" && (
                    <div>
                      <Typography variant="small" className="mb-2 font-semibold">
                        Día del Mes
                      </Typography>
                      <Input
                        type="number"
                        min="1"
                        max="28"
                        label="Día (1-28)"
                        value={formData.autoSaveDay}
                        onChange={(e) =>
                          setFormData({ ...formData, autoSaveDay: e.target.value })
                        }
                      />
                      <Typography variant="small" color="gray" className="mt-1">
                        Se ejecutará el día {formData.autoSaveDay} de cada mes
                      </Typography>
                    </div>
                  )}

                  <Alert color="blue" className="flex items-start gap-2">
                    <BanknotesIcon className="h-5 w-5 mt-0.5" />
                    <Typography variant="small">
                      El sistema guardará automáticamente {formatCurrency(formData.autoSaveAmount || 0)}{" "}
                      {SAVING_FREQUENCIES[formData.autoSaveFrequency]?.toLowerCase()} en esta meta y
                      creará una transacción de gasto.
                    </Typography>
                  </Alert>
                </div>
              )}
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="text" color="red" onClick={handleCloseDialog} className="mr-2">
            <XMarkIcon className="h-5 w-5 inline mr-1" />
            Cancelar
          </Button>
          <Button color="blue" onClick={handleSaveGoal}>
            <CheckCircleIcon className="h-5 w-5 inline mr-1" />
            Guardar Meta
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
