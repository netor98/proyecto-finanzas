const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      credentials: 'include', // Important for cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth endpoints
  async register(userData) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(emailOrUsername, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrUsername, password }),
    });
  }

  async logout() {
    return this.request('/api/auth/logout', {
      method: 'POST',
    });
  }

  async verifyToken() {
    return this.request('/api/auth/verify');
  }

  // Transaction endpoints
  async getTransactions(filters = {}) {
    const queryParams = new URLSearchParams(
      Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== null && v !== undefined && v !== '')
      )
    );
    const query = queryParams.toString();
    return this.request(`/api/transactions${query ? `?${query}` : ''}`);
  }

  async getTransactionById(id) {
    return this.request(`/api/transactions/${id}`);
  }

  async createTransaction(transactionData) {
    return this.request('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
  }

  async updateTransaction(id, transactionData) {
    return this.request(`/api/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transactionData),
    });
  }

  async deleteTransaction(id) {
    return this.request(`/api/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  async getTransactionsSummary() {
    return this.request('/api/transactions/summary');
  }

  async getTransactionsByCategory() {
    return this.request('/api/transactions/by-category');
  }

  async getMonthlyReport(year, month) {
    return this.request(`/api/transactions/report/${year}/${month}`);
  }

  // Goal endpoints
  async getGoals() {
    return this.request('/api/goals');
  }

  async getGoalById(id) {
    return this.request(`/api/goals/${id}`);
  }

  async createGoal(goalData) {
    return this.request('/api/goals', {
      method: 'POST',
      body: JSON.stringify(goalData),
    });
  }

  async updateGoal(id, goalData) {
    return this.request(`/api/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(goalData),
    });
  }

  async deleteGoal(id) {
    return this.request(`/api/goals/${id}`, {
      method: 'DELETE',
    });
  }

  async getGoalsSummary() {
    return this.request('/api/goals/summary');
  }

  async addFundsToGoal(id, amount) {
    return this.request(`/api/goals/${id}/add-funds`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async withdrawFundsFromGoal(id, amount) {
    return this.request(`/api/goals/${id}/withdraw-funds`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  // Budget endpoints
  async getBudgets() {
    return this.request('/api/budgets');
  }

  async getBudgetById(id) {
    return this.request(`/api/budgets/${id}`);
  }

  async createBudget(budgetData) {
    return this.request('/api/budgets', {
      method: 'POST',
      body: JSON.stringify(budgetData),
    });
  }

  async updateBudget(id, budgetData) {
    return this.request(`/api/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(budgetData),
    });
  }

  async deleteBudget(id) {
    return this.request(`/api/budgets/${id}`, {
      method: 'DELETE',
    });
  }

  async getBudgetsSummary() {
    return this.request('/api/budgets/summary');
  }

  // Debt endpoints
  async getDebts() {
    return this.request('/api/debts');
  }

  async getDebtById(id) {
    return this.request(`/api/debts/${id}`);
  }

  async createDebt(debtData) {
    return this.request('/api/debts', {
      method: 'POST',
      body: JSON.stringify(debtData),
    });
  }

  async updateDebt(id, debtData) {
    return this.request(`/api/debts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(debtData),
    });
  }

  async deleteDebt(id) {
    return this.request(`/api/debts/${id}`, {
      method: 'DELETE',
    });
  }

  async getDebtsSummary() {
    return this.request('/api/debts/summary');
  }

  async makeDebtPayment(id, paymentData) {
    return this.request(`/api/debts/${id}/payment`, {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  // Account endpoints
  async getAccounts() {
    return this.request('/api/accounts');
  }

  async getAccountById(id) {
    return this.request(`/api/accounts/${id}`);
  }

  async createAccount(accountData) {
    return this.request('/api/accounts', {
      method: 'POST',
      body: JSON.stringify(accountData),
    });
  }

  async updateAccount(id, accountData) {
    return this.request(`/api/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(accountData),
    });
  }

  async deleteAccount(id) {
    return this.request(`/api/accounts/${id}`, {
      method: 'DELETE',
    });
  }

  async getTotalBalance() {
    return this.request('/api/accounts/balance');
  }

  // Category endpoints
  async getCategories() {
    return this.request('/api/categories');
  }

  async getCategoryById(id) {
    return this.request(`/api/categories/${id}`);
  }

  async createCategory(categoryData) {
    return this.request('/api/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  }

  async updateCategory(id, categoryData) {
    return this.request(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });
  }

  async deleteCategory(id) {
    return this.request(`/api/categories/${id}`, {
      method: 'DELETE',
    });
  }

  async getCategoriesStats() {
    return this.request('/api/categories/stats');
  }
}

export const api = new ApiService();

