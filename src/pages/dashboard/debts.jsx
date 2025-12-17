import {
    BanknotesIcon,
    CalendarDaysIcon,
    CheckCircleIcon,
    CreditCardIcon,
    PencilIcon,
    PlusIcon,
    TrashIcon,
    XMarkIcon
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
    Tab,
    TabPanel,
    Tabs,
    TabsBody,
    TabsHeader,
    Textarea,
    Typography,
} from "@material-tailwind/react";
import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { mapDebtToBackend, mapDebtFromBackend } from "@/services/dataMapper";
import { useAuth } from "@/context/AuthContext";

// Tipos de deuda
const DEBT_TYPES = {
  credit_card: { label: "Tarjeta de Crédito", icon: CreditCardIcon, color: "red" },
  personal_loan: { label: "Préstamo Personal", icon: BanknotesIcon, color: "orange" },
  mortgage: { label: "Hipoteca", icon: BanknotesIcon, color: "blue" },
  auto_loan: { label: "Crédito Automotriz", icon: BanknotesIcon, color: "green" },
  student_loan: { label: "Crédito Educativo", icon: BanknotesIcon, color: "indigo" },
  business_loan: { label: "Crédito Empresarial", icon: BanknotesIcon, color: "purple" },
  other: { label: "Otro", icon: BanknotesIcon, color: "gray" },
};

// Frecuencias de pago
const PAYMENT_FREQUENCIES = {
  weekly: { label: "Semanal", months: 0.23 },
  biweekly: { label: "Quincenal", months: 0.5 },
  monthly: { label: "Mensual", months: 1 },
  quarterly: { label: "Trimestral", months: 3 },
  yearly: { label: "Anual", months: 12 },
};

