// EMPLOYEE MANAGEMENT SYSTEM
// Beginner-friendly Node.js project

const { createInterface } = require("node:readline/promises");
const { stdin, stdout } = require("node:process");
const { readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");

// For taking input from the terminal
const rl = createInterface({ input: stdin, output: stdout });

// Employee data will be saved in this JSON file
const DATA_FILE = path.join(__dirname, "employees.json");

// Format salary in Indian Rupees
function formatSalary(salary) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(salary);
}

// Employee class
class Employee {
    constructor(id, name, email, department, salary) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.department = department;
        this.salary = salary;
    }
}

// Main employee management class
class EmployeeManager {
    constructor() {
        this.employees = [];
    }

    // Load employees from the JSON file
    async loadEmployees() {
        try {
            const data = await readFile(DATA_FILE, "utf8");
            const savedEmployees = JSON.parse(data);

            this.employees = savedEmployees.map(
                ({ id, name, email, department, salary }) =>
                    new Employee(id, name, email, department, salary)
            );
        } catch (error) {
            if (error.code === "ENOENT") {
                this.employees = [];
                await this.saveEmployees();
            } else {
                throw error;
            }
        }
    }

    // Save employees to the JSON file
    async saveEmployees() {
        const data = JSON.stringify(this.employees, null, 2);
        await writeFile(DATA_FILE, data, "utf8");
    }

    // Generate the next employee ID
    getNextId() {
        return this.employees.reduce(
            (highest, employee) => Math.max(highest, employee.id),
            0
        ) + 1;
    }

    // Add an employee
    async addEmployee(employee) {
        this.employees.push(employee);
        await this.saveEmployees();
    }

    // Find an employee by ID
    findEmployee(id) {
        return this.employees.find(employee => employee.id === id);
    }

    // Update an employee
    async updateEmployee(id, updates) {
        const index = this.employees.findIndex(
            employee => employee.id === id
        );

        if (index === -1) {
            return false;
        }

        this.employees[index] = new Employee(
            id,
            updates.name,
            updates.email,
            updates.department,
            updates.salary
        );

        await this.saveEmployees();
        return true;
    }

    // Delete an employee
    async deleteEmployee(id) {
        const index = this.employees.findIndex(
            employee => employee.id === id
        );

        if (index === -1) {
            return false;
        }

        this.employees.splice(index, 1);
        await this.saveEmployees();
        return true;
    }

    // Search employees by name or email
    searchEmployees(searchText) {
        const text = searchText.toLowerCase();

        return this.employees.filter(employee =>
            employee.name.toLowerCase().includes(text) ||
            employee.email.toLowerCase().includes(text)
        );
    }

    // Filter employees by department
    filterByDepartment(department) {
        return this.employees.filter(employee =>
            employee.department.toLowerCase().includes(
                department.toLowerCase()
            )
        );
    }

    // Calculate employee statistics
    getStatistics() {
        const totalSalary = this.employees.reduce(
            (total, employee) => total + employee.salary,
            0
        );

        const departmentCounts = this.employees.reduce(
            (counts, employee) => {
                counts[employee.department] =
                    (counts[employee.department] || 0) + 1;

                return counts;
            },
            {}
        );

        return {
            totalEmployees: this.employees.length,
            totalSalary,
            averageSalary: this.employees.length === 0
                ? 0
                : totalSalary / this.employees.length,
            departmentCounts
        };
    }
}

// Input validation helpers
async function askNonEmpty(question) {
    while (true) {
        const answer = (await rl.question(question)).trim();

        if (answer !== "") {
            return answer;
        }

        console.log("This field cannot be empty. Try again.");
    }
}

async function askId() {
    while (true) {
        const answer = await rl.question("Enter employee ID: ");
        const id = Number(answer);

        if (Number.isInteger(id) && id > 0) {
            return id;
        }

        console.log("Please enter a valid positive ID.");
    }
}

async function askSalary(question, currentSalary) {
    while (true) {
        const answer = await rl.question(question);

        // During an update, pressing Enter keeps the old salary
        if (answer.trim() === "" && currentSalary !== undefined) {
            return currentSalary;
        }

        const salary = Number(answer);

        if (answer.trim() !== "" &&
            Number.isFinite(salary) &&
            salary >= 0) {
            return salary;
        }

        console.log("Enter a valid salary of 0 or more.");
    }
}

function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function emailExists(email, employees, ignoredId = null) {
    return employees.some(employee =>
        employee.email.toLowerCase() === email.toLowerCase() &&
        employee.id !== ignoredId
    );
}

// Display employees
function displayEmployees(employees) {
    if (employees.length === 0) {
        console.log("\nNo employees found.");
        return;
    }

    console.log("\n========== EMPLOYEE LIST ==========");

    employees.forEach(employee => {
        console.log("-----------------------------------");
        console.log(`ID         : ${employee.id}`);
        console.log(`Name       : ${employee.name}`);
        console.log(`Email      : ${employee.email}`);
        console.log(`Department : ${employee.department}`);
        console.log(`Salary     : ${formatSalary(employee.salary)}`);
    });

    console.log("-----------------------------------");
}

