
const db = new Dexie("OfflineAppDB");
db.version(2).stores({
    logs: "++id, branchName, dateOfRequest, dateOfDelivery, materialCreated, channelOfRequest, status, surveyCompleted, cost, surveyRating",
    branches: "code, name, regionalManager, areaManager"
});

async function populateBranchList() {
    const branches = await db.branches.toArray();
    const datalist = document.getElementById("branchList");
    datalist.innerHTML = branches.map(b => `<option value="${b.name}">`).join("");
}

const filters = { status: "", channel: "", branch: "" };
let currentPage = 1;
const itemsPerPage = 10;
let statusChart, branchChart;

function toggleSurveyRating() {
    const show = this.value === "Yes";
    document.getElementById("surveyRating").style.display = show ? "block" : "none";
    document.getElementById("ratingLabel").style.display = show ? "block" : "none";
}

async function renderTable() {
    const logs = await db.logs.toArray();
    const output = document.getElementById("output");

    let filtered = logs.filter(l => {
        return (!filters.status || l.status === filters.status) &&
               (!filters.channel || l.channelOfRequest === filters.channel) &&
               (!filters.branch || l.branchName.toLowerCase().includes(filters.branch.toLowerCase()));
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * itemsPerPage;
    const pageLogs = filtered.slice(start, start + itemsPerPage);

    let html = "<table border='1'><tr><th>#</th><th>Branch</th><th>Request</th><th>Delivery</th><th>Material</th><th>Channel</th><th>Status</th><th>Survey</th><th>Cost</th><th>Rating</th><th>Actions</th></tr>";
    if (pageLogs.length === 0) {
        html += "<tr><td colspan='11'>No records</td></tr>";
    } else {
        pageLogs.forEach((l, i) => {
            html += `<tr>
                <td>${start + i + 1}</td>
                <td>${l.branchName}</td>
                <td>${l.dateOfRequest}</td>
                <td>${l.dateOfDelivery}</td>
                <td>${l.materialCreated || ''}</td>
                <td>${l.channelOfRequest || ''}</td>
                <td>${l.status || ''}</td>
                <td>${l.surveyCompleted || ''}</td>
                <td>${l.cost || ''}</td>
                <td>${l.surveyRating || ''}</td>
                <td>
                    <button onclick="editRecord(${l.id})">Edit</button>
                    <button onclick="deleteRecord(${l.id})">Delete</button>
                </td></tr>`;
        });
    }
    html += "</table>";
    output.innerHTML = html;

    document.getElementById("pageInfo").textContent = `${currentPage} / ${totalPages}`;
    document.getElementById("prevPage").disabled = currentPage === 1;
    document.getElementById("nextPage").disabled = currentPage === totalPages;

    renderCharts(filtered);
}

async function renderBranchTable() {
    const branches = await db.branches.toArray();
    const out = document.getElementById("branchOutput");
    let html = "<table border='1'><tr><th>Code</th><th>Name</th><th>Regional Manager</th><th>Area Manager</th><th>Actions</th></tr>";
    if (branches.length === 0) {
        html += "<tr><td colspan='5'>No branches</td></tr>";
    } else {
        branches.forEach((b) => {
            html += `<tr>
                <td>${b.code}</td>
                <td>${b.name}</td>
                <td>${b.regionalManager}</td>
                <td>${b.areaManager}</td>
                <td>
                    <button onclick="editBranch('${b.code}')">Edit</button>
                    <button onclick="deleteBranch('${b.code}')">Delete</button>
                </td></tr>`;
        });
    }
    html += "</table>";
    out.innerHTML = html;
}

document.getElementById("logForm").addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());
    if (new Date(data.dateOfRequest) > new Date(data.dateOfDelivery)) {
        alert("Request date must be before or equal to delivery date.");
        return;
    }
    if (form.dataset.editing) {
        await db.logs.update(Number(form.dataset.editing), data);
        form.removeAttribute("data-editing");
    } else {
        await db.logs.add(data);
    }
    form.reset();
    closeModal("logModal");
    renderTable();
});

