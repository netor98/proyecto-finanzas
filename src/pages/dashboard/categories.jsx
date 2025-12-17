import {
  PencilIcon,
  PlusIcon,
  TrashIcon,
  TagIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
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
  Typography,
  Alert,
} from "@material-tailwind/react";
import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

export function Categories() {
  const [categories, setCategories] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const { isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    type: "expense",
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadCategories();
    }
  }, [isAuthenticated, filterType, search]);

  const loadCategories = async () => {
    setLoading(true);
    setError("");
    try {
      const filters = {};
      if (filterType !== "all") {
        filters.type = filterType;
      }
      const response = await api.getCategories();
      if (response.success) {
        let filtered = response.data;
        if (filterType !== "all") {
          filtered = filtered.filter((cat) => cat.type === filterType);
        }
        if (search) {
          filtered = filtered.filter((cat) =>
            cat.name.toLowerCase().includes(search.toLowerCase())
          );
        }
        setCategories(filtered);
      }
    } catch (err) {
      setError(err.message || "Error loading categories");
      console.error("Error loading categories:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        type: category.type,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: "",
        type: "expense",
      });
    }
    setOpenDialog(true);
    setError("");
    setSuccess("");
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCategory(null);
    setFormData({
      name: "",
      type: "expense",
    });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError("El nombre de la categoría es requerido");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (editingCategory) {
        const response = await api.updateCategory(editingCategory.id, formData);
        if (response.success) {
          setSuccess("Categoría actualizada exitosamente");
          loadCategories();
          setTimeout(() => {
            handleCloseDialog();
          }, 1000);
        }
      } else {
        const response = await api.createCategory(formData);
        if (response.success) {
          setSuccess("Categoría creada exitosamente");
          loadCategories();
          setTimeout(() => {
            handleCloseDialog();
          }, 1000);
        }
      }
    } catch (err) {
      setError(err.message || "Error saving category");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar esta categoría?")) {
      setLoading(true);
      try {
        await api.deleteCategory(id);
        setSuccess("Categoría eliminada exitosamente");
        loadCategories();
      } catch (err) {
        setError(err.message || "Error deleting category");
        alert(err.message || "Error deleting category");
      } finally {
        setLoading(false);
      }
    }
  };

  const incomeCategories = categories.filter((c) => c.type === "income");
  const expenseCategories = categories.filter((c) => c.type === "expense");

  return (
    <div className="mt-12">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Typography variant="h4" color="blue-gray" className="mb-1">
            Categorías
          </Typography>
          <Typography variant="small" className="font-normal text-blue-gray-500">
            Administra tus categorías de ingresos y gastos
          </Typography>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="flex items-center gap-2"
          color="blue"
        >
          <PlusIcon className="h-5 w-5" />
          Nueva Categoría
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert color="red" className="mb-4" onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert color="green" className="mb-4" onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {/* Filters */}
      <Card className="mb-6 border border-blue-gray-100 shadow-sm">
        <CardHeader
          floated={false}
          shadow={false}
          color="transparent"
          className="m-0 p-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <FunnelIcon className="h-4 w-4 text-blue-gray-500" />
            <Typography variant="small" className="font-semibold text-blue-gray-700">
              Filtros
            </Typography>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label="Tipo de categoría"
              value={filterType}
              onChange={(val) => setFilterType(val)}
              className="bg-white"
            >
              <Option value="all">Todas</Option>
              <Option value="income">Ingresos</Option>
              <Option value="expense">Gastos</Option>
            </Select>
            <div className="relative">
              <Input
                label="Buscar categoría"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nombre de categoría..."
                className="bg-white pr-8"
                icon={<MagnifyingGlassIcon className="h-4 w-4" />}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Categories List */}
      {filterType === "all" ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Income Categories */}
          <Card className="border border-blue-gray-100 shadow-sm">
            <CardHeader
              floated={false}
              shadow={false}
              color="transparent"
              className="m-0 p-6 bg-gradient-to-r from-green-50 to-green-100"
            >
              <div className="flex items-center gap-3">
                <TagIcon className="h-6 w-6 text-green-600" />
                <div>
                  <Typography variant="h6" color="blue-gray">
                    Categorías de Ingresos
                  </Typography>
                  <Typography variant="small" className="font-normal text-blue-gray-500">
                    {incomeCategories.length} categoría(s)
                  </Typography>
                </div>
              </div>
            </CardHeader>
            <CardBody className="px-0 pt-0 pb-2">
              {incomeCategories.length === 0 ? (
                <div className="p-6 text-center">
                  <Typography color="blue-gray" className="font-normal">
                    No hay categorías de ingresos
                  </Typography>
                </div>
              ) : (
                <div className="space-y-2 px-6">
                  {incomeCategories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-green-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Chip
                          value={category.name}
                          color="green"
                          className="font-medium"
                        />
                      </div>
                      <div className="flex gap-2">
                        <IconButton
                          variant="text"
                          size="sm"
                          onClick={() => handleOpenDialog(category)}
                        >
                          <PencilIcon className="h-4 w-4 text-blue-500" />
                        </IconButton>
                        <IconButton
                          variant="text"
                          size="sm"
                          onClick={() => handleDelete(category.id)}
                        >
                          <TrashIcon className="h-4 w-4 text-red-500" />
                        </IconButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Expense Categories */}
          <Card className="border border-blue-gray-100 shadow-sm">
            <CardHeader
              floated={false}
              shadow={false}
              color="transparent"
              className="m-0 p-6 bg-gradient-to-r from-red-50 to-red-100"
            >
              <div className="flex items-center gap-3">
                <TagIcon className="h-6 w-6 text-red-600" />
                <div>
                  <Typography variant="h6" color="blue-gray">
                    Categorías de Gastos
                  </Typography>
                  <Typography variant="small" className="font-normal text-blue-gray-500">
                    {expenseCategories.length} categoría(s)
                  </Typography>
                </div>
              </div>
            </CardHeader>
            <CardBody className="px-0 pt-0 pb-2">
              {expenseCategories.length === 0 ? (
                <div className="p-6 text-center">
                  <Typography color="blue-gray" className="font-normal">
                    No hay categorías de gastos
                  </Typography>
                </div>
              ) : (
                <div className="space-y-2 px-6">
                  {expenseCategories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Chip
                          value={category.name}
                          color="red"
                          className="font-medium"
                        />
                      </div>
                      <div className="flex gap-2">
                        <IconButton
                          variant="text"
                          size="sm"
                          onClick={() => handleOpenDialog(category)}
                        >
                          <PencilIcon className="h-4 w-4 text-blue-500" />
                        </IconButton>
                        <IconButton
                          variant="text"
                          size="sm"
                          onClick={() => handleDelete(category.id)}
                        >
                          <TrashIcon className="h-4 w-4 text-red-500" />
                        </IconButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      ) : (
        <Card className="border border-blue-gray-100 shadow-sm">
          <CardHeader
            floated={false}
            shadow={false}
            color="transparent"
            className="m-0 p-6"
          >
            <Typography variant="h6" color="blue-gray" className="mb-1">
              {filterType === "income" ? "Categorías de Ingresos" : "Categorías de Gastos"}
            </Typography>
            <Typography variant="small" className="font-normal text-blue-gray-500">
              {categories.length} categoría(s)
            </Typography>
          </CardHeader>
          <CardBody className="px-0 pt-0 pb-2">
            {categories.length === 0 ? (
              <div className="p-6 text-center">
                <Typography color="blue-gray" className="font-normal">
                  No hay categorías
                </Typography>
              </div>
            ) : (
              <table className="w-full min-w-[640px] table-auto">
                <thead>
                  <tr>
                    {["Nombre", "Tipo", "Acciones"].map((el) => (
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
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => {
                    const className = "py-3 px-5 border-b border-blue-gray-50";
                    return (
                      <tr key={category.id}>
                        <td className={className}>
                          <Typography className="text-xs font-semibold text-blue-gray-600">
                            {category.name}
                          </Typography>
                        </td>
                        <td className={className}>
                          <Chip
                            variant="gradient"
                            color={category.type === "income" ? "green" : "red"}
                            value={category.type === "income" ? "Ingreso" : "Gasto"}
                            className="py-0.5 px-2 text-[11px] font-medium w-fit"
                          />
                        </td>
                        <td className={className}>
                          <div className="flex gap-2">
                            <IconButton
                              variant="text"
                              size="sm"
                              onClick={() => handleOpenDialog(category)}
                            >
                              <PencilIcon className="h-4 w-4 text-blue-500" />
                            </IconButton>
                            <IconButton
                              variant="text"
                              size="sm"
                              onClick={() => handleDelete(category.id)}
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
          </CardBody>
        </Card>
      )}

      {/* Dialog para crear/editar categoría */}
      <Dialog open={openDialog} handler={handleCloseDialog} size="md">
        <DialogHeader>
          {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody divider className="space-y-4">
            {error && (
              <Alert color="red">
                {error}
              </Alert>
            )}
            {success && (
              <Alert color="green">
                {success}
              </Alert>
            )}
            <div>
              <Input
                label="Nombre de la categoría"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div>
              <Select
                label="Tipo"
                value={formData.type}
                onChange={(val) => setFormData({ ...formData, type: val })}
                disabled={!!editingCategory}
              >
                <Option value="expense">Gasto</Option>
                <Option value="income">Ingreso</Option>
              </Select>
              {editingCategory && (
                <Typography variant="small" className="text-blue-gray-500 mt-1">
                  No puedes cambiar el tipo de categoría al editar
                </Typography>
              )}
            </div>
          </DialogBody>
          <DialogFooter className="space-x-2">
            <Button
              variant="outlined"
              color="red"
              onClick={handleCloseDialog}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" color="green" disabled={loading}>
              {loading ? "Guardando..." : editingCategory ? "Actualizar" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}

export default Categories;

