/**
 * MediDesk - Modern Clinical Web Dashboard Logic
 */

// Global State
let currentUser = { id: "doc-123", role: "admin" }; // Toggle role: "admin" or "doctor"
let activePatientId = null;

// Mock Local Database (Connects seamlessly to Supabase API)
let patientsData = [
  { id: "p1", name: "Omar Ahmad", dob: "1988-04-12", phone: "+970599000111" },
  { id: "p2", name: "Sara Hassan", dob: "1995-11-23", phone: "+970599000222" }
];

let globalLabCatalog = [
  { id: "l1", name: "Fasting Blood Glucose", min: 70, max: 99, unit: "mg/dL", is_global: true },
  { id: "l2", name: "Hemoglobin A1c", min: 4.0, max: 5.6, unit: "%", is_global: true },
  { id: "l3", name: "Serum Ferritin", min: 30, max: 400, unit: "ng/mL", is_global: true }
];

let doctorCustomLabs = [
  { id: "l4", name: "Custom Doc Biomarker", min: 10, max: 50, unit: "U/L", is_global: false, created_by_doctor_id: "doc-123" }
];

let patientLabResults = [
  { id: "r1", patient_id: "p1", test_name: "Fasting Blood Glucose", result: "105", range: "70 - 99", unit: "mg/dL", test_date: "2026-08-10" }
];

// --- 1. DATE FORMATTING HELPER (DD/MM/YYYY) ---
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const [year, month, day] = dateString.split("-");
  if (!year || !month || !day) return dateString;
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}

// --- DOM INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  initAppLogo();
  setupNavigation();
  renderPatientsTable();
  renderLabCatalog();
  renderAdminLabs();
  setupFormListeners();
});

// --- LOGO & BRANDING MANAGEMENT ---
function initAppLogo() {
  const savedLogo = localStorage.getItem("medidesk_app_logo");
  if (savedLogo) {
    applyGlobalLogo(savedLogo);
  }
}

function applyGlobalLogo(base64Data) {
  const logoImgs = document.querySelectorAll(".app-logo-img, #login-logo-img, #admin-logo-img");
  const placeholders = document.querySelectorAll(".logo-placeholder-icon, #logo-placeholder-icon");

  logoImgs.forEach(img => {
    img.src = base64Data;
    img.classList.remove("hidden");
  });

  placeholders.forEach(icon => icon.classList.add("hidden"));
}

document.getElementById("save-logo-btn").addEventListener("click", () => {
  const fileInput = document.getElementById("logo-file-input");
  if (fileInput.files && fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const logoDataUrl = e.target.result;
      localStorage.setItem("medidesk_app_logo", logoDataUrl);
      applyGlobalLogo(logoDataUrl);
      alert("App logo updated globally!");
    };
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    alert("Please select an image file first.");
  }
});

// --- NAVIGATION & NAVIGATION RESPONSIVENESS ---
function setupNavigation() {
  // Login Form Demo
  document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("app-screen").classList.remove("hidden");
  });

  // Logout Button
  document.getElementById("logout-btn").addEventListener("click", () => {
    document.getElementById("app-screen").classList.add("hidden");
    document.getElementById("login-screen").classList.remove("hidden");
  });

  // Navigation Tabs
  const navBtns = document.querySelectorAll(".nav-btn");
  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      navBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      document.querySelectorAll(".content-section").forEach(sec => sec.classList.add("hidden"));
      const targetSec = document.getElementById(btn.dataset.target);
      if (targetSec) targetSec.classList.remove("hidden");

      // Close mobile drawer
      document.getElementById("sidebar").classList.remove("mobile-open");
    });
  });

  // Mobile Menu Toggle Button
  document.getElementById("mobile-menu-toggle").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("mobile-open");
  });

  // Back to Patients view
  document.getElementById("back-to-patients").addEventListener("click", () => {
    document.getElementById("patient-detail-sec").classList.add("hidden");
    document.getElementById("patients-sec").classList.remove("hidden");
  });
}