// Main program
async function main() {
    const manager = new EmployeeManager();

    try {
        await manager.loadEmployees();
        console.log("\nWelcome to Employee Management System!");

        let running = true;

        while (running) {
            console.log(`
========== MAIN MENU ==========
1. Add Employee
2. View All Employees
3. Search Employee
4. Update Employee
5. Delete Employee
6. Filter by Department
7. View Statistics
8. Exit
`);

            const choice = (await rl.question("Choose an option (1-8): ")).trim();

            try {
                switch (choice) {

                    // ADD EMPLOYEE
                    case "1": {
                        const name = await askNonEmpty("Enter name: ");
                        const email = await askNonEmpty("Enter email: ");

                        if (!validEmail(email)) {
                            console.log("Invalid email format.");
                            break;
                        }

                        if (emailExists(email, manager.employees)) {
                            console.log("This email already exists.");
                            break;
                        }

                        const department = await askNonEmpty(
                            "Enter department: "
                        );

                        const salary = await askSalary("Enter salary: ");

                        const employee = new Employee(
                            manager.getNextId(),
                            name,
                            email,
                            department,
                            salary
                        );

                        await manager.addEmployee(employee);
                        console.log("Employee added successfully!");
                        break;
                    }

                    // VIEW ALL EMPLOYEES
                    case "2": {
                        displayEmployees(manager.employees);
                        break;
                    }

                    // SEARCH EMPLOYEE
                    case "3": {
                        const searchText = await askNonEmpty(
                            "Enter employee name or email: "
                        );

                        const results = manager.searchEmployees(searchText);
                        displayEmployees(results);
                        break;
                    }

                    // UPDATE EMPLOYEE
                    case "4": {
                        const id = await askId();
                        const employee = manager.findEmployee(id);

                        if (!employee) {
                            console.log("Employee not found.");
                            break;
                        }

                        console.log("Press Enter to keep the current value.");

                        const nameInput = await rl.question(
                            `Name (${employee.name}): `
                        );

                        const emailInput = await rl.question(
                            `Email (${employee.email}): `
                        );

                        const departmentInput = await rl.question(
                            `Department (${employee.department}): `
                        );

                        const salary = await askSalary(
                            `Salary (${employee.salary}): `,
                            employee.salary
                        );

                        const name = nameInput.trim() || employee.name;
                        const email = emailInput.trim() || employee.email;
                        const department =
                            departmentInput.trim() || employee.department;

                        if (!validEmail(email)) {
                            console.log("Invalid email format.");
                            break;
                        }

                        if (emailExists(email, manager.employees, id)) {
                            console.log("Another employee already uses this email.");
                            break;
                        }

                        const success = await manager.updateEmployee(id, {
                            name,
                            email,
                            department,
                            salary
                        });

                        if (success) {
                            console.log("Employee updated successfully!");
                        }

                        break;
                    }

                    // DELETE EMPLOYEE
                    case "5": {
                        const id = await askId();
                        const employee = manager.findEmployee(id);

                        if (!employee) {
                            console.log("Employee not found.");
                            break;
                        }

                        const confirm = (
                            await rl.question(
                                `Delete ${employee.name}? Type yes to confirm: `
                            )
                        ).trim().toLowerCase();

                        if (confirm === "yes") {
                            await manager.deleteEmployee(id);
                            console.log("Employee deleted successfully!");
                        } else {
                            console.log("Deletion cancelled.");
                        }

                        break;
                    }

                    // FILTER BY DEPARTMENT
                    case "6": {
                        const department = await askNonEmpty(
                            "Enter department name: "
                        );

                        const results = manager.filterByDepartment(department);
                        displayEmployees(results);
                        break;
                    }

                    // STATISTICS
                    case "7": {
                        const stats = manager.getStatistics();

                        console.log("\n========== STATISTICS ==========");
                        console.log(`Total employees: ${stats.totalEmployees}`);
                        console.log(
                            `Total salary: ${formatSalary(stats.totalSalary)}`
                        );
                        console.log(
                            `Average salary: ${formatSalary(stats.averageSalary)}`
                        );

                        console.log("\nEmployees by department:");

                        if (Object.keys(stats.departmentCounts).length === 0) {
                            console.log("No department data available.");
                        } else {
                            Object.entries(stats.departmentCounts).forEach(
                                ([department, count]) => {
                                    console.log(`${department}: ${count}`);
                                }
                            );
                        }

                        break;
                    }

                    // EXIT
                    case "8": {
                        running = false;
                        console.log("Thank you for using the system!");
                        break;
                    }

                    default: {
                        console.log("Invalid choice. Please select 1 to 8.");
                    }
                }
            } catch (error) {
                console.log("Something went wrong:", error.message);
            }
        }
    } catch (error) {
        console.log("Could not start the application:", error.message);
    } finally {
        rl.close();
    }
}

main();