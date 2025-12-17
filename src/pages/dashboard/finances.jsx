import { StatisticsCard } from "@/widgets/cards";
import {
  ArrowDownCircleIcon,
  ArrowUpCircleIcon,
  CalendarIcon,
  DocumentArrowUpIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import {
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
  Typography
} from "@material-tailwind/react";
import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { mapTransactionToBackend, mapTransactionFromBackend } from "@/services/dataMapper";
import { useAuth } from "@/context/AuthContext";

export function Finances() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // New filters and pagination state
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    type: "expense",
    amount: "",
    category: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  // Cargar transacciones y categorías desde API
  useEffect(() => {
    if (isAuthenticated) {
      loadTransactions();
      loadCategories();
    }
  }, [isAuthenticated]);

  const loadCategories = async () => {
    try {
      const response = await api.getCategories();
      if (response.success) {
        setCategories(response.data || []);
      }
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  };

  // Obtener categorías filtradas por tipo
  const getCategoriesByType = (type) => {
    return categories
      .filter((cat) => cat.type === type)
      .map((cat) => cat.name);
  };

  // Obtener todas las categorías (para filtros)
  const getAllCategoryNames = () => {
    return categories.map((cat) => cat.name);
  };

  const loadTransactions = async () => {
    setLoading(true);
    setError("");
    try {
      const filters = {};
      if (filterType !== "all") filters.type = filterType;
      if (dateFrom) filters.start_date = dateFrom;
      if (dateTo) filters.end_date = dateTo;

      const response = await api.getTransactions(filters);
      if (response.success) {
        const mapped = response.data.map(mapTransactionFromBackend);
        setTransactions(mapped);
      }
    } catch (err) {
      setError(err.message || "Error loading transactions");
      console.error("Error loading transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calcular estadísticas
  const calculateStats = () => {
    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const totalExpense = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const balance = totalIncome - totalExpense;

    return { totalIncome, totalExpense, balance };
  };

  const stats = calculateStats();

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.amount || !formData.category) {
      alert("Por favor completa todos los campos requeridos");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const backendData = await mapTransactionToBackend(api, formData);

      if (editingTransaction) {
        const response = await api.updateTransaction(editingTransaction.id, backendData);
        if (response.success) {
          const updated = mapTransactionFromBackend(response.data);
          setTransactions(transactions.map((t) =>
            t.id === editingTransaction.id ? updated : t
          ));
          setEditingTransaction(null);
        }
      } else {
        const response = await api.createTransaction(backendData);
        if (response.success) {
          const newTransaction = mapTransactionFromBackend(response.data);
          setTransactions([newTransaction, ...transactions]);
        }
      }

      resetForm();
      setOpenDialog(false);
      // Recargar categorías por si se creó una nueva
      loadCategories();
    } catch (err) {
      setError(err.message || "Error saving transaction");
      alert(err.message || "Error saving transaction");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: "expense",
      amount: "",
      category: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
    });
  };

  // Manejar importación de CSV
  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target.result;
        const lines = content.split("\n");
        const headers = lines[0].toLowerCase().split(",").map(h => h.trim());

        const importedTransactions = [];

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;

          const values = lines[i].split(",").map(v => v.trim());
          const transaction = {};

          headers.forEach((header, index) => {
            transaction[header] = values[index];
          });

          // Mapear y validar datos
          const newTransaction = {
            id: Date.now() + i,
            type: transaction.type || transaction.tipo || "expense",
            amount: parseFloat(transaction.amount || transaction.monto || transaction.cantidad || 0),
            category: transaction.category || transaction.categoria || "Otros Gastos",
            description: transaction.description || transaction.descripcion || transaction.concepto || "",
            date: transaction.date || transaction.fecha || new Date().toISOString().split("T")[0],
            createdAt: new Date().toISOString(),
          };

          if (newTransaction.amount > 0) {
            importedTransactions.push(newTransaction);
          }
        }

        // Import transactions one by one
        setLoading(true);
        let successCount = 0;
        for (const transaction of importedTransactions) {
          try {
            const backendData = await mapTransactionToBackend(api, transaction);
            await api.createTransaction(backendData);
            successCount++;
          } catch (err) {
            console.error("Error importing transaction:", err);
          }
        }
        setLoading(false);
        setOpenImportDialog(false);
        alert(`Se importaron ${successCount} de ${importedTransactions.length} transacciones exitosamente`);
        loadTransactions(); // Reload all transactions
      } catch (error) {
        alert("Error al importar el archivo. Verifica el formato CSV.");
        console.error(error);
        setLoading(false);
      }
    };

    reader.readAsText(file);
  };

  // Filtrar transacciones
  const getFilteredTransactions = () => {
    return transactions.filter((t) => {
      const typeMatch = filterType === "all" || t.type === filterType;
      const categoryMatch = filterCategory === "all" || t.category === filterCategory;
      const term = search.trim().toLowerCase();
      const searchMatch =
        term === "" ||
        (t.description || "").toLowerCase().includes(term) ||
        (t.category || "").toLowerCase().includes(term);
      const d = t.date ? new Date(t.date) : null;
      const fromMatch = !dateFrom || (d && d >= new Date(dateFrom));
      const toMatch = !dateTo || (d && d <= new Date(dateTo));
      const amt = parseFloat(t.amount);
      const minMatch = amountMin === "" || !isFinite(amt) || amt >= parseFloat(amountMin);
      const maxMatch = amountMax === "" || !isFinite(amt) || amt <= parseFloat(amountMax);
      return typeMatch && categoryMatch && searchMatch && fromMatch && toMatch && minMatch && maxMatch;
    });
  };

  const filteredTransactions = getFilteredTransactions();
  // Pagination calculations
  const total = filteredTransactions.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const paginatedTransactions = filteredTransactions.slice(start, end);

  // Reset/clamp page on filters or page size changes
  useEffect(() => {
    setPage(1);
  }, [filterType, filterCategory, search, dateFrom, dateTo, amountMin, amountMax, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Eliminar transacción
  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar esta transacción?")) {
      setLoading(true);
      try {
        await api.deleteTransaction(id);
        setTransactions(transactions.filter((t) => t.id !== id));
      } catch (err) {
        setError(err.message || "Error deleting transaction");
        alert(err.message || "Error deleting transaction");
      } finally {
        setLoading(false);
      }
    }
  };

  // Editar transacción
  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      amount: transaction.amount.toString(),
      category: transaction.category,
      description: transaction.description,
      date: transaction.date,
    });
    setOpenDialog(true);
  };

  // Exportar a CSV
  const handleExport = () => {
    const headers = ["Tipo,Monto,Categoría,Descripción,Fecha"];
    const rows = transactions.map((t) =>
      `${t.type},${t.amount},${t.category},"${t.description}",${t.date}`
    );
    const csv = [headers, ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transacciones_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="mt-12">
      {/* Tarjetas de estadísticas */}
      <div className="mb-12 grid gap-y-10 gap-x-6 md:grid-cols-2 xl:grid-cols-3">
        <StatisticsCard
          title="Total Ingresos"
          value={`$${stats.totalIncome.toLocaleString("es-ES", { minimumFractionDigits: 2 })}`}
          icon={<ArrowUpCircleIcon className="w-6 h-6 text-white" />}
          color="green"
          footer={
            <Typography className="font-normal text-blue-gray-600">
              <strong className="text-green-500">+</strong>&nbsp;Este período
            </Typography>
          }
        />
        <StatisticsCard
          title="Total Gastos"
          value={`$${stats.totalExpense.toLocaleString("es-ES", { minimumFractionDigits: 2 })}`}
          icon={<ArrowDownCircleIcon className="w-6 h-6 text-white" />}
          color="red"
          footer={
            <Typography className="font-normal text-blue-gray-600">
              <strong className="text-red-500">-</strong>&nbsp;Este período
            </Typography>
          }
        />
        <StatisticsCard
          title="Balance"
          value={`$${stats.balance.toLocaleString("es-ES", { minimumFractionDigits: 2 })}`}
          icon={<ArrowUpCircleIcon className="w-6 h-6 text-white" />}
          color={stats.balance >= 0 ? "blue" : "orange"}
          footer={
            <Typography className="font-normal text-blue-gray-600">
              <strong className={stats.balance >= 0 ? "text-blue-500" : "text-orange-500"}>
                {stats.balance >= 0 ? "+" : ""}
              </strong>
              &nbsp;Balance actual
            </Typography>
          }
        />
      </div>

      {/* Acciones principales */}
      <div className="mb-6 flex flex-wrap gap-4">
        <Button
          onClick={() => {
            setEditingTransaction(null);
            resetForm();
            setOpenDialog(true);
          }}
          className="flex items-center gap-2"
          color="blue"
        >
          <PlusIcon className="h-5 w-5" />
          Nueva Transacción
        </Button>
        <Button
          onClick={() => setOpenImportDialog(true)}
          className="flex items-center gap-2"
          color="green"
          variant="outlined"
        >
          <DocumentArrowUpIcon className="h-5 w-5" />
          Importar CSV
        </Button>
        <Button
          onClick={handleExport}
          className="flex items-center gap-2"
          color="gray"
          variant="outlined"
          disabled={transactions.length === 0}
        >
          <DocumentArrowUpIcon className="h-5 w-5" />
          Exportar CSV
        </Button>
      </div>

      {/* Lista de transacciones */}
      <Card className="border border-blue-gray-100 shadow-sm">
        <CardHeader
          floated={false}
          shadow={false}
          color="transparent"
          className="m-0 p-6"
        >
          <div className="mb-6">
            <Typography variant="h6" color="blue-gray" className="mb-1">
              Historial de Transacciones
            </Typography>
            <Typography variant="small" className="font-normal text-blue-gray-500">
              Filtra y explora tus transacciones
            </Typography>
          </div>

          {/* Sección de filtros mejorada */}
          <div className="space-y-4">
            {/* Filtros principales - Primera fila */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <FunnelIcon className="h-4 w-4 text-blue-gray-500" />
                <Typography variant="small" className="font-semibold text-blue-gray-700">
                  Filtros básicos
                </Typography>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="relative">
                  <Select
                    label="Tipo de transacción"
                    value={filterType}
                    onChange={(val) => setFilterType(val)}
                    className="bg-white"
                  >
                    <Option value="all">Todos</Option>
                    <Option value="income">Ingresos</Option>
                    <Option value="expense">Gastos</Option>
                  </Select>
                </div>
                <div className="relative">
                  <Select
                    label="Categoría"
                    value={filterCategory}
                    onChange={(val) => setFilterCategory(val)}
                    className="bg-white"
                  >
                    <Option value="all">Todas las categorías</Option>
                    {getAllCategoryNames().map((catName) => (
                      <Option key={catName} value={catName}>
                        {catName}
                      </Option>
                    ))}
                  </Select>
                </div>
                <div className="relative">
                  <div className="relative">
                    <Input
                      label="Buscar transacción"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Descripción, categoría..."
                      className="bg-white pr-8"
                      icon={<MagnifyingGlassIcon className="h-4 w-4" />}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Filtros avanzados - Segunda fila */}
            <div className="bg-blue-50/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CalendarIcon className="h-4 w-4 text-blue-500" />
                <Typography variant="small" className="font-semibold text-blue-gray-700">
                  Filtros avanzados
                </Typography>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Grupo de fechas */}
                <div className="lg:col-span-2">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="date"
                      label="Fecha desde"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="bg-white"
                    />
                    <Input
                      type="date"
                      label="Fecha hasta"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                </div>

                {/* Grupo de montos */}
                <div className="lg:col-span-2">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="number"
                      step="0.01"
                      label="Monto mínimo"
                      value={amountMin}
                      onChange={(e) => setAmountMin(e.target.value)}
                      placeholder="$0.00"
                      className="bg-white"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      label="Monto máximo"
                      value={amountMax}
                      onChange={(e) => setAmountMax(e.target.value)}
                      placeholder="$0.00"
                      className="bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Controles de paginación y acciones */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <Typography variant="small" className="text-blue-gray-600 font-medium">
                  Mostrar:
                </Typography>
                <Select
                  value={`${pageSize}`}
                  onChange={(val) => setPageSize(parseInt(val || "10", 10))}
                  className="w-24"
                >
                  <Option value="5">5</Option>
                  <Option value="10">10</Option>
                  <Option value="20">20</Option>
                  <Option value="50">50</Option>
                </Select>
                <Typography variant="small" className="text-blue-gray-600">
                  por página
                </Typography>
              </div>

              {(search || dateFrom || dateTo || amountMin || amountMax || filterType !== "all" || filterCategory !== "all") && (
                <Button
                  size="sm"
                  variant="text"
                  className="flex items-center gap-2"
                  onClick={() => {
                    setSearch("");
                    setDateFrom("");
                    setDateTo("");
                    setAmountMin("");
                    setAmountMax("");
                    setFilterType("all");
                    setFilterCategory("all");
                  }}
                >
                  Limpiar filtros
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardBody className="overflow-x-scroll px-0 pt-0 pb-2">
          {filteredTransactions.length === 0 ? (
            <div className="p-6 text-center">
              <Typography color="blue-gray" className="font-normal">
                No hay transacciones registradas. ¡Agrega tu primera transacción!
              </Typography>
            </div>
          ) : (
            <table className="w-full min-w-[640px] table-auto">
              <thead>
                <tr>
                  {["Fecha", "Tipo", "Categoría", "Descripción", "Monto", "Acciones"].map(
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
                {paginatedTransactions.map((transaction) => {
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
                          {transaction.type === "income" ? "+" : "-"}$
                          {transaction.amount.toLocaleString("es-ES", {
                            minimumFractionDigits: 2,
                          })}
                        </Typography>
                      </td>
                      <td className={className}>
                        <div className="flex gap-2">
                          <IconButton
                            variant="text"
                            size="sm"
                            onClick={() => handleEdit(transaction)}
                          >
                            <PencilIcon className="h-4 w-4 text-blue-500" />
                          </IconButton>
                          <IconButton
                            variant="text"
                            size="sm"
                            onClick={() => handleDelete(transaction.id)}
                          >
                            <TrashIcon className="h-4 w-4 text-red-500" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {/* Pagination controls */}
          <div className="flex items-center justify-between px-6 py-4">
            <Typography variant="small" className="text-blue-gray-600">
              {total === 0 ? "Mostrando 0 de 0" : `Mostrando ${start + 1}–${end} de ${total}`}
            </Typography>
            <div className="flex items-center gap-2">
              <Button
                variant="outlined"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Typography variant="small" className="text-blue-gray-600">
                Página {currentPage} de {totalPages}
              </Typography>
              <Button
                variant="outlined"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Dialog para agregar/editar transacción */}
      <Dialog open={openDialog} handler={() => setOpenDialog(false)} size="md">
        <DialogHeader>
          {editingTransaction ? "Editar Transacción" : "Nueva Transacción"}
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody divider className="space-y-4">
            <div>
              <Select
                label="Tipo"
                value={formData.type}
                onChange={(val) => {
                  setFormData({ ...formData, type: val, category: "" });
                }}
              >
                <Option value="expense">Gasto</Option>
                <Option value="income">Ingreso</Option>
              </Select>
            </div>

            <div>
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
            </div>

            <div>
              <Select
                label="Categoría"
                value={formData.category}
                onChange={(val) => setFormData({ ...formData, category: val })}
                required
              >
                {getCategoriesByType(formData.type).length > 0 ? (
                  getCategoriesByType(formData.type).map((catName) => (
                    <Option key={catName} value={catName}>
                      {catName}
                    </Option>
                  ))
                ) : (
                  <Option value="" disabled>
                    No hay categorías de {formData.type === "income" ? "ingresos" : "gastos"}. Crea una en la sección de Categorías.
                  </Option>
                )}
              </Select>
            </div>

            <div>
              <Input
                type="text"
                label="Descripción (opcional)"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div>
              <Input
                type="date"
                label="Fecha"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />
            </div>
          </DialogBody>
          <DialogFooter className="space-x-2">
            <Button
              variant="outlined"
              color="red"
              onClick={() => {
                setOpenDialog(false);
                setEditingTransaction(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" color="green">
              {editingTransaction ? "Actualizar" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Dialog para importar CSV */}
      <Dialog
        open={openImportDialog}
        handler={() => setOpenImportDialog(false)}
        size="md"
      >
        <DialogHeader>Importar Transacciones desde CSV</DialogHeader>
        <DialogBody divider>
          <div className="space-y-4">
            <Typography variant="small" color="blue-gray">
              El archivo CSV debe contener las siguientes columnas:
            </Typography>
            <ul className="list-disc list-inside text-sm text-blue-gray-600 space-y-1">
              <li>
                <strong>type o tipo:</strong> "income" o "expense"
              </li>
              <li>
                <strong>amount, monto o cantidad:</strong> valor numérico
              </li>
              <li>
                <strong>category o categoria:</strong> nombre de la categoría
              </li>
              <li>
                <strong>description, descripcion o concepto:</strong> (opcional)
              </li>
              <li>
                <strong>date o fecha:</strong> formato YYYY-MM-DD
              </li>
            </ul>
            <Typography variant="small" color="blue-gray" className="mt-2">
              Ejemplo:
            </Typography>
            <div className="bg-gray-100 p-3 rounded text-xs font-mono">
              type,amount,category,description,date
              <br />
              expense,50.00,Comida,Supermercado,2024-01-15
              <br />
              income,1500.00,Salario,Pago mensual,2024-01-01
            </div>
            <div className="mt-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileImport}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outlined"
            color="red"
            onClick={() => setOpenImportDialog(false)}
          >
            Cerrar
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

export default Finances;