export function Debts() {
  const [debts, setDebts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { isAuthenticated } = useAuth();

  // Estado del formulario de deuda
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "credit_card",
    principal: "",
    currentBalance: "",
    interestRate: "",
    paymentAmount: "",
    paymentFrequency: "monthly",
    nextPaymentDate: "",
    minimumPayment: "",
    creditor: "",
    accountNumber: "",
    startDate: "",
    autoReminder: true,
    reminderDays: "3",
    active: true,
  });

  // Estado del formulario de pago
  const [paymentData, setPaymentData] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
  });

  // Cargar datos desde API
  useEffect(() => {
    if (isAuthenticated) {
      loadDebts();
      loadTransactions();
    }
  }, [isAuthenticated]);

  const loadDebts = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.getDebts();
      if (response.success) {
        const mapped = response.data.map(mapDebtFromBackend);
        setDebts(mapped);
      }
    } catch (err) {
      setError(err.message || "Error loading debts");
      console.error("Error loading debts:", err);
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

  // Generar notificaciones y actualizar recordatorios
  useEffect(() => {
    generateNotifications();
    updateReminders();
  }, [debts]);

  // Generar notificaciones inteligentes
  const generateNotifications = () => {
    const alerts = [];
    const today = new Date();

    debts.forEach((debt) => {
      if (!debt.active) return;

      // Calcular días hasta próximo pago
      const nextPayment = debt.nextPaymentDate ? new Date(debt.nextPaymentDate) : null;
      const daysUntilPayment = nextPayment
        ? Math.ceil((nextPayment - today) / (1000 * 60 * 60 * 24))
        : null;

      // Alerta de pago próximo
      if (daysUntilPayment !== null && daysUntilPayment <= parseInt(debt.reminderDays) && daysUntilPayment >= 0) {
        alerts.push({
          type: "warning",
          title: "⏰ Pago Próximo",
          message: `El pago de "${debt.name}" vence en ${daysUntilPayment} día${
            daysUntilPayment !== 1 ? "s" : ""
          }. Monto: ${formatCurrency(debt.minimumPayment || debt.paymentAmount)}.`,
        });
      }

      // Alerta de pago vencido
      if (daysUntilPayment !== null && daysUntilPayment < 0) {
        alerts.push({
          type: "error",
          title: "🚨 Pago Vencido",
          message: `El pago de "${debt.name}" está vencido hace ${Math.abs(daysUntilPayment)} día${
            Math.abs(daysUntilPayment) !== 1 ? "s" : ""
          }. ¡Paga lo antes posible!`,
        });
      }

      // Alerta de tasa de interés alta (>20%)
      if (parseFloat(debt.interestRate) > 20) {
        alerts.push({
          type: "warning",
          title: "⚠️ Tasa de Interés Alta",
          message: `"${debt.name}" tiene una tasa de ${debt.interestRate}% anual. Considera refinanciar o pagar más del mínimo.`,
        });
      }

      // Alerta de progreso bajo (menos del 25% pagado)
      const progress = getPaymentProgress(debt);
      if (progress < 25 && debt.startDate) {
        const monthsSinceStart = Math.floor(
          (today - new Date(debt.startDate)) / (1000 * 60 * 60 * 24 * 30)
        );
        if (monthsSinceStart > 6) {
          alerts.push({
            type: "info",
            title: "💡 Considera Pagar Más",
            message: `Llevas ${monthsSinceStart} meses con "${debt.name}" y solo has pagado el ${progress.toFixed(
              1
            )}%. Aumentar tus pagos reducirá los intereses.`,
          });
        }
      }

      // Celebración por progreso significativo
      if (progress >= 75 && progress < 100) {
        alerts.push({
          type: "success",
          title: "🎉 ¡Casi Terminas!",
          message: `Has pagado el ${progress.toFixed(1)}% de "${debt.name}". ¡Solo te falta ${formatCurrency(
            parseFloat(debt.currentBalance)
          )}!`,
        });
      }

      // Deuda liquidada
      if (parseFloat(debt.currentBalance) <= 0 && debt.active) {
        alerts.push({
          type: "success",
          title: "✅ ¡Deuda Liquidada!",
          message: `¡Felicitaciones! Has terminado de pagar "${debt.name}". Marca como pagada para actualizar tu estado.`,
        });
      }
    });

    setNotifications(alerts);
  };

  // Actualizar o crear recordatorios automáticos
  const updateReminders = () => {
    if (!reminders) return;

    const updatedReminders = [...reminders];
    let hasChanges = false;

    debts.forEach((debt) => {
      if (!debt.autoReminder || !debt.active) return;

      // Buscar recordatorio existente para esta deuda
      const existingIndex = updatedReminders.findIndex((r) => r.debtId === debt.id);

      const reminderData = {
        id: existingIndex >= 0 ? updatedReminders[existingIndex].id : Date.now() + Math.random(),
        debtId: debt.id,
        name: `Pago: ${debt.name}`,
        amount: debt.minimumPayment || debt.paymentAmount,
        category: "Deudas",
        frequency: debt.paymentFrequency,
        nextDueDate: debt.nextPaymentDate,
        daysNotice: parseInt(debt.reminderDays),
        active: true,
        createdAt: existingIndex >= 0 ? updatedReminders[existingIndex].createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        updatedReminders[existingIndex] = reminderData;
      } else {
        updatedReminders.push(reminderData);
      }
      hasChanges = true;
    });

    if (hasChanges) {
      localStorage.setItem("reminders", JSON.stringify(updatedReminders));
      setReminders(updatedReminders);
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
    if (!dateString) return "Sin fecha";
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Calcular progreso de pago
  const getPaymentProgress = (debt) => {
    const principal = parseFloat(debt.principal);
    const current = parseFloat(debt.currentBalance);
    if (principal === 0) return 100;
    const paid = principal - current;
    return Math.max(0, Math.min(100, (paid / principal) * 100));
  };

  // Calcular interés mensual
  const calculateMonthlyInterest = (balance, annualRate) => {
    const monthlyRate = parseFloat(annualRate) / 100 / 12;
    return parseFloat(balance) * monthlyRate;
  };

  // Calcular fecha estimada de liquidación
  const calculatePayoffDate = (debt) => {
    const balance = parseFloat(debt.currentBalance);
    const payment = parseFloat(debt.paymentAmount);
    const annualRate = parseFloat(debt.interestRate);
    const frequency = PAYMENT_FREQUENCIES[debt.paymentFrequency].months;

    if (balance <= 0) return null;
    if (payment <= 0) return null;

    const monthlyRate = annualRate / 100 / 12;
    const paymentsPerYear = 12 / frequency;
    const effectiveMonthlyPayment = (payment * paymentsPerYear) / 12;

    if (monthlyRate === 0) {
      // Sin interés
      const months = balance / effectiveMonthlyPayment;
      const payoffDate = new Date();
      payoffDate.setMonth(payoffDate.getMonth() + Math.ceil(months));
      return payoffDate;
    }

    // Con interés - fórmula de amortización
    const monthlyInterest = calculateMonthlyInterest(balance, annualRate);
    if (effectiveMonthlyPayment <= monthlyInterest) {
      return null; // Nunca se pagará (pago menor que intereses)
    }

    const months = Math.log(effectiveMonthlyPayment / (effectiveMonthlyPayment - balance * monthlyRate)) / Math.log(1 + monthlyRate);

    if (!isFinite(months) || months < 0) return null;

    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + Math.ceil(months));
    return payoffDate;
  };

  // Calcular total de intereses a pagar
  const calculateTotalInterest = (debt) => {
    const balance = parseFloat(debt.currentBalance);
    const payment = parseFloat(debt.paymentAmount);
    const annualRate = parseFloat(debt.interestRate);
    const frequency = PAYMENT_FREQUENCIES[debt.paymentFrequency].months;

    if (balance <= 0 || payment <= 0 || annualRate === 0) return 0;

    const monthlyRate = annualRate / 100 / 12;
    const paymentsPerYear = 12 / frequency;
    const effectiveMonthlyPayment = (payment * paymentsPerYear) / 12;

    const monthlyInterest = calculateMonthlyInterest(balance, annualRate);
    if (effectiveMonthlyPayment <= monthlyInterest) return Infinity;

    const months = Math.log(effectiveMonthlyPayment / (effectiveMonthlyPayment - balance * monthlyRate)) / Math.log(1 + monthlyRate);

    if (!isFinite(months) || months < 0) return Infinity;

    const totalPaid = effectiveMonthlyPayment * months;
    return totalPaid - balance;
  };

  // Calcular próxima fecha de pago
  const calculateNextPaymentDate = (currentDate, frequency) => {
    const date = new Date(currentDate);
    const monthsToAdd = PAYMENT_FREQUENCIES[frequency].months;

    if (monthsToAdd < 1) {
      // Semanal o quincenal
      const days = monthsToAdd * 30;
      date.setDate(date.getDate() + days);
    } else {
      date.setMonth(date.getMonth() + monthsToAdd);
    }

    return date.toISOString().split("T")[0];
  };

  // Obtener color del progreso
  const getProgressColor = (progress) => {
    if (progress >= 75) return "green";
    if (progress >= 50) return "blue";
    if (progress >= 25) return "amber";
    return "red";
  };

  // Abrir dialog para crear/editar
  const handleOpenDialog = (debt = null) => {
    if (debt) {
      setEditingDebt(debt);
      setFormData(debt);
    } else {
      setEditingDebt(null);
      setFormData({
        name: "",
        description: "",
        type: "credit_card",
        principal: "",
        currentBalance: "",
        interestRate: "",
        paymentAmount: "",
        paymentFrequency: "monthly",
        nextPaymentDate: "",
        minimumPayment: "",
        creditor: "",
        accountNumber: "",
        startDate: new Date().toISOString().split("T")[0],
        autoReminder: true,
        reminderDays: "3",
        active: true,
      });
    }
    setOpenDialog(true);
  };

  // Cerrar dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingDebt(null);
  };

  // Guardar deuda
  const handleSaveDebt = async () => {
    if (!formData.name || !formData.principal || !formData.currentBalance) {
      alert("Por favor completa los campos requeridos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const backendData = mapDebtToBackend(formData);

      if (editingDebt) {
        const response = await api.updateDebt(editingDebt.id, backendData);
        if (response.success) {
          const updated = mapDebtFromBackend(response.data);
          setDebts(debts.map((d) => (d.id === editingDebt.id ? updated : d)));
        }
      } else {
        const response = await api.createDebt(backendData);
        if (response.success) {
          const newDebt = mapDebtFromBackend(response.data);
          setDebts([...debts, newDebt]);
        }
      }

      handleCloseDialog();
    } catch (err) {
      setError(err.message || "Error saving debt");
      alert(err.message || "Error saving debt");
    } finally {
      setLoading(false);
    }
  };

  // Eliminar deuda
  const handleDeleteDebt = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar esta deuda?")) {
      setLoading(true);
      try {
        await api.deleteDebt(id);
        setDebts(debts.filter((d) => d.id !== id));
        // Eliminar recordatorio asociado
        const updatedReminders = reminders.filter((r) => r.debtId !== id);
        setReminders(updatedReminders);
      } catch (err) {
        setError(err.message || "Error deleting debt");
        alert(err.message || "Error deleting debt");
      } finally {
        setLoading(false);
      }
    }
  };

  // Abrir dialog de pago
  const handleOpenPaymentDialog = (debt) => {
    setSelectedDebt(debt);
    setPaymentData({
      amount: debt.minimumPayment || debt.paymentAmount || "",
      date: new Date().toISOString().split("T")[0],
      description: `Pago de ${debt.name}`,
    });
    setOpenPaymentDialog(true);
  };

  // Cerrar dialog de pago
  const handleClosePaymentDialog = () => {
    setOpenPaymentDialog(false);
    setSelectedDebt(null);
  };

  // Registrar pago
  const handleRegisterPayment = async () => {
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      alert("Por favor ingresa un monto válido");
      return;
    }

    setLoading(true);
    try {
      const response = await api.makeDebtPayment(selectedDebt.id, {
        amount: parseFloat(paymentData.amount),
        date: paymentData.date,
        description: paymentData.description,
      });

      if (response.success) {
        const updated = mapDebtFromBackend(response.data);
        setDebts(debts.map((d) => (d.id === selectedDebt.id ? updated : d)));
        loadDebts(); // Reload to get updated data
        loadTransactions(); // Reload transactions
      }
      handleClosePaymentDialog();
    } catch (err) {
      alert(err.message || "Error registering payment");
    } finally {
      setLoading(false);
    }
  };

  // Marcar deuda como pagada
  const handleMarkAsPaid = (debtId) => {
    if (window.confirm("¿Confirmas que esta deuda está completamente liquidada?")) {
      setDebts(
        debts.map((d) =>
          d.id === debtId
            ? {
                ...d,
                currentBalance: "0",
                active: false,
                paidOffDate: new Date().toISOString(),
              }
            : d
        )
      );
    }
  };

  // Filtrar deudas
  const activeDebts = debts.filter((d) => d.active && parseFloat(d.currentBalance) > 0);
  const paidDebts = debts.filter((d) => !d.active || parseFloat(d.currentBalance) <= 0);

  // Calcular estadísticas
  const totalDebt = activeDebts.reduce((sum, d) => sum + parseFloat(d.currentBalance), 0);
  const totalPrincipal = activeDebts.reduce((sum, d) => sum + parseFloat(d.principal), 0);
  const totalPaid = totalPrincipal - totalDebt;
  const overallProgress = totalPrincipal > 0 ? (totalPaid / totalPrincipal) * 100 : 0;
  const totalMonthlyPayments = activeDebts.reduce((sum, d) => {
    const frequency = PAYMENT_FREQUENCIES[d.paymentFrequency].months;
    const monthlyEquivalent = parseFloat(d.paymentAmount) * (12 / (frequency * 12));
    return sum + monthlyEquivalent;
  }, 0);
  const avgInterestRate =
    activeDebts.length > 0
      ? activeDebts.reduce((sum, d) => sum + parseFloat(d.interestRate), 0) / activeDebts.length
      : 0;

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
          className="rounded-none bg-gradient-to-tr from-red-600 to-red-400 p-6"
        >
          <div className="flex items-center justify-between">
            <div className="text-white">
              <Typography variant="h4" className="mb-2">
                Manejo de Deudas
              </Typography>
              <Typography variant="small" className="font-normal opacity-80">
                Controla tus préstamos y créditos de manera eficiente
              </Typography>
            </div>
            <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2" color="white">
              <PlusIcon className="h-5 w-5" />
              Nueva Deuda
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center">
              <Typography variant="small" color="gray" className="mb-1">
                Total Adeudado
              </Typography>
              <Typography variant="h4" color="red">
                {formatCurrency(totalDebt)}
              </Typography>
            </div>
            <div className="text-center">
              <Typography variant="small" color="gray" className="mb-1">
                Total Pagado
              </Typography>
              <Typography variant="h4" color="green">
                {formatCurrency(totalPaid)}
              </Typography>
            </div>
            <div className="text-center">
              <Typography variant="small" color="gray" className="mb-1">
                Progreso General
              </Typography>
              <Typography variant="h4" color="blue">
                {overallProgress.toFixed(1)}%
              </Typography>
            </div>
            <div className="text-center">
              <Typography variant="small" color="gray" className="mb-1">
                Pago Mensual Aprox.
              </Typography>
              <Typography variant="h4" color="orange">
                {formatCurrency(totalMonthlyPayments)}
              </Typography>
            </div>
            <div className="text-center">
              <Typography variant="small" color="gray" className="mb-1">
                Deudas Activas
              </Typography>
              <Typography variant="h4" color="purple">
                {activeDebts.length}
              </Typography>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab}>
        <TabsHeader>
          <Tab value="active" onClick={() => setActiveTab("active")}>
            Deudas Activas ({activeDebts.length})
          </Tab>
          <Tab value="paid" onClick={() => setActiveTab("paid")}>
            Deudas Pagadas ({paidDebts.length})
          </Tab>
        </TabsHeader>
        <TabsBody>
          <TabPanel value="active">
            {/* Deudas Activas */}
            {activeDebts.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {activeDebts.map((debt) => {
                  const DebtIcon = DEBT_TYPES[debt.type].icon;
                  const progress = getPaymentProgress(debt);
                  const progressColor = getProgressColor(progress);
                  const payoffDate = calculatePayoffDate(debt);
                  const totalInterest = calculateTotalInterest(debt);
                  const monthlyInterest = calculateMonthlyInterest(debt.currentBalance, debt.interestRate);
                  const nextPayment = debt.nextPaymentDate ? new Date(debt.nextPaymentDate) : null;
                  const daysUntilPayment = nextPayment
                    ? Math.ceil((nextPayment - new Date()) / (1000 * 60 * 60 * 24))
                    : null;

                  return (
                    <Card key={debt.id} className="border-2 border-gray-200">
                      <CardHeader
                        floated={false}
                        shadow={false}
                        className={`rounded-t-lg bg-gradient-to-br from-${
                          DEBT_TYPES[debt.type].color
                        }-500 to-${DEBT_TYPES[debt.type].color}-700 p-4`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 text-white">
                            <DebtIcon className="h-8 w-8" />
                            <div>
                              <Typography variant="h6">{debt.name}</Typography>
                              <Typography variant="small" className="opacity-80">
                                {DEBT_TYPES[debt.type].label}
                              </Typography>
                            </div>
                          </div>
                          <Chip value={`${progress.toFixed(0)}%`} color="white" className="text-gray-900" />
                        </div>
                      </CardHeader>
                      <CardBody className="space-y-4">
                        {debt.description && (
                          <Typography variant="small" color="gray">
                            {debt.description}
                          </Typography>
                        )}

                        {/* Información del acreedor */}
                        {debt.creditor && (
                          <div className="flex justify-between">
                            <Typography variant="small" color="gray">
                              Acreedor:
                            </Typography>
                            <Typography variant="small" className="font-semibold">
                              {debt.creditor}
                            </Typography>
                          </div>
                        )}

                        {/* Saldo actual */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <Typography variant="small" className="font-semibold">
                              Saldo Actual
                            </Typography>
                            <Typography variant="small" color="red" className="font-bold text-lg">
                              {formatCurrency(debt.currentBalance)}
                            </Typography>
                          </div>
                          <Progress value={progress} color={progressColor} />
                          <div className="flex justify-between mt-1">
                            <Typography variant="small" color="gray">
                              Pagado: {formatCurrency(parseFloat(debt.principal) - parseFloat(debt.currentBalance))}
                            </Typography>
                            <Typography variant="small" color="gray">
                              de {formatCurrency(debt.principal)}
                            </Typography>
                          </div>
                        </div>

                        {/* Tasa de interés */}
                        <div className="flex justify-between items-center">
                          <Typography variant="small" color="gray">
                            Tasa de Interés:
                          </Typography>
                          <Chip
                            value={`${debt.interestRate}% anual`}
                            color={parseFloat(debt.interestRate) > 20 ? "red" : parseFloat(debt.interestRate) > 10 ? "orange" : "green"}
                            size="sm"
                          />
                        </div>

                        {/* Interés mensual */}
                        <div className="flex justify-between">
                          <Typography variant="small" color="gray">
                            Interés Mensual Aprox.:
                          </Typography>
                          <Typography variant="small" color="red">
                            {formatCurrency(monthlyInterest)}
                          </Typography>
                        </div>

                        {/* Pago programado */}
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <Typography variant="small" className="font-semibold text-blue-900">
                              Pago Programado
                            </Typography>
                            <Typography variant="small" className="font-bold text-blue-900">
                              {formatCurrency(debt.paymentAmount)}
                            </Typography>
                          </div>
                          <div className="flex justify-between items-center">
                            <Typography variant="small" color="gray">
                              Frecuencia:
                            </Typography>
                            <Typography variant="small">
                              {PAYMENT_FREQUENCIES[debt.paymentFrequency].label}
                            </Typography>
                          </div>
                          {debt.minimumPayment && (
                            <div className="flex justify-between items-center mt-1">
                              <Typography variant="small" color="gray">
                                Pago Mínimo:
                              </Typography>
                              <Typography variant="small" color="orange">
                                {formatCurrency(debt.minimumPayment)}
                              </Typography>
                            </div>
                          )}
                        </div>

                        {/* Próximo pago */}
                        {debt.nextPaymentDate && (
                          <div className="flex justify-between items-center">
                            <Typography variant="small" color="gray">
                              Próximo Pago:
                            </Typography>
                            <Chip
                              value={
                                daysUntilPayment > 7
                                  ? formatDate(debt.nextPaymentDate)
                                  : daysUntilPayment >= 0
                                  ? `En ${daysUntilPayment} día${daysUntilPayment !== 1 ? "s" : ""}`
                                  : `Vencido ${Math.abs(daysUntilPayment)} día${Math.abs(daysUntilPayment) !== 1 ? "s" : ""}`
                              }
                              color={
                                daysUntilPayment > 7
                                  ? "green"
                                  : daysUntilPayment >= 3
                                  ? "amber"
                                  : daysUntilPayment >= 0
                                  ? "orange"
                                  : "red"
                              }
                              size="sm"
                            />
                          </div>
                        )}

                        {/* Fecha estimada de liquidación */}
                        {payoffDate && (
                          <div className="bg-green-50 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <CalendarDaysIcon className="h-4 w-4 text-green-600" />
                              <Typography variant="small" className="font-semibold text-green-900">
                                Fecha Estimada de Liquidación
                              </Typography>
                            </div>
                            <Typography variant="small" className="font-bold text-green-900">
                              {formatDate(payoffDate.toISOString().split("T")[0])}
                            </Typography>
                            <Typography variant="small" color="gray" className="mt-1">
                              Intereses totales: {formatCurrency(totalInterest)}
                            </Typography>
                          </div>
                        )}

                        {!payoffDate && parseFloat(debt.interestRate) > 0 && (
                          <Alert color="amber" className="py-2">
                            <Typography variant="small">
                              ⚠️ Tu pago es menor o igual a los intereses mensuales. Aumenta el pago para liquidar la
                              deuda.
                            </Typography>
                          </Alert>
                        )}

                        {/* Historial de pagos recientes */}
                        {debt.paymentHistory && debt.paymentHistory.length > 0 && (
                          <div>
                            <Typography variant="small" className="font-semibold mb-2">
                              Últimos Pagos ({debt.paymentHistory.length})
                            </Typography>
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                              {debt.paymentHistory.slice(-3).reverse().map((payment) => (
                                <div key={payment.id} className="flex justify-between text-xs">
                                  <span className="text-gray-600">{formatDate(payment.date)}</span>
                                  <span className="font-semibold text-green-600">
                                    {formatCurrency(payment.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Acciones */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            color="green"
                            className="flex-1"
                            onClick={() => handleOpenPaymentDialog(debt)}
                          >
                            <BanknotesIcon className="h-4 w-4 inline mr-1" />
                            Registrar Pago
                          </Button>
                          <Button size="sm" color="blue" onClick={() => handleOpenDialog(debt)}>
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button size="sm" color="red" onClick={() => handleDeleteDebt(debt.id)}>
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>

                        {parseFloat(debt.currentBalance) <= 0 && (
                          <Button
                            fullWidth
                            color="green"
                            className="flex items-center justify-center gap-2"
                            onClick={() => handleMarkAsPaid(debt.id)}
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                            Marcar como Pagada
                          </Button>
                        )}
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardBody className="text-center py-12">
                  <CreditCardIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <Typography variant="h5" color="gray" className="mb-2">
                    No tienes deudas activas
                  </Typography>
                  <Typography color="gray" className="mb-4">
                    ¡Excelente! Mantén este estado o registra una deuda si tienes alguna
                  </Typography>
                  <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2 mx-auto">
                    <PlusIcon className="h-5 w-5" />
                    Registrar Deuda
                  </Button>
                </CardBody>
              </Card>
            )}
          </TabPanel>

          <TabPanel value="paid">
            {/* Deudas Pagadas */}
            {paidDebts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paidDebts.map((debt) => {
                  const DebtIcon = DEBT_TYPES[debt.type].icon;
                  const totalInterestPaid =
                    debt.paymentHistory?.reduce((sum, p) => sum + parseFloat(p.amount), 0) -
                      parseFloat(debt.principal) || 0;

                  return (
                    <Card key={debt.id} className="border-2 border-green-200 bg-green-50">
                      <CardHeader
                        floated={false}
                        shadow={false}
                        className="rounded-t-lg bg-gradient-to-br from-green-500 to-green-700 p-4"
                      >
                        <div className="flex items-center justify-between text-white">
                          <div className="flex items-center gap-3">
                            <DebtIcon className="h-8 w-8" />
                            <div>
                              <Typography variant="h6">{debt.name}</Typography>
                              <Typography variant="small" className="opacity-80">
                                {DEBT_TYPES[debt.type].label}
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
                              Monto Original:
                            </Typography>
                            <Typography variant="small" className="font-bold">
                              {formatCurrency(debt.principal)}
                            </Typography>
                          </div>
                          {totalInterestPaid > 0 && (
                            <div className="flex justify-between">
                              <Typography variant="small" color="gray">
                                Intereses Pagados:
                              </Typography>
                              <Typography variant="small" color="red">
                                {formatCurrency(totalInterestPaid)}
                              </Typography>
                            </div>
                          )}
                          {debt.paidOffDate && (
                            <div className="flex justify-between">
                              <Typography variant="small" color="gray">
                                Liquidada:
                              </Typography>
                              <Typography variant="small">
                                {formatDate(debt.paidOffDate.split("T")[0])}
                              </Typography>
                            </div>
                          )}
                          {debt.paymentHistory && (
                            <div className="flex justify-between">
                              <Typography variant="small" color="gray">
                                Total de Pagos:
                              </Typography>
                              <Typography variant="small">{debt.paymentHistory.length}</Typography>
                            </div>
                          )}
                          <Button size="sm" color="red" fullWidth onClick={() => handleDeleteDebt(debt.id)}>
                            Eliminar
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardBody className="text-center py-12">
                  <CheckCircleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <Typography variant="h5" color="gray">
                    No tienes deudas pagadas registradas
                  </Typography>
                </CardBody>
              </Card>
            )}
          </TabPanel>
        </TabsBody>
      </Tabs>

      {/* Dialog para crear/editar deuda */}
      <Dialog open={openDialog} handler={handleCloseDialog} size="lg">
        <DialogHeader>{editingDebt ? "Editar Deuda" : "Nueva Deuda"}</DialogHeader>
        <DialogBody divider className="h-[70vh] overflow-y-auto">
          <div className="space-y-4">
            {/* Nombre */}
            <div>
              <Typography variant="small" className="mb-2 font-semibold">
                Nombre de la Deuda *
              </Typography>
              <Input
                label="Ej: Tarjeta Visa, Préstamo Personal"
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
                label="Detalles adicionales (opcional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Tipo de deuda */}
            <div>
              <Typography variant="small" className="mb-2 font-semibold">
                Tipo de Deuda
              </Typography>
              <Select
                label="Selecciona el tipo"
                value={formData.type}
                onChange={(value) => setFormData({ ...formData, type: value })}
              >
                {Object.entries(DEBT_TYPES).map(([key, { label, icon: Icon }]) => (
                  <Option key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      {label}
                    </div>
                  </Option>
                ))}
              </Select>
            </div>

            {/* Información del acreedor */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Typography variant="small" className="mb-2 font-semibold">
                  Acreedor/Banco
                </Typography>
                <Input
                  label="Nombre de la institución"
                  value={formData.creditor}
                  onChange={(e) => setFormData({ ...formData, creditor: e.target.value })}
                />
              </div>
              <div>
                <Typography variant="small" className="mb-2 font-semibold">
                  Número de Cuenta
                </Typography>
                <Input
                  label="Últimos 4 dígitos"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                />
              </div>
            </div>

            {/* Montos */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Typography variant="small" className="mb-2 font-semibold">
                  Monto Original *
                </Typography>
                <Input
                  type="number"
                  label="$0.00"
                  value={formData.principal}
                  onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
                />
              </div>
              <div>
                <Typography variant="small" className="mb-2 font-semibold">
                  Saldo Actual *
                </Typography>
                <Input
                  type="number"
                  label="$0.00"
                  value={formData.currentBalance}
                  onChange={(e) => setFormData({ ...formData, currentBalance: e.target.value })}
                />
              </div>
            </div>

            {/* Tasa de interés */}
            <div>
              <Typography variant="small" className="mb-2 font-semibold">
                Tasa de Interés Anual (%)
              </Typography>
              <Input
                type="number"
                step="0.01"
                label="Ej: 18.5"
                value={formData.interestRate}
                onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
              />
            </div>

            {/* Pagos */}
            <div className="border-t pt-4">
              <Typography variant="small" className="mb-3 font-semibold">
                Configuración de Pagos
              </Typography>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Typography variant="small" className="mb-2">
                      Monto del Pago
                    </Typography>
                    <Input
                      type="number"
                      label="$0.00"
                      value={formData.paymentAmount}
                      onChange={(e) => setFormData({ ...formData, paymentAmount: e.target.value })}
                    />
                  </div>
                  <div>
                    <Typography variant="small" className="mb-2">
                      Pago Mínimo
                    </Typography>
                    <Input
                      type="number"
                      label="$0.00 (opcional)"
                      value={formData.minimumPayment}
                      onChange={(e) => setFormData({ ...formData, minimumPayment: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Typography variant="small" className="mb-2">
                    Frecuencia de Pago
                  </Typography>
                  <Select
                    label="¿Cada cuánto pagas?"
                    value={formData.paymentFrequency}
                    onChange={(value) => setFormData({ ...formData, paymentFrequency: value })}
                  >
                    {Object.entries(PAYMENT_FREQUENCIES).map(([key, { label }]) => (
                      <Option key={key} value={key}>
                        {label}
                      </Option>
                    ))}
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Typography variant="small" className="mb-2">
                      Próximo Pago
                    </Typography>
                    <Input
                      type="date"
                      value={formData.nextPaymentDate}
                      onChange={(e) => setFormData({ ...formData, nextPaymentDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Typography variant="small" className="mb-2">
                      Fecha de Inicio
                    </Typography>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Recordatorios automáticos */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Typography variant="small" className="font-semibold">
                    Recordatorios Automáticos
                  </Typography>
                  <Typography variant="small" color="gray">
                    Recibe alertas antes de cada pago
                  </Typography>
                </div>
                <Switch
                  checked={formData.autoReminder}
                  onChange={(e) => setFormData({ ...formData, autoReminder: e.target.checked })}
                />
              </div>

              {formData.autoReminder && (
                <div>
                  <Typography variant="small" className="mb-2">
                    Días de Anticipación
                  </Typography>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    label="Días antes del pago"
                    value={formData.reminderDays}
                    onChange={(e) => setFormData({ ...formData, reminderDays: e.target.value })}
                  />
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
          <Button color="blue" onClick={handleSaveDebt}>
            <CheckCircleIcon className="h-5 w-5 inline mr-1" />
            Guardar Deuda
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Dialog para registrar pago */}
      <Dialog open={openPaymentDialog} handler={handleClosePaymentDialog} size="sm">
        <DialogHeader>Registrar Pago</DialogHeader>
        <DialogBody divider>
          {selectedDebt && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <Typography variant="h6" className="mb-2">
                  {selectedDebt.name}
                </Typography>
                <div className="flex justify-between">
                  <Typography variant="small" color="gray">
                    Saldo Actual:
                  </Typography>
                  <Typography variant="small" className="font-bold">
                    {formatCurrency(selectedDebt.currentBalance)}
                  </Typography>
                </div>
              </div>

              <div>
                <Typography variant="small" className="mb-2 font-semibold">
                  Monto del Pago *
                </Typography>
                <Input
                  type="number"
                  label="$0.00"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                />
                {selectedDebt.minimumPayment && (
                  <Typography variant="small" color="gray" className="mt-1">
                    Pago mínimo: {formatCurrency(selectedDebt.minimumPayment)}
                  </Typography>
                )}
              </div>

              <div>
                <Typography variant="small" className="mb-2 font-semibold">
                  Fecha del Pago
                </Typography>
                <Input
                  type="date"
                  value={paymentData.date}
                  onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                />
              </div>

              <div>
                <Typography variant="small" className="mb-2 font-semibold">
                  Descripción
                </Typography>
                <Input
                  label="Notas adicionales (opcional)"
                  value={paymentData.description}
                  onChange={(e) => setPaymentData({ ...paymentData, description: e.target.value })}
                />
              </div>

              {parseFloat(paymentData.amount) > 0 && (
                <Alert color="blue" className="mt-4">
                  <Typography variant="small">
                    Nuevo saldo:{" "}
                    {formatCurrency(
                      Math.max(0, parseFloat(selectedDebt.currentBalance) - parseFloat(paymentData.amount))
                    )}
                  </Typography>
                </Alert>
              )}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="text" color="red" onClick={handleClosePaymentDialog} className="mr-2">
            Cancelar
          </Button>
          <Button color="green" onClick={handleRegisterPayment}>
            <BanknotesIcon className="h-5 w-5 inline mr-1" />
            Registrar Pago
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
