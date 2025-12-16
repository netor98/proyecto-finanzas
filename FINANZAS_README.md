# Sistema de Gestión de Finanzas Personales

## 📊 Funcionalidades Implementadas

### 1. Registro de Ingresos y Gastos

#### ✅ Captura Manual
- **Formulario intuitivo** para registrar transacciones
- Campos disponibles:
  - Tipo (Ingreso/Gasto)
  - Monto
  - Categoría
  - Descripción (opcional)
  - Fecha
- **Validación de datos** antes de guardar
- **Edición y eliminación** de transacciones existentes

#### ✅ Importación Automática desde CSV
- Soporte para importar múltiples transacciones desde archivos CSV
- **Mapeo inteligente** de columnas:
  - `type` o `tipo` → Tipo de transacción
  - `amount`, `monto` o `cantidad` → Monto
  - `category` o `categoria` → Categoría
  - `description`, `descripcion` o `concepto` → Descripción
  - `date` o `fecha` → Fecha
- **Validación automática** de datos importados
- Archivo de ejemplo incluido: `ejemplo_transacciones.csv`

#### ✅ Clasificación por Categorías

**Categorías de Ingresos:**
- Salario
- Freelance
- Inversiones
- Bonos
- Ventas
- Otros Ingresos

**Categorías de Gastos:**
- Comida
- Transporte
- Servicios
- Entretenimiento
- Salud
- Educación
- Hogar
- Ropa
- Tecnología
- Otros Gastos

## 🚀 Cómo Usar

### Acceder al Módulo de Finanzas
1. Inicia la aplicación con `npm run dev` o `bun run dev`
2. En el menú lateral, haz clic en **"Finanzas"** (ícono de moneda)

### Agregar una Transacción Manual
1. Haz clic en el botón **"Nueva Transacción"**
2. Selecciona el tipo (Ingreso o Gasto)
3. Ingresa el monto
4. Selecciona una categoría
5. Agrega una descripción (opcional)
6. Selecciona la fecha
7. Haz clic en **"Guardar"**

### Importar Transacciones desde CSV
1. Haz clic en **"Importar CSV"**
2. Lee las instrucciones del formato
3. Selecciona tu archivo CSV
4. Las transacciones se importarán automáticamente

### Exportar Transacciones
1. Haz clic en **"Exportar CSV"**
2. Se descargará un archivo con todas tus transacciones

### Filtrar Transacciones
- Usa el selector **"Tipo"** para filtrar por Ingresos/Gastos
- Usa el selector **"Categoría"** para filtrar por categoría específica

### Editar o Eliminar
- Haz clic en el ícono de lápiz para editar
- Haz clic en el ícono de papelera para eliminar

## 📈 Estadísticas Disponibles

El dashboard muestra automáticamente:
- **Total de Ingresos**: Suma de todos los ingresos
- **Total de Gastos**: Suma de todos los gastos
- **Balance**: Diferencia entre ingresos y gastos

## 💾 Almacenamiento

Los datos se guardan automáticamente en el **localStorage** del navegador, por lo que persisten entre sesiones.

## 🔄 Formato CSV para Importación

```csv
type,amount,category,description,date
expense,50.00,Comida,Supermercado,2024-12-15
income,2000.00,Salario,Pago mensual,2024-12-01
```

## 🎨 Características Adicionales

- ✅ Interfaz moderna y responsive
- ✅ Diseño intuitivo con Material Tailwind
- ✅ Colores diferenciados para ingresos (verde) y gastos (rojo)
- ✅ Confirmación antes de eliminar
- ✅ Ordenamiento cronológico de transacciones
- ✅ Formato de moneda localizado (español)

## 🛠️ Próximas Mejoras Sugeridas

- [ ] Integración con APIs bancarias
- [ ] Gráficos y reportes visuales
- [ ] Presupuestos por categoría
- [ ] Alertas y notificaciones
- [ ] Exportación a Excel
- [ ] Filtros por rango de fechas
- [ ] Búsqueda de transacciones
- [ ] Categorías personalizadas
