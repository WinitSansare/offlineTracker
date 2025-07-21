
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

function toggleSurveyRating() {
    const show = this.value === "Yes";
    document.getElementById("surveyRating").style.display = show ? "block" : "none";
    document.getElementById("ratingLabel").style.display = show ? "block" : "none";
}

async function renderTable() {
    const logs = await db.logs.toArray();
    const output = document.getElementById("output");
    let html = "<table border='1'><tr><th>#</th><th>Branch</th><th>Request</th><th>Delivery</th><th>Material</th><th>Channel</th><th>Status</th><th>Survey</th><th>Cost</th><th>Rating</th><th>Actions</th></tr>";
    if (logs.length === 0) {
        html += "<tr><td colspan='11'>No records</td></tr>";
    } else {
        logs.forEach((l, i) => {
            html += `<tr>
                <td>${i + 1}</td>
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

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("surveyCompleted").addEventListener("change", toggleSurveyRating);
    populateBranchList();
    renderTable();
    renderBranchTable();
});