// --- PATIENT MANAGEMENT & DELETE RECORD ---
function renderPatientsTable() {
  const tbody = document.getElementById("patients-list-body");
  tbody.innerHTML = "";

  patientsData.forEach(patient => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${patient.name}</strong></td>
      <td>${formatDate(patient.dob)}</td>
      <td>${patient.phone || 'N/A'}</td>
      <td><button class="btn btn-sm btn-primary" onclick="openPatientDetail('${patient.id}')">View Patient</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function openPatientDetail(patientId) {
  activePatientId = patientId;
  const patient = patientsData.find(p => p.id === patientId);
  if (!patient) return;

  document.getElementById("patient-detail-name").innerText = patient.name;
  document.getElementById("patient-detail-dob").innerText = formatDate(patient.dob);
  document.getElementById("patient-detail-phone").innerText = patient.phone || "N/A";

  renderPatientLabs(patientId);

  document.querySelectorAll(".content-section").forEach(sec => sec.classList.add("hidden"));
  document.getElementById("patient-detail-sec").classList.remove("hidden");
}

// Complete Patient Deletion with Cascade
document.getElementById("delete-patient-btn").addEventListener("click", () => {
  const patient = patientsData.find(p => p.id === activePatientId);
  if (!patient) return;

  const confirmDelete = confirm(`Are you sure you want to permanently delete record for "${patient.name}" and all associated lab results? This action cannot be undone.`);
  if (confirmDelete) {
    // 1. Remove patient's lab results
    patientLabResults = patientLabResults.filter(lab => lab.patient_id !== activePatientId);
    // 2. Remove patient record
    patientsData = patientsData.filter(p => p.id !== activePatientId);

    alert("Patient record completely deleted.");
    document.getElementById("back-to-patients").click();
    renderPatientsTable();
  }
});

// --- LAB CATALOG MANAGEMENT (GLOBAL VS DOCTOR-SPECIFIC) ---
function renderLabCatalog() {
  const tbody = document.getElementById("lab-catalog-body");
  tbody.innerHTML = "";

  const allLabs = [...globalLabCatalog, ...doctorCustomLabs];

  allLabs.forEach(lab => {
    const isDoctorOwn = !lab.is_global && lab.created_by_doctor_id === currentUser.id;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${lab.name}</strong></td>
      <td>${lab.min} - ${lab.max}</td>
      <td>${lab.unit}</td>
      <td><span class="badge">${lab.is_global ? 'Global' : 'Custom'}</span></td>
      <td>
        ${isDoctorOwn ? `<button class="btn btn-sm btn-danger-soft" onclick="deleteDoctorLab('${lab.id}')">Delete</button>` : '<span class="text-muted">System Global</span>'}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function deleteDoctorLab(labId) {
  if (confirm("Delete this custom lab test from your personal catalog?")) {
    doctorCustomLabs = doctorCustomLabs.filter(l => l.id !== labId);
    renderLabCatalog();
  }
}

// Admin Global Labs Management
function renderAdminLabs() {
  const tbody = document.getElementById("admin-labs-body");
  tbody.innerHTML = "";

  globalLabCatalog.forEach(lab => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${lab.name}</strong></td>
      <td>${lab.min}</td>
      <td>${lab.max}</td>
      <td>${lab.unit}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="editGlobalLab('${lab.id}')">Edit</button>
        <button class="btn btn-sm btn-danger-soft" onclick="deleteGlobalLab('${lab.id}')">Delete Globally</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function deleteGlobalLab(labId) {
  if (confirm("Warning: Deleting a global lab test removes it for ALL doctors. Continue?")) {
    globalLabCatalog = globalLabCatalog.filter(l => l.id !== labId);
    renderAdminLabs();
    renderLabCatalog();
  }
}

function editGlobalLab(labId) {
  const lab = globalLabCatalog.find(l => l.id === labId);
  if (!lab) return;

  document.getElementById("lab-modal-title").innerText = "Edit Global Lab Test";
  document.getElementById("lab-edit-id").value = lab.id;
  document.getElementById("lab-is-global").value = "true";
  document.getElementById("lab-name").value = lab.name;
  document.getElementById("lab-min").value = lab.min;
  document.getElementById("lab-max").value = lab.max;
  document.getElementById("lab-unit").value = lab.unit;

  document.getElementById("lab-test-modal").showModal();
}

// --- RECORD PATIENT LAB RESULTS ---
function renderPatientLabs(patientId) {
  const tbody = document.getElementById("patient-labs-body");
  tbody.innerHTML = "";

  const results = patientLabResults.filter(r => r.patient_id === patientId);

  if (results.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-muted" style="text-align:center;">No lab records found for this patient.</td></tr>`;
    return;
  }

  results.forEach(res => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatDate(res.test_date)}</td>
      <td><strong>${res.test_name}</strong></td>
      <td><strong>${res.result}</strong></td>
      <td>${res.range}</td>
      <td>${res.unit}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Modal Form Event Listeners
function setupFormListeners() {
  // Add Patient Button
  document.getElementById("add-patient-btn").addEventListener("click", () => {
    document.getElementById("patient-form").reset();
    document.getElementById("patient-modal").showModal();
  });

  // Save Patient
  document.getElementById("patient-form").addEventListener("submit", (e) => {
    const name = document.getElementById("p-name").value;
    const dob = document.getElementById("p-dob").value;
    const phone = document.getElementById("p-phone").value;

    const newPatient = { id: "p_" + Date.now(), name, dob, phone };
    patientsData.push(newPatient);
    renderPatientsTable();
    document.getElementById("patient-modal").close();
  });

  // Add Lab Buttons
  document.getElementById("add-doctor-lab-btn").addEventListener("click", () => {
    document.getElementById("lab-modal-title").innerText = "Add Custom Lab Test";
    document.getElementById("lab-test-form").reset();
    document.getElementById("lab-edit-id").value = "";
    document.getElementById("lab-is-global").value = "false";
    document.getElementById("lab-test-modal").showModal();
  });

  document.getElementById("admin-add-global-lab-btn").addEventListener("click", () => {
    document.getElementById("lab-modal-title").innerText = "Add Global Lab Test";
    document.getElementById("lab-test-form").reset();
    document.getElementById("lab-edit-id").value = "";
    document.getElementById("lab-is-global").value = "true";
    document.getElementById("lab-test-modal").showModal();
  });

  // Save Lab Test
  document.getElementById("lab-test-form").addEventListener("submit", () => {
    const editId = document.getElementById("lab-edit-id").value;
    const isGlobal = document.getElementById("lab-is-global").value === "true";
    const name = document.getElementById("lab-name").value;
    const min = parseFloat(document.getElementById("lab-min").value);
    const max = parseFloat(document.getElementById("lab-max").value);
    const unit = document.getElementById("lab-unit").value;

    if (editId) {
      // Editing existing test
      const target = globalLabCatalog.find(l => l.id === editId);
      if (target) {
        target.name = name;
        target.min = min;
        target.max = max;
        target.unit = unit;
      }
    } else {
      // Creating new test
      const newTest = { id: "l_" + Date.now(), name, min, max, unit, is_global: isGlobal, created_by_doctor_id: currentUser.id };
      if (isGlobal) {
        globalLabCatalog.push(newTest);
      } else {
        doctorCustomLabs.push(newTest);
      }
    }

    renderLabCatalog();
    renderAdminLabs();
    document.getElementById("lab-test-modal").close();
  });

  // Record Patient Lab Modal Trigger
  document.getElementById("add-patient-lab-btn").addEventListener("click", () => {
    const select = document.getElementById("record-lab-select");
    select.innerHTML = "";

    const allLabs = [...globalLabCatalog, ...doctorCustomLabs];
    allLabs.forEach(lab => {
      const opt = document.createElement("option");
      opt.value = lab.id;
      opt.innerText = `${lab.name} (${lab.unit})`;
      select.appendChild(opt);
    });

    document.getElementById("record-lab-date").value = new Date().toISOString().split('T')[0];
    document.getElementById("record-lab-modal").showModal();
  });

  // Save Patient Lab Result Entry
  document.getElementById("record-lab-form").addEventListener("submit", () => {
    const testId = document.getElementById("record-lab-select").value;
    const value = document.getElementById("record-lab-value").value;
    const testDate = document.getElementById("record-lab-date").value;

    const allLabs = [...globalLabCatalog, ...doctorCustomLabs];
    const test = allLabs.find(l => l.id === testId);

    if (test && activePatientId) {
      patientLabResults.push({
        id: "r_" + Date.now(),
        patient_id: activePatientId,
        test_name: test.name,
        result: value,
        range: `${test.min} - ${test.max}`,
        unit: test.unit,
        test_date: testDate
      });
      renderPatientLabs(activePatientId);
    }
    document.getElementById("record-lab-modal").close();
  });
}