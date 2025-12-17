// Helper functions to map between frontend and backend data structures

/**
 * Get or create a category by name
 * This is a helper to bridge the gap between frontend (category names) and backend (category IDs)
 */
export async function getOrCreateCategory(api, categoryName, type) {
  try {
    // First, try to get existing categories
    const response = await api.getCategories();
    if (response.success && response.data) {
      const existing = response.data.find(
        (cat) => cat.name === categoryName && cat.type === type
      );
      if (existing) {
        return existing.id;
      }
    }

    // If not found, create it
    const createResponse = await api.createCategory({
      name: categoryName,
      type: type,
    });

    if (createResponse.success) {
      return createResponse.data.id;
    }
  } catch (error) {
    console.error('Error getting/creating category:', error);
    throw error;
  }
}

/**
 * Get the first/default account for the user
 */
export async function getDefaultAccount(api) {
  try {
    const response = await api.getAccounts();
    if (response.success && response.data && response.data.length > 0) {
      return response.data[0].id;
    }
    // If no account exists, create a default one
    const createResponse = await api.createAccount({
      name: 'Cuenta Principal',
      account_type_id: 1, // 1 = Banco
      current_balance: 0,
    });
    if (createResponse.success) {
      return createResponse.data.id;
    }
  } catch (error) {
    console.error('Error getting default account:', error);
    throw error;
  }
}

/**
 * Map frontend transaction to backend format
 */
export async function mapTransactionToBackend(api, frontendTransaction) {
  const accountId = await getDefaultAccount(api);
  const categoryId = await getOrCreateCategory(
    api,
    frontendTransaction.category,
    frontendTransaction.type
  );

  return {
    account_id: accountId,
    category_id: categoryId,
    amount: parseFloat(frontendTransaction.amount),
    date: frontendTransaction.date,
    description: frontendTransaction.description || null,
    type: frontendTransaction.type,
    is_recurring: frontendTransaction.is_recurring || false,
  };
}

/**
 * Map backend transaction to frontend format
 */
export function mapTransactionFromBackend(backendTransaction) {
  return {
    id: backendTransaction.id,
    type: backendTransaction.type,
    amount: parseFloat(backendTransaction.amount),
    category: backendTransaction.category?.name || 'Unknown',
    description: backendTransaction.description || '',
    date: backendTransaction.date,
    createdAt: backendTransaction.created_at,
    account_id: backendTransaction.account_id,
    category_id: backendTransaction.category_id,
  };
}

/**
 * Map frontend goal to backend format
 */
export function mapGoalToBackend(frontendGoal) {
  return {
    name: frontendGoal.name,
    target_amount: parseFloat(frontendGoal.targetAmount || frontendGoal.target_amount),
    current_amount: parseFloat(frontendGoal.currentAmount || frontendGoal.current_amount || 0),
    deadline: frontendGoal.deadline || null,
    status: frontendGoal.active === false ? 'completed' : (frontendGoal.status || 'active'),
  };
}

/**
 * Map backend goal to frontend format
 */
export function mapGoalFromBackend(backendGoal) {
  return {
    id: backendGoal.id,
    name: backendGoal.name,
    targetAmount: parseFloat(backendGoal.target_amount),
    currentAmount: parseFloat(backendGoal.current_amount || 0),
    deadline: backendGoal.deadline,
    active: backendGoal.status === 'active',
    status: backendGoal.status,
    createdAt: backendGoal.created_at,
    updatedAt: backendGoal.updated_at,
    // Map additional frontend fields
    category: backendGoal.category || 'other',
    description: backendGoal.description || '',
    autoSaveEnabled: false,
    autoSaveAmount: '',
    autoSaveFrequency: 'monthly',
    autoSaveDay: '1',
  };
}

/**
 * Map frontend budget to backend format
 */
export function mapBudgetToBackend(frontendBudget) {
  // Backend expects: category_id, amount_limit, period (monthly/weekly)
  // Frontend has: category (name), limit, month
  return {
    category_id: frontendBudget.category_id, // Will need to be resolved
    amount_limit: parseFloat(frontendBudget.limit),
    period: 'monthly', // Default to monthly
    start_date: frontendBudget.month ? `${frontendBudget.month}-01` : null,
  };
}

/**
 * Map backend budget to frontend format
 */
export function mapBudgetFromBackend(backendBudget) {
  return {
    id: backendBudget.id,
    category: backendBudget.category?.name || 'Unknown',
    category_id: backendBudget.category_id,
    limit: parseFloat(backendBudget.amount_limit),
    month: backendBudget.start_date ? backendBudget.start_date.slice(0, 7) : new Date().toISOString().slice(0, 7),
    createdAt: backendBudget.created_at,
  };
}

/**
 * Map frontend debt to backend format
 */
export function mapDebtToBackend(frontendDebt) {
  return {
    name: frontendDebt.name,
    description: frontendDebt.description || null,
    total_amount: parseFloat(frontendDebt.principal),
    current_balance: parseFloat(frontendDebt.currentBalance || frontendDebt.current_balance),
    interest_rate: parseFloat(frontendDebt.interestRate || frontendDebt.interest_rate || 0),
    minimum_payment: parseFloat(frontendDebt.minimumPayment || frontendDebt.minimum_payment || 0),
    payment_amount: parseFloat(frontendDebt.paymentAmount || frontendDebt.payment_amount || 0),
    payment_frequency: frontendDebt.paymentFrequency || frontendDebt.payment_frequency || 'monthly',
    next_payment_date: frontendDebt.nextPaymentDate || frontendDebt.next_payment_date || null,
    start_date: frontendDebt.startDate || frontendDebt.start_date || null,
    creditor: frontendDebt.creditor || null,
    account_number: frontendDebt.accountNumber || frontendDebt.account_number || null,
  };
}

/**
 * Map backend debt to frontend format
 */
export function mapDebtFromBackend(backendDebt) {
  return {
    id: backendDebt.id,
    name: backendDebt.name,
    description: backendDebt.description || '',
    type: backendDebt.type || 'other',
    principal: parseFloat(backendDebt.total_amount),
    currentBalance: parseFloat(backendDebt.current_balance),
    interestRate: parseFloat(backendDebt.interest_rate || 0),
    paymentAmount: parseFloat(backendDebt.payment_amount || 0),
    paymentFrequency: backendDebt.payment_frequency || 'monthly',
    nextPaymentDate: backendDebt.next_payment_date,
    minimumPayment: parseFloat(backendDebt.minimum_payment || 0),
    creditor: backendDebt.creditor || '',
    accountNumber: backendDebt.account_number || '',
    startDate: backendDebt.start_date,
    active: backendDebt.status === 'active' || parseFloat(backendDebt.current_balance) > 0,
    autoReminder: true,
    reminderDays: '3',
    createdAt: backendDebt.created_at,
    updatedAt: backendDebt.updated_at,
  };
}

