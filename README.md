💰 Penniwise: Student Budget Buddy

Penniwise is a lightweight, single-page application (SPA) designed to help students track income, manage expenses, and stick to a monthly budget. It provides a clean dashboard view of key financial metrics and a dedicated section for filtering, sorting, and managing all transaction records.

✨ Features

Dashboard Overview

Key Financial Stats: Instantly view Total Balance, Income, and Expenses.

Budget Tracking: Monitor Monthly Budget Progress, including a visual progress bar and remaining budget calculation.

Visual Spending Chart: A weekly bar chart (powered by Chart.js) dynamically visualizes spending over the last seven days.

Category Breakdown: See a quick summary of expenses grouped by category.

Transaction Management

Add/Edit Transactions: Easily input new income or expense records, including amount, type, category, and date.

Records Table: View all transactions in a sortable, filterable table view.

Filtering: Filter records by Category, Date Range (Week, Month, Year, All Time), and Search Term.

Sorting: Sort records by Date, Amount, Description, or Category.

Settings & Data

Custom Categories: Add or remove custom expense categories (default categories are protected).

Monthly Budget Goal: Set and adjust the monthly spending limit.

Currency: Select the base currency for display.

Data Management: Securely Export the transaction data as a .json file for backup or a .csv file for external analysis, or Reset All Data.

🛠️ Technology Stack

Penniwise is built entirely using vanilla frontend technologies:

HTML5: Semantic structure and organization.

CSS3: Styling based on a utility-first approach (simulating Tailwind CSS styles internally).

JavaScript (ES6+): Application logic, state management, and DOM manipulation.

Libraries:

Chart.js: Used for rendering the responsive "Last 7 Days Spending" bar chart.

Feather Icons: Lightweight SVG icons used throughout the interface.

State Management: Data is persisted using the browser's Local Storage.

🚀 How to Run Locally

Since Penniwise is a single-page HTML application with no server-side dependencies, setup is quick:

Clone the Repository (or download the files): (Assumes you have the index.html, style.css, and script.js files.)

Open the HTML File: Navigate to the project directory and open the index.html file directly in any modern web browser (e.g., Chrome, Firefox).

💡 Usage Guide

Getting Started

Add your first transaction: Click the "Add Transaction" link in the navigation or on the dashboard. Enter a description, amount, select "Income" or "Expense," and a date.

Set a Monthly Budget: Navigate to the "Settings" page to set your target monthly spending amount.

Troubleshooting the Chart

If the "Last 7 Days Spending" chart does not appear after adding transactions:

Check Dates: Ensure you have added expenses dated within the last 7 calendar days.

Verify Console: Open your browser's developer console (F12) for any JavaScript errors related to Chart.js. (The current script uses Chart.js correctly, so data input is the most likely issue.)