document.getElementById("branchForm").addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());
    await db.branches.put(data);
    form.reset();
    closeModal("branchModal");
    populateBranchList();
    renderBranchTable();
});

async function editRecord(id) {
    const log = await db.logs.get(id);
    const form = document.getElementById("logForm");
    for (let key in log) {
        if (form.elements[key]) form.elements[key].value = log[key];
    }
    form.dataset.editing = id;
    document.getElementById("logModal").style.display = "block";
    toggleSurveyRating.call(form["surveyCompleted"]);
}

async function deleteRecord(id) {
    if (confirm("Delete this record?")) {
        await db.logs.delete(id);
        renderTable();
    }
}

async function editBranch(code) {
    const b = await db.branches.get(code);
    const form = document.getElementById("branchForm");
    for (let key in b) {
        if (form.elements[key]) form.elements[key].value = b[key];
    }
    document.getElementById("branchModal").style.display = "block";
}

async function deleteBranch(code) {
    if (confirm("Delete this branch?")) {
        await db.branches.delete(code);
        renderBranchTable();
        populateBranchList();
    }
}

function exportLogsToExcel() {
    db.logs.toArray().then(logs => {
        const worksheet = XLSX.utils.json_to_sheet(logs);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Logs");
        XLSX.writeFile(workbook, "OfflineLogs.xlsx");
    });
}

function importLogsFromExcel(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length > 0) {
            db.logs.bulkPut(jsonData).then(() => {
                alert("Logs imported successfully");
                renderTable();
            });
        }
    };
    reader.readAsArrayBuffer(file);
}

function exportLogsToPDF() {
    const table = document.querySelector('#output table');
    if (!table) return;
    html2canvas(table).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jspdf.jsPDF('l', 'pt', 'a4');
        const width = pdf.internal.pageSize.getWidth();
        const height = (canvas.height * width) / canvas.width;
        pdf.addImage(imgData, 'PNG', 10, 10, width - 20, height);
        pdf.save('OfflineLogs.pdf');
    });
}

function renderCharts(logs) {
    const statusCounts = {};
    const branchCounts = {};
    logs.forEach(l => {
        statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
        branchCounts[l.branchName] = (branchCounts[l.branchName] || 0) + 1;
    });

    const statusCtx = document.getElementById('statusChart').getContext('2d');
    const branchCtx = document.getElementById('branchChart').getContext('2d');

    if (statusChart) statusChart.destroy();
    if (branchChart) branchChart.destroy();

    statusChart = new Chart(statusCtx, {
        type: 'pie',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{ data: Object.values(statusCounts), backgroundColor: ['#4a90e2', '#e94e77', '#7ed321', '#f8e71c', '#50e3c2'] }]
        }
    });

    branchChart = new Chart(branchCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(branchCounts),
            datasets: [{ label: 'Logs', data: Object.values(branchCounts), backgroundColor: '#4a90e2' }]
        },
        options: { scales: { y: { beginAtZero: true } } }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("surveyCompleted").addEventListener("change", toggleSurveyRating);
    document.getElementById('filterStatus').addEventListener('change', e => { filters.status = e.target.value; currentPage = 1; renderTable(); });
    document.getElementById('filterChannel').addEventListener('change', e => { filters.channel = e.target.value; currentPage = 1; renderTable(); });
    document.getElementById('filterBranch').addEventListener('input', e => { filters.branch = e.target.value; currentPage = 1; renderTable(); });
    document.getElementById('prevPage').addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTable(); } });
    document.getElementById('nextPage').addEventListener('click', () => { currentPage++; renderTable(); });
    document.getElementById('darkToggle').addEventListener('click', () => { document.body.classList.toggle('dark'); });
    document.getElementById('navToggle').addEventListener('click', () => {
        document.querySelector('nav').classList.toggle('collapsed');
    });

    if (window.innerWidth >= 600) {
        document.querySelector('nav').classList.remove('collapsed');
    }
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 600) {
            document.querySelector('nav').classList.remove('collapsed');
        }
    });
    populateBranchList();
    renderTable();
    renderBranchTable();
});
