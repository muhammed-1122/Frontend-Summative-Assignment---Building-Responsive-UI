// ====================================================
// CRITICAL GLOBAL VARIABLES FOR CHART.JS AND STATE
// ====================================================

const DEFAULT_CATEGORIES = ['Food', 'Books', 'Transport', 'Entertainment', 'Fees', 'Other'];
let weeklyChartInstance = null;
let categoryChartInstance = null; // New instance for Doughnut Chart

// ====================================================

document.addEventListener('DOMContentLoaded', () => {

    // ----------------------------------------------------
    // 1. Initial State & Fixed Rates
    // ----------------------------------------------------

    // Using rates based on 1 USD
    const FIXED_RATES = {
        'USD': 1.0,
        'RWF': 1456.0,
        'NGN': 1471.0
    };

    const STORAGE_KEY = 'penniwiseData';

    let state = {
        transactions: [],
        categories: [...DEFAULT_CATEGORIES],
        monthlyBudget: 0,
        settings: {
            baseCurrency: 'RWF'
        },
        currentSort: {
            column: 'date',
            direction: 'desc'
        }
    };
    // ...

    function loadState() {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            const loadedState = JSON.parse(storedData);

            const base = loadedState.settings?.baseCurrency || state.settings.baseCurrency;
            state.transactions = (loadedState.transactions || []).map(t => ({
                ...t,
                currency: t.currency || base
            }));

            state.categories = loadedState.categories || [...DEFAULT_CATEGORIES];
            state.monthlyBudget = loadedState.monthlyBudget || 0;

            if (loadedState.settings) {
                state.settings.baseCurrency = loadedState.settings.baseCurrency || 'RWF';
            }

            state.currentSort = loadedState.currentSort || state.currentSort;
        }
    }

    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    // ----------------------------------------------------
    // 2. DOM Elements and Utility Functions
    // ----------------------------------------------------

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
        categoriesList: document.getElementById('categories-list'),
        categoryChart: document.getElementById('category-chart')
    };

    const settingsElements = {
        categoriesContainer: document.getElementById('categories-container'),
        newCategoryInput: document.getElementById('new-category'),
        addCategoryButton: document.getElementById('add-category'),
        categoryError: document.getElementById('category-settings-error'),
        monthlyBudgetInput: document.getElementById('monthly-budget'),
        budgetCurrencySuffix: document.getElementById('budget-currency-suffix'), // <-- Added for budget suffix
        saveBudgetButton: document.getElementById('save-budget'),
        budgetError: document.getElementById('budget-error'),
        baseCurrency: document.getElementById('base-currency'),
        saveCurrencyButton: document.getElementById('save-currency')
    };

    const modal = document.getElementById('confirmation-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        const dateParts = dateString.split('-');
        const dateUTC = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
        return dateUTC.toLocaleDateString(undefined, options);
    };

    const formatCurrency = (amount, currencyCode) => {
        const code = currencyCode || state.settings.baseCurrency;
        try {
            return new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: code,
                minimumFractionDigits: 2
            }).format(amount);
        } catch (e) {
            console.error(`Error formatting currency: Amount=${amount}, Code=${code}`, e);
            // Fallback for invalid code
            return `${code} ${amount.toFixed(2)}`;
        }
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

    function convertCurrency(amount, fromCurrency, toCurrency) {
        if (!fromCurrency || !toCurrency) {
             console.error(`Cannot convert currency, missing code: From ${fromCurrency} to ${toCurrency}`);
             return amount; // Return original if codes are missing
        }
        if (fromCurrency === toCurrency) {
            return amount;
        }

        const fromRate = FIXED_RATES[fromCurrency];
        const toRate = FIXED_RATES[toCurrency];

        if (!fromRate || !toRate) {
            console.error(`Missing conversion rate: From ${fromCurrency} to ${toCurrency}`);
            return amount;
        }

        const amountInUSD = amount / fromRate;
        const finalAmount = amountInUSD * toRate;
        return finalAmount;
    }

    // ----------------------------------------------------
    // 3. Navigation and Routing
    // ----------------------------------------------------

    function navigateTo(pageId, recordId = null) {
        pages.forEach(page => page.classList.add('hidden'));

        const targetPage = document.getElementById(`${pageId}-page`);
        if (targetPage) {
            targetPage.classList.remove('hidden');
        }

        // Close mobile menu on navigation
        mobileMenu.classList.remove('is-open'); // Use .is-open instead of .hidden
        mobileMenuButton.setAttribute('aria-expanded', 'false');


        navLinks.forEach(link => {
            if (link.dataset.page === pageId) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            } else {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
            }
        });


        // Destroy charts when leaving the dashboard to prevent conflicts
        if (pageId !== 'dashboard') {
            if (weeklyChartInstance) {
                weeklyChartInstance.destroy();
                weeklyChartInstance = null;
            }
            if (categoryChartInstance) {
                categoryChartInstance.destroy();
                categoryChartInstance = null;
            }
        }

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
        // Focus management for accessibility
        const mainHeading = targetPage?.querySelector('h2.page-title');
        if (mainHeading) {
            mainHeading.setAttribute('tabindex', '-1'); // Make it focusable
            mainHeading.focus();
        } else {
             document.getElementById('main-content-start')?.focus(); // Fallback focus
        }
    }

    navLinks.forEach(link => {
        // Exclude theme toggle buttons from standard nav link behavior
        if (link.id !== 'theme-toggle-desktop' && link.id !== 'theme-toggle-mobile') {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const pageId = e.target.closest('[data-page]').getAttribute('data-page');
                navigateTo(pageId);
            });
        }
    });

    mobileMenuButton.addEventListener('click', () => {
        // Toggle the .is-open class which controls the animation
        const isOpen = mobileMenu.classList.toggle('is-open'); 
        // setAttribute's second argument is a string, but boolean converts fine.
        mobileMenuButton.setAttribute('aria-expanded', isOpen);
    });

    // --- START DARK MODE LOGIC ---
    const themeToggleButtons = document.querySelectorAll('#theme-toggle-desktop, #theme-toggle-mobile');
    const sunIcons = document.querySelectorAll('.theme-icon-sun');
    const moonIcons = document.querySelectorAll('.theme-icon-moon');

    // Function to update icons based on theme
    function updateThemeIcons(isDark) {
        sunIcons.forEach(icon => icon.classList.toggle('hidden', isDark));
        moonIcons.forEach(icon => icon.classList.toggle('hidden', !isDark));
        // Ensure Feather icons are replaced if dynamically shown/hidden
        feather.replace();
    }

    // Function to apply the theme
    function applyTheme(isDark) {
        document.documentElement.classList.toggle('dark', isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateThemeIcons(isDark);

        // Update Chart.js defaults for dark/light mode
        const gridColor = isDark ? '#374151' : '#e5e7eb'; // gray-700 / gray-200
        const textColor = isDark ? '#9ca3af' : '#6b7280'; // gray-400 / gray-500

        Chart.defaults.borderColor = gridColor;
        Chart.defaults.color = textColor;

        // This is crucial: Re-render charts if we are on the dashboard
        if (!document.getElementById('dashboard-page').classList.contains('hidden')) {
            // Destroy charts so they can be rebuilt with new (dark) colors
            if (weeklyChartInstance) {
                weeklyChartInstance.destroy();
                weeklyChartInstance = null;
            }
            if (categoryChartInstance) {
                categoryChartInstance.destroy();
                categoryChartInstance = null;
            }
            // Re-render the whole dashboard
            renderDashboard();
        }
    }

    // Add click listeners to both buttons
    themeToggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const isCurrentlyDark = document.documentElement.classList.contains('dark');
            applyTheme(!isCurrentlyDark);
        });
    });

    // Initialize icons and Chart.js defaults on load
    const isDark = document.documentElement.classList.contains('dark');
    updateThemeIcons(isDark);
    applyTheme(isDark); // Call applyTheme to set Chart.js defaults initially

    // --- END DARK MODE LOGIC ---


    document.querySelectorAll('[data-page="add"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo('add');
        });
    });

    // ----------------------------------------------------
    // 4. Data Processing
    // ----------------------------------------------------

    function calculateFinancials() {
        const now = new Date();

        const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const startOfMonthUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

        let totalIncome = 0;
        let totalExpenses = 0;
        const weeklySpending = {};
        const categorySpending = {};

        const baseCurrency = state.settings.baseCurrency;

        // Initialize weekly spending days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(todayUTC);
            date.setUTCDate(todayUTC.getUTCDate() - i);
            const dateKey = date.toISOString().split('T')[0];
            weeklySpending[dateKey] = 0;
        }

        state.transactions.forEach(t => {
            // Ensure amount is a number before parsing
            const amountNum = parseFloat(t.amount);
            if (isNaN(amountNum)) {
                console.warn(`Skipping transaction with invalid amount: ${t.description}`);
                return; // Skip this transaction
            }


            const amountInBase = convertCurrency(
                amountNum,
                t.currency,
                baseCurrency
            );

            // Validate date format before splitting
            if (!t.date || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) {
                 console.warn(`Skipping transaction with invalid date: ${t.description}`);
                 return; // Skip this transaction
            }
            const parts = t.date.split('-');
            const transactionDateUTC = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));


            // Check if transaction is within the current month up to today
             if (transactionDateUTC.getTime() >= startOfMonthUTC.getTime() && transactionDateUTC.getTime() <= todayUTC.getTime()) {
                if (t.type === 'income') {
                    totalIncome += amountInBase;
                } else {
                    totalExpenses += amountInBase;
                }
            }

            // Check if transaction date falls within the last 7 days for weekly spending
            const dateKey = t.date;
            if (weeklySpending.hasOwnProperty(dateKey) && t.type === 'expense') {
                weeklySpending[dateKey] += amountInBase;
            }

            // Accumulate spending per category (only expenses)
            if (t.type === 'expense') {
                categorySpending[t.category] = (categorySpending[t.category] || 0) + amountInBase;
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

    // ----------------------------------------------------
    // 5. Dashboard Rendering (Including TWO Charts)
    // ----------------------------------------------------

    const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#6b7280', '#06b6d4', '#f472b6'];

    function renderCharts(weeklySpending, categorySpending) {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const isDarkMode = document.documentElement.classList.contains('dark');
        const gridColor = isDarkMode ? '#374151' : '#e5e7eb'; // gray-700 / gray-200
        const textColor = isDarkMode ? '#9ca3af' : '#6b7280'; // gray-400 / gray-500


        // --- 1. Weekly Bar Chart ---
        const weeklyCanvas = document.getElementById('weekly-chart-canvas');
        if (!weeklyCanvas) return; // Exit if canvas not found
        if (weeklyChartInstance) weeklyChartInstance.destroy(); // Clear previous instance

        const weeklyDates = Object.keys(weeklySpending).sort();
        const weeklyData = weeklyDates.map(dateKey => weeklySpending[dateKey]);

        const weeklyLabels = weeklyDates.map(dateKey => {
            const dateParts = dateKey.split('-');
            const dateObj = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
            return dayNames[dateObj.getUTCDay()];
        });

        weeklyChartInstance = new Chart(weeklyCanvas, {
            type: 'bar',
            data: {
                labels: weeklyLabels,
                datasets: [{
                    label: 'Spending',
                    data: weeklyData,
                    backgroundColor: '#4f46e5',
                    borderRadius: 4,
                    borderWidth: 0,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: gridColor },
                        ticks: { color: textColor }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: textColor }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `Spending: ${formatCurrency(context.parsed.y)}`
                        }
                    }
                }
            }
        });

        // --- 2. Category Doughnut Chart ---
        const categoryCanvas = document.getElementById('category-chart-canvas');
         if (!categoryCanvas) return; // Exit if canvas not found
        if (categoryChartInstance) categoryChartInstance.destroy(); // Clear previous instance

        const categoryLabels = Object.keys(categorySpending);
        const categoryData = categoryLabels.map(label => categorySpending[label]);
        const categoryColorsMap = categoryLabels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

        // Only draw if there are expenses
        if (categoryData.reduce((sum, amount) => sum + amount, 0) > 0) {
            categoryChartInstance = new Chart(categoryCanvas, {
                type: 'doughnut',
                data: {
                    labels: categoryLabels,
                    datasets: [{
                        data: categoryData,
                        backgroundColor: categoryColorsMap,
                        hoverOffset: 8, // Increased hover effect
                        borderWidth: 2,
                        borderColor: isDarkMode ? '#111827' : '#f9fafb', // Match body background
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: textColor, // Set legend text color
                                boxWidth: 12, // Smaller color box
                                padding: 15 // Spacing between items
                            }
                         },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.parsed;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    return ` ${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    cutout: '60%' // Make the doughnut hole larger
                }
            });
        } else {
             // Optional: Display a message if no data?
             // const ctx = categoryCanvas.getContext('2d');
             // ctx.textAlign = 'center';
             // ctx.textBaseline = 'middle';
             // ctx.fillStyle = textColor;
             // ctx.fillText('No expense data for categories yet', categoryCanvas.width / 2, categoryCanvas.height / 2);
        }
    }


    function renderDashboard() {
        const {
            totalBalance, totalIncome, totalExpenses, budgetLeft,
            budgetPercentage, weeklySpending, categorySpending
        } = calculateFinancials();

        // 1. Update Stats Cards
        dashboardElements.balance.textContent = formatCurrency(totalBalance);
        dashboardElements.income.textContent = formatCurrency(totalIncome);
        dashboardElements.expenses.textContent = formatCurrency(totalExpenses);
        dashboardElements.budgetLeft.textContent = formatCurrency(budgetLeft);

        const budgetValueElement = dashboardElements.budgetLeft;
        budgetValueElement.classList.remove('text-red', 'text-green');

        if (budgetLeft < 0) {
            budgetValueElement.classList.add('text-red');
        } else if (budgetLeft > 0) {
            budgetValueElement.classList.add('text-green');
        }

        // 2. Update Budget Progress
        dashboardElements.budgetPercentage.textContent = `${Math.round(budgetPercentage)}%`;
        const clampedPercentage = Math.min(budgetPercentage, 100); // Clamp at 100% for visual
        dashboardElements.budgetProgress.style.width = `${clampedPercentage}%`;
        // Display budget info in base currency
        dashboardElements.budgetSpent.textContent = formatCurrency(totalExpenses);
        dashboardElements.budgetTotal.textContent = formatCurrency(state.monthlyBudget);

        let progressColor = '#4f46e5'; // Default indigo
        if (budgetPercentage > 100) {
            progressColor = '#dc2626'; // Red
        } else if (budgetPercentage > 80) {
            progressColor = '#f59e0b'; // Amber/Yellow
        }
        dashboardElements.budgetProgress.style.backgroundColor = progressColor;

        // 3. Render Charts
        renderCharts(weeklySpending, categorySpending);

        // 4. Render Category Breakdown List
        dashboardElements.categoriesList.innerHTML = ''; // Clear previous list
        const sortedCategories = Object.entries(categorySpending)
            .sort(([, a], [, b]) => b - a); // Sort descending by amount

        if (sortedCategories.length === 0) {
            dashboardElements.categoriesList.innerHTML = '<p class="text-gray-500 text-center col-span-full">No expenses to display in categories.</p>';
        } else {
            sortedCategories.forEach(([category, amount], index) => {
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'category-item';

                const leftContent = document.createElement('div');
                // leftContent style is handled by CSS now

                const colorCircle = document.createElement('div');
                colorCircle.className = 'category-color-placeholder';
                colorCircle.style.backgroundColor = CHART_COLORS[index % CHART_COLORS.length];

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

    // ----------------------------------------------------
    // 6. Records Filtering and Sorting
    // ----------------------------------------------------

    function filterAndSortRecords(returnArray = false) {
        searchInput.addEventListener('input', filterAndSortRecords);
    categoriesFilter.addEventListener('change', filterAndSortRecords);
    dateFilter.addEventListener('change', filterAndSortRecords);

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.focus(); // Keep focus on search input
        filterAndSortRecords();
    });

    sortHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            if (!column) return; // Ignore clicks if data-sort is missing

            let direction = 'desc';

            // If we click the same column, toggle direction
            if (state.currentSort.column === column) {
                 direction = state.currentSort.direction === 'desc' ? 'asc' : 'desc';
            } else {
                 // Default direction for new column
                 if (column === 'date') direction = 'desc'; // Default date desc
                 else direction = 'asc'; // Others default asc
            }

            state.currentSort = { column, direction };
            saveState(); // Save the new sort state
            renderRecords(); // Re-render to update icons and apply sort
        });
    });


        let filteredRecords = [...state.transactions];

        const searchTerm = searchInput.value.toLowerCase();
        const categoryFilter = categoriesFilter.value;
        const dateRange = dateFilter.value;

        // 1. Filtering
        filteredRecords = filteredRecords.filter(t => {
            // Ensure properties exist before calling toLowerCase
            const descriptionMatch = t.description?.toLowerCase().includes(searchTerm) ?? false;
            const notesMatch = t.notes?.toLowerCase().includes(searchTerm) ?? false;
            const matchesSearch = descriptionMatch || notesMatch;

            const matchesCategory = categoryFilter === '' || t.category === categoryFilter;

            let matchesDate = true;
            if (dateRange !== 'all') {
                 if (!t.date || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) return false; // Skip if invalid date

                const now = new Date();
                // Use UTC for all date comparisons to avoid timezone issues
                const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

                const tParts = t.date.split('-');
                const transactionDate = new Date(Date.UTC(tParts[0], tParts[1] - 1, tParts[2]));

                let startDateUTC;
                const endDateUTC = todayUTC; // End date is always today (inclusive)

                // --- THIS IS THE UPDATED 'week' LOGIC ---
                if (dateRange === 'week') {
                    // Calculate 7 days ago from today (UTC)
                    startDateUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6)); // Inclusive of today, so go back 6 days
                // --- END OF UPDATE ---
                } else if (dateRange === 'month') {
                    startDateUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
                } else if (dateRange === 'year') {
                    startDateUTC = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
                }

                if (startDateUTC) {
                    // Ensure the transaction date is on or after the start date AND on or before the end date
                     matchesDate = transactionDate.getTime() >= startDateUTC.getTime() &&
                                  transactionDate.getTime() <= endDateUTC.getTime();
                } else {
                     matchesDate = false; // Should not happen with current options
                }
            }

            return matchesSearch && matchesCategory && matchesDate;
        });

        // 2. Sorting
        const { column, direction } = state.currentSort;
        filteredRecords.sort((a, b) => {
            let valA, valB;

            if (column === 'amount') {
                const base = state.settings.baseCurrency;
                // Ensure amounts are numbers
                const amountA = parseFloat(a.amount) || 0;
                const amountB = parseFloat(b.amount) || 0;
                valA = convertCurrency(amountA, a.currency, base) * (a.type === 'expense' ? -1 : 1);
                valB = convertCurrency(amountB, b.currency, base) * (b.type === 'expense' ? -1 : 1);
            } else if (column === 'date') {
                 // Handle potentially invalid dates for sorting robustness
                valA = a.date && /^\d{4}-\d{2}-\d{2}$/.test(a.date) ? new Date(a.date) : new Date(0); // Epoch if invalid
                valB = b.date && /^\d{4}-\d{2}-\d{2}$/.test(b.date) ? new Date(b.date) : new Date(0);
            } else {
                // Ensure properties exist before calling toLowerCase
                valA = (a[column] || '').toLowerCase();
                valB = (b[column] || '').toLowerCase();
            }

            // Comparison logic
            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0; // Values are equal
        });

        // 3. Render or Return
        if (returnArray) {
            return filteredRecords; // Return the array for export
        } else {
            renderRecordsTable(filteredRecords); // Render the table/cards
        }
    }


    function renderRecordsTable(records) {
        recordsTableBody.innerHTML = '';
        recordsCardsContainer.innerHTML = '';

        const tableElement = recordsTableBody.closest('table'); // Find the table element

        if (records.length === 0) {
            emptyState.classList.remove('hidden');
            if (tableElement) tableElement.style.display = 'none';
            recordsCardsContainer.style.display = 'none';
            return;
        } else {
            emptyState.classList.add('hidden');
            // Determine display based on media query (handled by CSS, but ensure elements are potentially visible)
            if (tableElement) tableElement.style.display = ''; // Let CSS handle visibility
            recordsCardsContainer.style.display = ''; // Let CSS handle visibility
        }

        records.forEach(t => {
            const row = document.createElement('tr');
            row.className = 'table-row';
            const sign = t.type === 'expense' ? '-' : '+';
            const colorClass = t.type === 'expense' ? 'text-red' : 'text-green';

            const formattedAmount = formatCurrency(parseFloat(t.amount) || 0, t.currency); // Ensure amount is number

            row.innerHTML = `
                <td class="table-cell">${formatDate(t.date || 'N/A')}</td>
                <td class="table-cell">${t.description || 'N/A'}</td>
                <td class="table-cell ${colorClass}">${sign}${formattedAmount}</td>
                <td class="table-cell">${t.category || 'N/A'}</td>
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

            const card = document.createElement('div');
            card.className = 'record-card';
            card.innerHTML = `
                <div class="record-detail">
                    <span class="record-label">Date:</span>
                    <span>${formatDate(t.date || 'N/A')}</span>
                </div>
                <div class="record-detail">
                    <span class="record-label">Description:</span>
                    <span>${t.description || 'N/A'}</span>
                </div>
                <div class="record-detail">
                    <span class="record-label">Amount:</span>
                    <span class="${colorClass}">${sign}${formattedAmount}</span>
                </div>
                <div class="record-detail">
                    <span class="record-label">Category:</span>
                    <span>${t.category || 'N/A'}</span>
                </div>
                <div class="record-actions">
                    <button class="action-button edit-record" data-id="${t.id}" title="Edit">
                        <i data-feather="edit" class="w-4 h-4" aria-hidden="true"></i> Edit
                    </button>
                    <button class="action-button delete-record" data-id="${t.id}" title="Delete">
                        <i data-feather="trash-2" class="w-4 h-4" aria-hidden="true"></i> Delete
                    </button>
                </div>
            `;
            recordsCardsContainer.appendChild(card);
        });

        feather.replace();
    }


    function renderRecords() {
        // Populate category filter
        const currentCategoryFilterValue = categoriesFilter.value; // Preserve selection
        categoriesFilter.innerHTML = '<option value="">All Categories</option>';
        state.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            if (cat === currentCategoryFilterValue) {
                option.selected = true; // Re-select if it was selected before re-render
            }
            categoriesFilter.appendChild(option);
        });

        // Update sort headers visually
        sortHeaders.forEach(header => {
            const icon = header.querySelector('.sort-icon');
            if (!icon) return; // Skip if icon element not found

            const column = header.dataset.sort;
            if (column === state.currentSort.column) {
                header.setAttribute('aria-sort', state.currentSort.direction === 'asc' ? 'ascending' : 'descending');
                icon.setAttribute('data-feather', state.currentSort.direction === 'asc' ? 'chevron-up' : 'chevron-down');
                icon.style.opacity = '1';
            } else {
                header.removeAttribute('aria-sort');
                icon.setAttribute('data-feather', 'chevron-down'); // Default icon
                icon.style.opacity = '0.4'; // Dim inactive icons
            }
        });
        feather.replace(); // Update icons

        // Run the filter and sort to update the displayed data
        filterAndSortRecords();
    }


    // --- Event Listeners for Filters, Search, and Sort ---
    searchInput.addEventListener('input', filterAndSortRecords);
    categoriesFilter.addEventListener('change', filterAndSortRecords);
    dateFilter.addEventListener('change', filterAndSortRecords);

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.focus(); // Keep focus on search input
        filterAndSortRecords();
    });

    sortHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            if (!column) return; // Ignore clicks if data-sort is missing

            let direction = 'desc';

            // If we click the same column, toggle direction
            if (state.currentSort.column === column) {
                 direction = state.currentSort.direction === 'desc' ? 'asc' : 'desc';
            } else {
                 // Default direction for new column
                 direction = (column === 'amount') ? 'desc' : 'asc'; // Default amount desc, others asc? Or keep default desc for date? Let's default date desc, others asc
                 if (column === 'date') direction = 'desc';
            }


            state.currentSort = { column, direction };
            saveState(); // Save the new sort state
            renderRecords(); // Re-render to update icons and apply sort
        });
    });
    // --- END OF LISTENERS ---


    // ----------------------------------------------------
    // 7. Add/Edit Form Handling & Settings
    // ----------------------------------------------------

    function setupAddEditForm(recordId) {
        transactionForm.reset();
        document.getElementById('record-id').value = recordId || '';

        // Clear previous error states
        document.querySelectorAll('.form-error-message').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.form-error').forEach(el => el.classList.remove('form-error'));

        const pageTitle = document.querySelector('#add-page .page-title');
        if (pageTitle) {
            pageTitle.textContent = recordId ? 'Edit Transaction' : 'Add Transaction';
        }

        document.querySelector('#transaction-form button[type="submit"]').textContent = recordId ? 'Update Transaction' : 'Save Transaction';

        // Populate category dropdown
        const categorySelect = document.getElementById('category');
        categorySelect.innerHTML = ''; // Clear existing options
        state.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            categorySelect.appendChild(option);
        });

        // Pre-fill form if editing
        if (recordId) {
            const record = state.transactions.find(t => t.id === recordId);
            if (record) {
                document.getElementById('description').value = record.description || '';
                document.getElementById('amount').value = record.amount || '';
                document.getElementById('type').value = record.type || 'expense';
                document.getElementById('category').value = record.category || '';
                document.getElementById('currency').value = record.currency || state.settings.baseCurrency;
                document.getElementById('date').value = record.date || '';
                document.getElementById('notes').value = record.notes || '';
            } else {
                 console.error(`Record with ID ${recordId} not found for editing.`);
                 // Optionally clear recordId or navigate away
                 document.getElementById('record-id').value = '';
                 if (pageTitle) pageTitle.textContent = 'Add Transaction'; // Reset title
            }
        } else {
            // Set defaults for new transaction
            document.getElementById('currency').value = state.settings.baseCurrency;
            document.getElementById('type').value = 'expense';
            // Set default date to today?
            // document.getElementById('date').valueAsDate = new Date(); // More robust
             document.getElementById('date').value = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        }

        // Focus the first input field
        document.getElementById('description')?.focus();

    }

    transactionForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Clear previous errors
        document.querySelectorAll('.form-error-message').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.form-error').forEach(el => el.classList.remove('form-error'));

        // Get form elements
        const id = document.getElementById('record-id').value;
        const descriptionInput = document.getElementById('description');
        const amountInput = document.getElementById('amount');
        const currencyInput = document.getElementById('currency');
        const categoryInput = document.getElementById('category');
        const dateInput = document.getElementById('date');
        const typeInput = document.getElementById('type');
        const notesInput = document.getElementById('notes');

        // Validation
        let isValid = true;

        if (!validateDescription(descriptionInput.value)) {
            document.getElementById('description-error')?.classList.remove('hidden');
            descriptionInput.classList.add('form-error');
            isValid = false;
        }

        if (!validateAmount(amountInput.value)) {
            document.getElementById('amount-error')?.classList.remove('hidden');
            amountInput.classList.add('form-error');
            isValid = false;
        }

        if (!validateDate(dateInput.value)) {
            document.getElementById('date-error')?.classList.remove('hidden');
            dateInput.classList.add('form-error');
            isValid = false;
        }

        // Add validation for type and category if needed
        if (!categoryInput.value) {
            // Assuming category is required
            document.getElementById('category-error')?.classList.remove('hidden'); // Ensure you have a category-error element
            categoryInput.classList.add('form-error');
             isValid = false;
        }
         if (typeInput.value !== 'income' && typeInput.value !== 'expense') {
             console.error("Invalid transaction type selected.");
             // Add error message display for type if you have one
             isValid = false;
        }


        if (!isValid) {
            // Find the first invalid input and focus it for accessibility
            const firstError = transactionForm.querySelector('.form-error');
            firstError?.focus();
            return;
        }

        // Create/Update record object
        const recordData = {
            id: id || Date.now().toString(), // Generate new ID if not editing
            description: descriptionInput.value.trim(),
            amount: parseFloat(parseFloat(amountInput.value).toFixed(2)),
            currency: currencyInput.value,
            type: typeInput.value,
            category: categoryInput.value,
            date: dateInput.value,
            notes: notesInput.value.trim()
        };

        // Update state
        if (id) {
            // Editing existing record
            const index = state.transactions.findIndex(t => t.id === id);
            if (index !== -1) {
                state.transactions[index] = recordData;
            } else {
                 console.error(`Could not find record with ID ${id} to update.`);
                 // Optionally handle this error, maybe add as new?
                 state.transactions.push(recordData); // Add as new if update failed
            }
        } else {
            // Adding new record
            state.transactions.push(recordData);
        }

        saveState();
        navigateTo('records'); // Navigate back to records list
    });


    // Listener for the "Add Category" button *within* the form
    const addCategoryBtnInForm = document.getElementById('add-category-btn');
    if (addCategoryBtnInForm) {
        addCategoryBtnInForm.addEventListener('click', () => {
            const newCat = prompt('Enter new category name:');
            if (newCat && newCat.trim() !== '') {
                const cleanCat = newCat.trim();
                if (!state.categories.includes(cleanCat)) {
                    state.categories.push(cleanCat);
                    state.categories.sort(); // Keep categories sorted
                    saveState();

                    // Re-populate the category dropdown and select the new one
                    const recordId = document.getElementById('record-id').value; // Get current record ID if editing
                    setupAddEditForm(recordId); // Re-run setup to update dropdown
                    document.getElementById('category').value = cleanCat; // Select the newly added category
                } else {
                     alert(`Category "${cleanCat}" already exists.`);
                }
            }
        });
    }

    // Event delegation for Edit/Delete buttons in Records page
    function handleRecordAction(event) {
        const editButton = event.target.closest('.edit-record');
        const deleteButton = event.target.closest('.delete-record');

        if (editButton) {
            const recordId = editButton.dataset.id;
            navigateTo('add', recordId);
        }

        if (deleteButton) {
            const recordId = deleteButton.dataset.id;
            const transactionToDelete = state.transactions.find(t => t.id === recordId);

            if (transactionToDelete) {
                showConfirmationModal(
                    'Delete Transaction',
                    `Are you sure you want to delete the transaction: "${transactionToDelete.description}"? This action cannot be undone.`,
                    () => {
                        state.transactions = state.transactions.filter(t => t.id !== recordId);
                        saveState();
                        renderRecords(); // Re-render the records page
                    }
                );
            }
        }
    }

    // Attach listeners using event delegation
    const recordsPage = document.getElementById('records-page');
    if (recordsPage) {
        recordsPage.addEventListener('click', handleRecordAction);
    }


    function renderSettings() {
        // 1. Categories
        settingsElements.categoriesContainer.innerHTML = ''; // Clear existing
        state.categories.forEach(cat => {
            const tag = document.createElement('div');
            tag.className = 'category-tag';
            tag.setAttribute('data-category', cat);

            const span = document.createElement('span');
            span.textContent = cat;
            tag.appendChild(span);

            // Only add delete button for non-default categories
            if (!DEFAULT_CATEGORIES.includes(cat)) {
                tag.classList.add('category-tag-deletable');
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'category-tag-delete-btn';
                button.setAttribute('data-category', cat);
                button.setAttribute('aria-label', `Remove ${cat} category`);
                button.innerHTML = '<i data-feather="x" class="w-4 h-4" aria-hidden="true"></i>';
                tag.appendChild(button);
            }
            settingsElements.categoriesContainer.appendChild(tag);
        });
        feather.replace(); // Update icons

        // 2. Budget - Update input and suffix
        settingsElements.monthlyBudgetInput.value = state.monthlyBudget.toFixed(2);
        if (settingsElements.budgetCurrencySuffix) {
             settingsElements.budgetCurrencySuffix.textContent = state.settings.baseCurrency;
        }


        // 3. Currency
        settingsElements.baseCurrency.value = state.settings.baseCurrency;
    }


    // Settings Page - Add Category Button
    settingsElements.addCategoryButton.addEventListener('click', () => {
        const newCat = settingsElements.newCategoryInput.value.trim();
        settingsElements.categoryError.classList.add('hidden');
        settingsElements.newCategoryInput.classList.remove('form-error');

        if (newCat === '') {
            settingsElements.categoryError.textContent = 'Category name cannot be empty.';
            settingsElements.categoryError.classList.remove('hidden');
            settingsElements.newCategoryInput.classList.add('form-error').focus();
            return;
        }
        if (state.categories.some(c => c.toLowerCase() === newCat.toLowerCase())) {
             settingsElements.categoryError.textContent = 'Category already exists.';
             settingsElements.categoryError.classList.remove('hidden');
             settingsElements.newCategoryInput.classList.add('form-error').focus();
             return;
        }


        state.categories.push(newCat);
        state.categories.sort((a, b) => a.localeCompare(b)); // Sort case-insensitively
        saveState();
        renderSettings(); // Re-render the category list
        settingsElements.newCategoryInput.value = ''; // Clear input
        settingsElements.newCategoryInput.focus(); // Keep focus for adding more
    });

    // Settings Page - Delete Category Button (Event Delegation)
    settingsElements.categoriesContainer.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('.category-tag-delete-btn');
        if (deleteButton) {
            const categoryToDelete = deleteButton.getAttribute('data-category');

            // Cannot delete default categories (already checked in render, but good safeguard)
            if (DEFAULT_CATEGORIES.includes(categoryToDelete)) {
                alert(`Cannot delete default category: ${categoryToDelete}`);
                return;
            }

            // Cannot delete category if used in transactions
            if (state.transactions.some(t => t.category === categoryToDelete)) {
                alert(`Cannot delete category "${categoryToDelete}" because it is used in existing transactions. Please re-assign or delete those transactions first.`);
                return;
            }

            // Confirmation
            showConfirmationModal(
                'Delete Category',
                `Are you sure you want to permanently delete the category "${categoryToDelete}"?`,
                () => {
                    state.categories = state.categories.filter(cat => cat !== categoryToDelete);
                    saveState();
                    renderSettings(); // Re-render the list
                }
            );
        }
    });


    settingsElements.saveBudgetButton.addEventListener('click', () => {
        const budgetStr = settingsElements.monthlyBudgetInput.value;
        settingsElements.budgetError.classList.add('hidden');
        settingsElements.monthlyBudgetInput.classList.remove('form-error');

        if (!validateAmount(budgetStr) || parseFloat(budgetStr) < 0) {
            settingsElements.budgetError.classList.remove('hidden');
            settingsElements.monthlyBudgetInput.classList.add('form-error').focus();
            return;
        }

        // Saves the budget in the CURRENT base currency
        state.monthlyBudget = parseFloat(parseFloat(budgetStr).toFixed(2));
        saveState();
        alert('Monthly Budget Saved!');

        // If dashboard is active, re-render it to show updated budget progress
        if (!document.getElementById('dashboard-page').classList.contains('hidden')) {
            renderDashboard();
        }
    });

    // Settings Page - Save Currency Button (Includes Budget Conversion)
    settingsElements.saveCurrencyButton.addEventListener('click', () => {
        const oldBaseCurrency = state.settings.baseCurrency;
        const newBaseCurrency = settingsElements.baseCurrency.value;

        if (oldBaseCurrency !== newBaseCurrency) {
            // Convert the budget if it exists
            if (state.monthlyBudget > 0) {
                state.monthlyBudget = convertCurrency(
                    state.monthlyBudget,
                    oldBaseCurrency,
                    newBaseCurrency
                );
                 // Round to 2 decimal places after conversion
                state.monthlyBudget = parseFloat(state.monthlyBudget.toFixed(2));
            }

            // Update the setting
            state.settings.baseCurrency = newBaseCurrency;
            saveState();
            alert('Base Currency Settings Saved! Budget has been converted.');

            // Re-render settings to show the updated budget number and suffix
            renderSettings();

            // Re-render dashboard if it's visible
            if (!document.getElementById('dashboard-page').classList.contains('hidden')) {
                renderDashboard();
            }
        } else {
             alert('Base currency is already set to this value.');
        }
    });


    // Settings Page - Reset Data Button
    document.getElementById('reset-data').addEventListener('click', () => {
        showConfirmationModal(
            'Reset All Data',
            'WARNING: This will permanently delete ALL your transactions, custom categories, and settings (budget, currency). Are you absolutely sure?',
            () => {
                localStorage.removeItem(STORAGE_KEY); // Clear storage
                // Reset state to initial defaults
                state = {
                    transactions: [],
                    categories: [...DEFAULT_CATEGORIES],
                    monthlyBudget: 0,
                    settings: { baseCurrency: 'RWF' }, // Back to default currency
                    currentSort: { column: 'date', direction: 'desc' }
                };
                saveState(); // Save the cleared state (optional, but good practice)
                navigateTo('dashboard'); // Go to dashboard
                alert('All data has been reset.');
            }
        );
    });

     // Settings Page - Export JSON Data Button
    document.getElementById('export-data').addEventListener('click', () => {
        try {
            const data = JSON.stringify(state, null, 2); // Pretty print JSON
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // Add date to filename for clarity
             const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            a.download = `penniwise_backup_${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Could not export data.');
        }
    });

    // Records Page - Export CSV Button
    document.getElementById('export-btn').addEventListener('click', () => {
        // Get the currently filtered and sorted records from the state function
        const recordsToExport = filterAndSortRecords(true); // Get the array

        if (recordsToExport.length === 0) {
            alert('No records to export.');
            return;
        }

        // Define headers
        const headers = ['Date', 'Description', 'Amount', 'Currency', 'Type', 'Category', 'Notes'];

        // Function to safely format CSV fields (handle quotes and commas)
        const formatCsvField = (field) => {
             const stringField = String(field ?? ''); // Ensure it's a string, handle null/undefined
             // Escape double quotes by doubling them, and enclose in double quotes if it contains comma, newline, or double quote
             if (stringField.includes(',') || stringField.includes('\n') || stringField.includes('"')) {
                 return `"${stringField.replace(/"/g, '""')}"`;
             }
             return stringField;
         };

        // Map records to CSV rows
        const csvRows = [
            headers.join(','), // Header row
            ...recordsToExport.map(t => [
                formatCsvField(t.date),
                formatCsvField(t.description),
                t.amount, // Amount doesn't usually need quotes unless it contains commas (unlikely for numbers)
                formatCsvField(t.currency),
                formatCsvField(t.type),
                formatCsvField(t.category),
                formatCsvField(t.notes)
            ].join(',')) // Join fields in the row
        ];

        // Join rows with newline characters
        const csv = csvRows.join('\n');

        // Create and trigger download
        try {
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            a.download = `penniwise_records_${dateStr}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
             console.error('Error exporting CSV:', error);
             alert('Could not export records as CSV.');
        }
    });


    // ----------------------------------------------------
    // 8. Confirmation Modal
    // ----------------------------------------------------
    let currentModalAction = null;
    let focusedElementBeforeModal = null; // For accessibility

    function showConfirmationModal(title, message, onConfirm) {
        focusedElementBeforeModal = document.activeElement; // Store focus
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        currentModalAction = onConfirm;
        modal.classList.remove('hidden');
        modalConfirmBtn.focus(); // Focus the confirm button
    }

    function hideConfirmationModal() {
        modal.classList.add('hidden');
        currentModalAction = null;
        // Restore focus to the element that opened the modal
        if (focusedElementBeforeModal) {
            focusedElementBeforeModal.focus();
            focusedElementBeforeModal = null;
        }
    }

    modalCancelBtn.addEventListener('click', hideConfirmationModal);
    modalConfirmBtn.addEventListener('click', () => {
        if (typeof currentModalAction === 'function') {
            currentModalAction();
        }
        hideConfirmationModal();
    });
     // Close modal on Escape key press
    modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideConfirmationModal();
        }
    });
     // Close modal if backdrop is clicked (optional)
     modal.addEventListener('click', (e) => {
         if (e.target === modal) { // Check if the click was directly on the backdrop
             hideConfirmationModal();
         }
     });



    // ----------------------------------------------------
    // 9. Initialize Application
    // ----------------------------------------------------

    const importBtn = document.getElementById('import-btn');
    const importInput = document.getElementById('import-data');

    if (importBtn && importInput) {
        importBtn.addEventListener('click', () => {
            const file = importInput.files[0];
            if (!file) {
                alert('Please select a .json file to import.');
                return;
            }
            if (file.type !== 'application/json') {
                alert('Invalid file type. Please select a .json file.');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedData = JSON.parse(event.target.result);

                    // Basic validation of imported data structure
                    if (importedData && typeof importedData === 'object' &&
                        Array.isArray(importedData.transactions) &&
                        Array.isArray(importedData.categories) &&
                        importedData.settings && typeof importedData.settings.baseCurrency === 'string')
                    {
                        showConfirmationModal(
                            'Import Data Confirmation',
                            'Importing this file will overwrite all current data (transactions, categories, budget, settings). Are you absolutely sure you want to proceed?',
                            () => {
                                // Overwrite state with imported data, providing defaults for missing optional parts
                                state.transactions = importedData.transactions || [];
                                state.categories = importedData.categories || [...DEFAULT_CATEGORIES];
                                state.monthlyBudget = importedData.monthlyBudget || 0;
                                state.settings = {
                                    baseCurrency: importedData.settings.baseCurrency || 'RWF' // Default if missing
                                };
                                state.currentSort = importedData.currentSort || { column: 'date', direction: 'desc' };

                                // Basic validation/migration for transactions (like ensuring currency exists)
                                const base = state.settings.baseCurrency;
                                state.transactions = state.transactions.map(t => ({
                                     ...t,
                                     id: t.id || Date.now().toString() + Math.random(), // Ensure ID exists
                                     currency: t.currency || base // Ensure currency exists
                                 }));


                                saveState();
                                alert('Data imported successfully!');
                                importInput.value = ''; // Clear file input
                                navigateTo('dashboard'); // Refresh view
                            }
                        );
                    } else {
                        alert('Invalid data structure in the selected JSON file. Required properties might be missing or in the wrong format.');
                    }
                } catch (error) {
                    console.error('Error parsing JSON file:', error);
                    alert(`Error importing data. The file may be corrupt or not valid JSON.\nDetails: ${error.message}`);
                }
            };
             reader.onerror = () => {
                 console.error('Error reading file:', reader.error);
                 alert('Could not read the selected file.');
             };
            reader.readAsText(file);
        });
    }

    loadState(); // Load existing data
    applyTheme(document.documentElement.classList.contains('dark')); // Apply theme and Chart.js defaults
    navigateTo('dashboard'); // Navigate to initial page
    feather.replace(); // Initial icon replacement

}); // End DOMContentLoaded
