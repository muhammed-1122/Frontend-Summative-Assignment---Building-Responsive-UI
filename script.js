

document.addEventListener('DOMContentLoaded', () => {
    // ... (Section 1: Initial State and Constants remains the same)
    const STORAGE_KEY = 'penniwiseData';
    const DEFAULT_CATEGORIES = ['Food', 'Books', 'Transport', 'Entertainment', 'Fees', 'Other'];

    let state = {
        transactions: [],
        categories: [...DEFAULT_CATEGORIES],
        monthlyBudget: 0,
        settings: {
            baseCurrency: 'USD',
            currency1: 'EUR',
            currency2: 'GBP'
        },
        currentSort: {
            column: 'date',
            direction: 'desc'
        }
    };

    function loadState() {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            const loadedState = JSON.parse(storedData);
            state.transactions = loadedState.transactions || [];
            state.categories = loadedState.categories || [...DEFAULT_CATEGORIES];
            state.monthlyBudget = loadedState.monthlyBudget || 0;
            state.settings = loadedState.settings || state.settings;
        }
    }

    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    // ... (Section 2: DOM Elements and Utility Functions remains the same)
    const pages = document.querySelectorAll('.page-content');
    const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const transactionForm = document.getElementById('transaction-form');
    const recordsTableBody = document.getElementById('records-table-body');
    const recordsCardsContainer = document.getElementById('records-cards');
    const emptyState = document.getElementById('empty-state');
    const categoriesFilter = document.getElementById('category-filter');
    const searchInput = document.getElementById('search-input');
    const dateFilter = document.getElementById('date-filter');
    const sortHeaders = document.querySelectorAll('.sort-header');
    const clearSearchBtn = document.getElementById('clear-search');
    const dashboardElements = {
        balance: document.getElementById('total-balance'),
        income: document.getElementById('total-income'),
        expenses: document.getElementById('total-expenses'),
        budgetLeft: document.getElementById('budget-left'),
        budgetPercentage: document.getElementById('budget-percentage'),
        budgetProgress: document.getElementById('budget-progress'),
        budgetSpent: document.getElementById('budget-spent'),
        budgetTotal: document.getElementById('budget-total'),
        weeklyChart: document.getElementById('weekly-chart'),
        categoriesList: document.getElementById('categories-list')
    };
    const settingsElements = {
        categoriesContainer: document.getElementById('categories-container'),
        newCategoryInput: document.getElementById('new-category'),
        addCategoryButton: document.getElementById('add-category'),
        categoryError: document.getElementById('category-settings-error'),
        monthlyBudgetInput: document.getElementById('monthly-budget'),
        saveBudgetButton: document.getElementById('save-budget'),
        budgetError: document.getElementById('budget-error'),
        baseCurrency: document.getElementById('base-currency'),
        currency1: document.getElementById('currency-1'),
        currency2: document.getElementById('currency-2'),
        saveCurrencyButton: document.getElementById('save-currency')
    };
    const modal = document.getElementById('confirmation-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const formatCurrency = (amount) => {
        const symbol = state.settings.baseCurrency === 'USD' ? '$' : state.settings.baseCurrency;
        return `${symbol}${Math.abs(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
    };
    
    const validateDescription = (desc) => {
        return desc.trim() !== '';
    };

    const validateAmount = (amount) => {
        const regex = /^\d+(\.\d{1,2})?$/;
        return regex.test(amount);
    };
    
    const validateDate = (date) => {
        return date !== '';
    };


    // ... (Section 3: Navigation and Routing remains the same)

    function navigateTo(pageId, recordId = null) {
        // ... (function body remains the same)
        pages.forEach(page => page.classList.add('hidden'));
        
        const targetPage = document.getElementById(`${pageId}-page`);
        if (targetPage) {
            targetPage.classList.remove('hidden');
        }

        navLinks.forEach(link => link.classList.remove('active'));
        const activeLinks = document.querySelectorAll(`[data-page="${pageId}"]`);
        activeLinks.forEach(link => link.classList.add('active'));

        mobileMenu.classList.add('hidden');

        switch (pageId) {
            case 'dashboard':
                renderDashboard();
                break;
            case 'records':
                renderRecords();
                break;
            case 'add':
                setupAddEditForm(recordId);
                break;
            case 'settings':
                renderSettings();
                break;
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = e.target.closest('[data-page]').getAttribute('data-page');
            navigateTo(pageId);
        });
    });

    mobileMenuButton.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });

    document.querySelectorAll('[data-page="add"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('add');
        });
    });

    // ----------------------------------------------------
    // 4. Data Processing and Dashboard Rendering (FIXED CHART)
    // ----------------------------------------------------

    function calculateFinancials() {
        const now = new Date();
        // Reset time component for accurate start/end of day/month comparison
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        let totalIncome = 0;
        let totalExpenses = 0;
        const weeklySpending = {}; 
        const categorySpending = {};

        // Initialize weekly spending for the last 7 days (Mon-Sun logic simplified to last 7 dates)
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            weeklySpending[dateKey] = 0;
        }

        state.transactions.forEach(t => {
            const amount = parseFloat(t.amount);
            const transactionDate = new Date(t.date);
            // Fix: Normalize transaction date for startOfMonth check
            const transactionDateStart = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());

            // Monthly Scope Check
            if (transactionDateStart >= startOfMonth && transactionDateStart <= today) {
                 if (t.type === 'income') {
                    totalIncome += amount;
                 } else {
                    totalExpenses += amount;
                 }
            }
            
            // Weekly Spending Check (Uses the pre-initialized 7-day keys)
            const dateKey = t.date;
            if (weeklySpending.hasOwnProperty(dateKey) && t.type === 'expense') {
                weeklySpending[dateKey] += amount;
            }

            // Category Spending Check (All expenses regardless of date range)
            if (t.type === 'expense') {
                categorySpending[t.category] = (categorySpending[t.category] || 0) + amount;
            }
        });

        const totalBalance = totalIncome - totalExpenses;
        const budgetLeft = state.monthlyBudget - totalExpenses;
        const budgetPercentage = state.monthlyBudget > 0 ? 
            Math.min(100, (totalExpenses / state.monthlyBudget) * 100) : 0;
        
        return {
            totalBalance,
            totalIncome,
            totalExpenses,
            budgetLeft,
            budgetPercentage,
            weeklySpending,
            categorySpending
        };
    }

    function renderDashboard() {
    const {
        totalBalance,
        totalIncome,
        totalExpenses,
        budgetLeft,
        budgetPercentage,
        weeklySpending,
        categorySpending
    } = calculateFinancials();

    // 1. Update Stats Cards
    dashboardElements.balance.textContent = formatCurrency(totalBalance);
    dashboardElements.income.textContent = formatCurrency(totalIncome);
    dashboardElements.expenses.textContent = formatCurrency(totalExpenses);
    dashboardElements.budgetLeft.textContent = formatCurrency(budgetLeft);
    
    // Dynamic class update for Budget Left status (BUG FIX 1)
    const budgetValueElement = dashboardElements.budgetLeft;
    // Clears only the dynamic color classes, preserving 'stat-value'
    budgetValueElement.classList.remove('text-red', 'text-green'); 

    if (budgetLeft < 0) {
        budgetValueElement.classList.add('text-red');
    } else if (budgetLeft > 0) {
        budgetValueElement.classList.add('text-green');
    }


    // 2. Update Budget Progress
    dashboardElements.budgetPercentage.textContent = `${Math.round(budgetPercentage)}%`;
    
    // Ensure the progress bar doesn't exceed 100% style-wise
    const clampedPercentage = Math.min(budgetPercentage, 100);
    dashboardElements.budgetProgress.style.width = `${clampedPercentage}%`;
    
    dashboardElements.budgetSpent.textContent = totalExpenses.toFixed(2);
    dashboardElements.budgetTotal.textContent = state.monthlyBudget.toFixed(2);

    let progressColor = '#4f46e5'; // indigo
    if (budgetPercentage > 100) {
        progressColor = '#dc2626'; // red (Over budget)
    } else if (budgetPercentage > 80) {
        progressColor = '#f59e0b'; // amber/yellow (Nearing budget limit)
    }
    dashboardElements.budgetProgress.style.backgroundColor = progressColor;


    // 3. Render Weekly Chart
    const weeklyChart = dashboardElements.weeklyChart;
    weeklyChart.innerHTML = ''; // Clear existing placeholders/bars
    
    // Define Day names and calculate Max spending
    const maxSpending = Math.max(...Object.values(weeklySpending), 1);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Sort the dates to ensure the chart bars are in the correct order (left-to-right chronological)
    const dates = Object.keys(weeklySpending).sort(); 
    
    dates.forEach(dateKey => {
        const amount = weeklySpending[dateKey] || 0;
        const heightPercentage = (amount / maxSpending) * 100;

        // FIX (Timezone Bug): Use Date.UTC() to correctly calculate the day of the week 
        // regardless of the user's local timezone.
        const dateParts = dateKey.split('-');
        const dateObj = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
        
        // Use getUTCDay() for consistency with Date.UTC()
        const dayIndex = dateObj.getUTCDay(); 
        const dayOfWeek = dayNames[dayIndex];

        // 1. Create the outer column
        const column = document.createElement('div');
        column.className = 'chart-column';

        // 2. Create the inner bar
        const bar = document.createElement('div');
        bar.className = 'chart-bar-placeholder'; 
        bar.style.height = `${heightPercentage}%`; 

        // 3. Create the label
        const label = document.createElement('span');
        label.className = 'chart-label';
        label.textContent = dayOfWeek;

        // 4. Append
        column.appendChild(bar);
        column.appendChild(label);
        weeklyChart.appendChild(column);
    });


    // 4. Render Category Breakdown (No major bugs found here)
    dashboardElements.categoriesList.innerHTML = '';
    
    // Note: These colors should ideally be defined as CSS variables or in a single config object
    const categoryColors = {
        'Food': '#6366f1', 'Books': '#10b981', 'Transport': '#f59e0b', 
        'Entertainment': '#ef4444', 'Fees': '#3b82f6', 'Other': '#6b7280'
    };

    const sortedCategories = Object.entries(categorySpending)
        .sort(([, a], [, b]) => b - a); // Sort descending

    if (sortedCategories.length === 0) {
        dashboardElements.categoriesList.innerHTML = '<p class="text-gray-500 text-center col-span-full">No expenses to display in categories.</p>';
    } else {
        sortedCategories.forEach(([category, amount]) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category-item';

            const leftContent = document.createElement('div');
            leftContent.style.display = 'flex';
            leftContent.style.alignItems = 'center';

            const colorCircle = document.createElement('div');
            colorCircle.className = 'category-color-placeholder';
            colorCircle.style.backgroundColor = categoryColors[category] || '#6b7280';
            
            const categoryName = document.createElement('span');
            categoryName.textContent = category;

            leftContent.appendChild(colorCircle);
            leftContent.appendChild(categoryName);
            
            const amountSpan = document.createElement('span');
            amountSpan.className = 'font-medium';
            amountSpan.textContent = formatCurrency(amount);

            categoryDiv.appendChild(leftContent);
            categoryDiv.appendChild(amountSpan);
            dashboardElements.categoriesList.appendChild(categoryDiv);
        });
    }
}

    // ... (Remaining sections 5 through 9 remain largely the same)

    function filterAndSortRecords() {
        // ... (body remains the same)
        let filteredRecords = [...state.transactions];

        const searchTerm = searchInput.value.toLowerCase();
        const categoryFilter = categoriesFilter.value;
        const dateRange = dateFilter.value;

        // 1. Filtering
        filteredRecords = filteredRecords.filter(t => {
            const matchesSearch = t.description.toLowerCase().includes(searchTerm) || 
                                  t.notes.toLowerCase().includes(searchTerm);
            
            const matchesCategory = categoryFilter === '' || t.category === categoryFilter;

            let matchesDate = true;
            if (dateRange !== 'all') {
                const now = new Date();
                const transactionDate = new Date(t.date);
                let startDate;

                if (dateRange === 'week') {
                    startDate = new Date(now);
                    startDate.setDate(now.getDate() - 7);
                } else if (dateRange === 'month') {
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                } else if (dateRange === 'year') {
                    startDate = new Date(now.getFullYear(), 0, 1);
                }
                
                // Add one day to 'now' date so transactions on 'today' are included
                const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

                if (startDate) {
                    matchesDate = transactionDate >= startDate && transactionDate < endDate;
                }
            }
            
            return matchesSearch && matchesCategory && matchesDate;
        });

        // 2. Sorting
        const { column, direction } = state.currentSort;
        filteredRecords.sort((a, b) => {
            let valA, valB;

            if (column === 'amount') {
                // Sort by absolute amount value, and expense first for descending order
                valA = parseFloat(a.amount) * (a.type === 'expense' ? -1 : 1);
                valB = parseFloat(b.amount) * (b.type === 'expense' ? -1 : 1);
            } else if (column === 'date') {
                valA = new Date(a.date);
                valB = new Date(b.date);
            } else { 
                valA = a[column].toLowerCase();
                valB = b[column].toLowerCase();
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });

        // 3. Render
        renderRecordsTable(filteredRecords);
    }

    function renderRecordsTable(records) {
        // ... (body remains the same)
        recordsTableBody.innerHTML = '';
        recordsCardsContainer.innerHTML = '';

        if (records.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        } else {
            emptyState.classList.add('hidden');
        }

        records.forEach(t => {
            // Desktop Row
            const row = document.createElement('tr');
            row.className = 'table-row';
            const sign = t.type === 'expense' ? '-' : '+';
            const colorClass = t.type === 'expense' ? 'text-red' : 'text-green';
            
            row.innerHTML = `
                <td class="table-cell">${formatDate(t.date)}</td>
                <td class="table-cell">${t.description}</td>
                <td class="table-cell ${colorClass}">${sign}${formatCurrency(t.amount)}</td>
                <td class="table-cell">${t.category}</td>
                <td class="table-cell table-actions">
                    <button class="action-button edit-record" data-id="${t.id}" title="Edit">
                        <i data-feather="edit" class="w-4 h-4" aria-hidden="true"></i>
                    </button>
                    <button class="action-button delete-record" data-id="${t.id}" title="Delete">
                        <i data-feather="trash-2" class="w-4 h-4" aria-hidden="true"></i>
                    </button>
                </td>
            `;
            recordsTableBody.appendChild(row);

            // Mobile Card
            const card = document.createElement('div');
            card.className = 'record-card';
            card.innerHTML = `
                <div class="record-card-header">
                    <span class="record-card-title">${t.description}</span>
                    <span class="record-card-category">${t.category}</span>
                </div>
                <div class="record-card-body">
                    <p class="record-card-amount ${colorClass}">
                        ${sign}${formatCurrency(t.amount)}
                    </p>
                </div>
                <div class="record-card-footer">
                    <span class="text-sm text-gray-500">${formatDate(t.date)}</span>
                    <div>
                        <button class="action-button edit-record" data-id="${t.id}" title="Edit">
                            <i data-feather="edit" class="w-4 h-4" aria-hidden="true"></i>
                        </button>
                        <button class="action-button delete-record" data-id="${t.id}" title="Delete">
                            <i data-feather="trash-2" class="w-4 h-4" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>
            `;
            recordsCardsContainer.appendChild(card);
        });
        
        feather.replace(); 
    }

    function renderRecords() {
        // ... (body remains the same)
        categoriesFilter.innerHTML = '<option value="">All Categories</option>';
        state.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categoriesFilter.appendChild(option);
        });
        
        document.querySelectorAll('.sort-icon').forEach(icon => icon.style.display = 'none');
        const activeHeader = document.querySelector(`.sort-header[data-sort="${state.currentSort.column}"]`);
        if (activeHeader) {
            const icon = activeHeader.querySelector('.sort-icon');
            icon.style.display = 'inline';
            icon.setAttribute('data-feather', state.currentSort.direction === 'asc' ? 'chevron-up' : 'chevron-down');
            feather.replace();
        }

        filterAndSortRecords();
    }

    // ... (Remaining sections 5 through 9 remain the same)
    
    // --- Records Event Listeners ---
    searchInput.addEventListener('input', filterAndSortRecords);
    categoriesFilter.addEventListener('change', filterAndSortRecords);
    dateFilter.addEventListener('change', filterAndSortRecords);
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        filterAndSortRecords();
    });

    sortHeaders.forEach(header => {
        header.addEventListener('click', (e) => {
            const column = e.currentTarget.getAttribute('data-sort');
            let direction = 'desc';

            if (state.currentSort.column === column) {
                direction = state.currentSort.direction === 'desc' ? 'asc' : 'desc';
            }

            state.currentSort = { column, direction };
            renderRecords(); 
        });
    });

    document.addEventListener('click', (e) => {
        if (e.target.closest('.edit-record')) {
            const id = e.target.closest('.edit-record').getAttribute('data-id');
            navigateTo('add', id);
        } else if (e.target.closest('.delete-record')) {
            const id = e.target.closest('.delete-record').getAttribute('data-id');
            showConfirmationModal('Delete Transaction', 'Are you sure you want to delete this transaction?', () => {
                deleteRecord(id);
                renderRecords();
            });
        }
    });

    function deleteRecord(id) {
        state.transactions = state.transactions.filter(t => t.id !== id);
        saveState();
        if (!document.getElementById('dashboard-page').classList.contains('hidden')) {
            renderDashboard();
        }
    }


    // ----------------------------------------------------
    // 6. Add/Edit Form Handling
    // ----------------------------------------------------

    function setupAddEditForm(recordId) {
        transactionForm.reset();
        document.getElementById('record-id').value = recordId || '';

        document.querySelectorAll('.form-error-message').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.form-error').forEach(el => el.classList.remove('form-error'));

        document.querySelector('#add-page h1').textContent = recordId ? 'Edit Transaction' : 'Add Transaction';
        document.querySelector('#transaction-form button[type="submit"]').textContent = recordId ? 'Update Transaction' : 'Save Transaction';

        const categorySelect = document.getElementById('category');
        categorySelect.innerHTML = '';
        state.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categorySelect.appendChild(option);
        });
        
        if (recordId) {
            const record = state.transactions.find(t => t.id === recordId);
            if (record) {
                document.getElementById('description').value = record.description;
                document.getElementById('amount').value = record.amount;
                document.getElementById('type').value = record.type;
                document.getElementById('category').value = record.category;
                document.getElementById('date').value = record.date;
                document.getElementById('notes').value = record.notes;
            }
        }
    }

    transactionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        document.querySelectorAll('.form-error-message').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.form-error').forEach(el => el.classList.remove('form-error'));

        const id = document.getElementById('record-id').value;
        const descriptionInput = document.getElementById('description');
        const amountInput = document.getElementById('amount');
        const categoryInput = document.getElementById('category');
        const dateInput = document.getElementById('date');
        const typeInput = document.getElementById('type');
        const notesInput = document.getElementById('notes');

        let isValid = true;

        if (!validateDescription(descriptionInput.value)) {
            document.getElementById('description-error').classList.remove('hidden');
            descriptionInput.classList.add('form-error');
            isValid = false;
        }
        
        if (!validateAmount(amountInput.value)) {
            document.getElementById('amount-error').classList.remove('hidden');
            amountInput.classList.add('form-error');
            isValid = false;
        }

        if (!validateDate(dateInput.value)) {
            document.getElementById('date-error').classList.remove('hidden');
            dateInput.classList.add('form-error');
            isValid = false;
        }

        if (!isValid) return;

        const newRecord = {
            id: id || Date.now().toString(),
            description: descriptionInput.value.trim(),
            amount: parseFloat(parseFloat(amountInput.value).toFixed(2)),
            type: typeInput.value,
            category: categoryInput.value,
            date: dateInput.value,
            notes: notesInput.value.trim()
        };

        if (id) {
            const index = state.transactions.findIndex(t => t.id === id);
            if (index !== -1) {
                state.transactions[index] = newRecord;
            }
        } else {
            state.transactions.push(newRecord);
        }

        saveState();
        navigateTo('records');
    });
    
    document.getElementById('add-category-btn').addEventListener('click', () => {
        const newCat = prompt('Enter new category name:');
        if (newCat && newCat.trim() !== '') {
            const cleanCat = newCat.trim();
            if (!state.categories.includes(cleanCat)) {
                state.categories.push(cleanCat);
                saveState();
                setupAddEditForm(document.getElementById('record-id').value);
                document.getElementById('category').value = cleanCat;
            }
        }
    });

    // ----------------------------------------------------
    // 7. Settings Management
    // ----------------------------------------------------

    function renderSettings() {
        // 1. Categories
        settingsElements.categoriesContainer.innerHTML = '';
        state.categories.forEach(cat => {
            const tag = document.createElement('div');
            tag.className = 'category-tag category-tag-deletable';
            tag.setAttribute('data-category', cat);
            tag.innerHTML = `
                <span>${cat}</span>
                <button type="button" class="category-tag-delete-btn" data-category="${cat}">
                    <i data-feather="x" class="w-4 h-4"></i>
                </button>
            `;
            settingsElements.categoriesContainer.appendChild(tag);
        });
        feather.replace();

        // 2. Budget
        settingsElements.monthlyBudgetInput.value = state.monthlyBudget.toFixed(2);
        
        // 3. Currency
        settingsElements.baseCurrency.value = state.settings.baseCurrency;
        settingsElements.currency1.value = state.settings.currency1;
        settingsElements.currency2.value = state.settings.currency2;
    }

    settingsElements.addCategoryButton.addEventListener('click', () => {
        const newCat = settingsElements.newCategoryInput.value.trim();
        settingsElements.categoryError.classList.add('hidden');
        settingsElements.newCategoryInput.classList.remove('form-error');

        if (newCat === '' || state.categories.includes(newCat)) {
            settingsElements.categoryError.textContent = newCat === '' ? 'Category name cannot be empty.' : 'Category already exists.';
            settingsElements.categoryError.classList.remove('hidden');
            settingsElements.newCategoryInput.classList.add('form-error');
            return;
        }

        state.categories.push(newCat);
        state.categories.sort(); 
        saveState();
        renderSettings();
        settingsElements.newCategoryInput.value = '';
    });

    settingsElements.categoriesContainer.addEventListener('click', (e) => {
        if (e.target.closest('.category-tag-delete-btn')) {
            const categoryToDelete = e.target.closest('.category-tag-delete-btn').getAttribute('data-category');
            if (DEFAULT_CATEGORIES.includes(categoryToDelete)) {
                alert(`Cannot delete default category: ${categoryToDelete}`);
                return;
            }

            if (state.transactions.some(t => t.category === categoryToDelete)) {
                alert(`Cannot delete category "${categoryToDelete}" because it is used in existing transactions.`);
                return;
            }

            showConfirmationModal('Delete Category', `Are you sure you want to delete the category "${categoryToDelete}"?`, () => {
                state.categories = state.categories.filter(cat => cat !== categoryToDelete);
                saveState();
                renderSettings();
            });
        }
    });

    settingsElements.saveBudgetButton.addEventListener('click', () => {
        const budgetStr = settingsElements.monthlyBudgetInput.value;
        settingsElements.budgetError.classList.add('hidden');
        settingsElements.monthlyBudgetInput.classList.remove('form-error');

        if (!validateAmount(budgetStr) || parseFloat(budgetStr) < 0) {
            settingsElements.budgetError.classList.remove('hidden');
            settingsElements.monthlyBudgetInput.classList.add('form-error');
            return;
        }

        state.monthlyBudget = parseFloat(parseFloat(budgetStr).toFixed(2));
        saveState();
        alert('Monthly Budget Saved!');
        
        if (!document.getElementById('dashboard-page').classList.contains('hidden')) {
            renderDashboard();
        }
    });
    
    settingsElements.saveCurrencyButton.addEventListener('click', () => {
        state.settings.baseCurrency = settingsElements.baseCurrency.value;
        state.settings.currency1 = settingsElements.currency1.value;
        state.settings.currency2 = settingsElements.currency2.value;
        saveState();
        alert('Currency Settings Saved! Changes will apply to formatted display.');
    });

    // --- Data Management ---
    document.getElementById('reset-data').addEventListener('click', () => {
        showConfirmationModal('Reset All Data', 'WARNING: This will permanently delete ALL your transactions, categories, and settings. Are you absolutely sure?', () => {
            localStorage.removeItem(STORAGE_KEY);
            state = {
                transactions: [],
                categories: [...DEFAULT_CATEGORIES],
                monthlyBudget: 0,
                settings: { baseCurrency: 'USD', currency1: 'EUR', currency2: 'GBP' },
                currentSort: { column: 'date', direction: 'desc' }
            };
            navigateTo('dashboard');
            alert('All data has been reset.');
        });
    });

    document.getElementById('export-data').addEventListener('click', () => {
        const data = JSON.stringify(state.transactions, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'penniwise_transactions.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
    
    document.getElementById('export-btn').addEventListener('click', () => {
        const records = [...recordsTableBody.querySelectorAll('.table-row')].map(row => {
            return [...row.querySelectorAll('.table-cell')].map(cell => cell.textContent.trim());
        });
        
        const headers = ['Date', 'Description', 'Amount', 'Category', 'Actions (Ignored)'];
        const csv = [
            headers.slice(0, 4).join(','),
            ...records.map(row => row.slice(0, 4).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'penniwise_records.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });


    // ----------------------------------------------------
    // 8. Confirmation Modal
    // ----------------------------------------------------
    let currentModalAction = null;

    function showConfirmationModal(title, message, onConfirm) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        currentModalAction = onConfirm;
        modal.classList.remove('hidden');
    }

    function hideConfirmationModal() {
        modal.classList.add('hidden');
        currentModalAction = null;
    }

    modalCancelBtn.addEventListener('click', hideConfirmationModal);
    modalConfirmBtn.addEventListener('click', () => {
        if (currentModalAction) {
            currentModalAction();
        }
        hideConfirmationModal();
    });

    // ----------------------------------------------------
    // 9. Initialize Application
    // ----------------------------------------------------
    loadState();
    navigateTo('dashboard'); 
});
