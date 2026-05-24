const DATA_KEY = "workCalendar_hours_v7"; 
const NAME_KEY = "workCalendar_workerName";
const SCHEDULE_KEY = "workCalendar_fixedSchedule";
const CONFIG_KEY = "workCalendar_settings";

let config = JSON.parse(localStorage.getItem(CONFIG_KEY)) || {
  paymentType: "hora", paymentValue: 0, normalHours: 8, extraMult: 1.5, holidayMult: 2.0
};

const defaultSchedule = { 
  in: "08:00", out: "14:00", 
  extraIn: "14:00", extraOut: "18:00", 
  useBaseExtra: false 
};

let data = JSON.parse(localStorage.getItem(DATA_KEY) || "{}");
let baseSchedule = JSON.parse(localStorage.getItem(SCHEDULE_KEY) || JSON.stringify(defaultSchedule));
let currentEditDateKey = null; 

const typeLabels = {
  normal: "Trabajo Normal", feriado: "Feriado", parke: "Parke",
  enfermedad_paga: "Enfermedad (Paga)", enfermedad_nopaga: "Enfermedad (No Paga)",
  vacaciones_pagas: "Vacaciones (Pagas)", vacaciones_nopagas: "Vacaciones (No Pagas)"
};

const workerName = document.getElementById("workerName");
const monthPicker = document.getElementById("monthPicker");
const calendarDiv = document.getElementById("calendar");
const summaryDiv = document.getElementById("summary");

workerName.value = localStorage.getItem(NAME_KEY) || "";
const today = new Date();
monthPicker.value = today.toISOString().slice(0, 7);

workerName.addEventListener("input", () => localStorage.setItem(NAME_KEY, workerName.value.trim()));
monthPicker.addEventListener("change", renderCalendar);

function closeModals() { document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = "none"); }

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModals(); });
});

document.getElementById("btnConfig").addEventListener("click", () => {
  document.getElementById("confPaymentType").value = config.paymentType || "hora";
  document.getElementById("confPaymentValue").value = config.paymentValue || 0;
  document.getElementById("confNormalHours").value = config.normalHours;
  document.getElementById("confExtraMult").value = config.extraMult;
  document.getElementById("confHolidayMult").value = config.holidayMult;
  document.getElementById("configModal").style.display = "flex";
});

function saveConfig() {
  config.paymentType = document.getElementById("confPaymentType").value;
  config.paymentValue = parseFloat(document.getElementById("confPaymentValue").value) || 0;
  config.normalHours = parseFloat(document.getElementById("confNormalHours").value) || 8;
  config.extraMult = parseFloat(document.getElementById("confExtraMult").value) || 1.5;
  config.holidayMult = parseFloat(document.getElementById("confHolidayMult").value) || 2.0;
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  closeModals(); renderCalendar();
}

document.getElementById("setScheduleBtn").addEventListener("click", () => {
  document.getElementById("baseInTime").value = baseSchedule.in || "";
  document.getElementById("baseOutTime").value = baseSchedule.out || "";
  document.getElementById("baseExtraInTime").value = baseSchedule.extraIn || "";
  document.getElementById("baseExtraOutTime").value = baseSchedule.extraOut || "";
  document.getElementById("useBaseExtra").checked = baseSchedule.useBaseExtra || false;
  document.getElementById("scheduleModal").style.display = "flex";
});

function saveBaseSchedule() {
  baseSchedule = { 
    in: document.getElementById("baseInTime").value, 
    out: document.getElementById("baseOutTime").value,
    extraIn: document.getElementById("baseExtraInTime").value,
    extraOut: document.getElementById("baseExtraOutTime").value,
    useBaseExtra: document.getElementById("useBaseExtra").checked
  };
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(baseSchedule)); 
  closeModals();
}

function openDayModal(key, dayNumber) {
  currentEditDateKey = key;
  document.getElementById("dayModalTitle").textContent = `Día ${dayNumber}`;
  
  let extraInDefault = baseSchedule.useBaseExtra ? (baseSchedule.extraIn || "") : "";
  let extraOutDefault = baseSchedule.useBaseExtra ? (baseSchedule.extraOut || "") : "";

  const dayData = data[key] || { 
    type: "normal", 
    in: baseSchedule.in || "", 
    out: baseSchedule.out || "", 
    extraIn: extraInDefault, 
    extraOut: extraOutDefault, 
    note: "" 
  };
  
  document.getElementById("dayType").value = dayData.type || "normal";
  document.getElementById("dayInTime").value = dayData.in || "";
  document.getElementById("dayOutTime").value = dayData.out || "";
  document.getElementById("dayExtraInTime").value = dayData.extraIn || "";
  document.getElementById("dayExtraOutTime").value = dayData.extraOut || "";
  document.getElementById("dayNote").value = dayData.note || "";
  
  const hasExtras = (dayData.extraIn !== "" || dayData.extraOut !== "");
  document.getElementById("enableDayExtra").checked = hasExtras;
  
  toggleDayTypeInputs();
  document.getElementById("dayModal").style.display = "flex";
}

function toggleDayTypeInputs() {
  const type = document.getElementById("dayType").value;
  const isAbsence = ["enfermedad_paga", "enfermedad_nopaga", "vacaciones_pagas", "vacaciones_nopagas", "parke"].includes(type);
  document.getElementById("timeInputsContainer").style.display = isAbsence ? "none" : "block";
  
  if (!isAbsence) {
    toggleDayExtraInputs();
  }
}

function toggleDayExtraInputs() {
  const isEnabled = document.getElementById("enableDayExtra").checked;
  const extraContainer = document.getElementById("dayExtraInputsContainer");
  
  if (isEnabled) {
    extraContainer.style.display = "block";
    if (!document.getElementById("dayExtraInTime").value && baseSchedule.extraIn) {
      document.getElementById("dayExtraInTime").value = baseSchedule.extraIn;
    }
    if (!document.getElementById("dayExtraOutTime").value && baseSchedule.extraOut) {
      document.getElementById("dayExtraOutTime").value = baseSchedule.extraOut;
    }
  } else {
    extraContainer.style.display = "none";
    document.getElementById("dayExtraInTime").value = "";
    document.getElementById("dayExtraOutTime").value = "";
  }
}

function saveSpecificDay() {
  const type = document.getElementById("dayType").value;
  let inTime = document.getElementById("dayInTime").value;
  let outTime = document.getElementById("dayOutTime").value;
  let extraInTime = "";
  let extraOutTime = "";
  const note = document.getElementById("dayNote").value.trim();
  const isAbsence = ["enfermedad_paga", "enfermedad_nopaga", "vacaciones_pagas", "vacaciones_nopagas", "parke"].includes(type);

  if (isAbsence) { 
    inTime = ""; outTime = ""; 
  } else if (document.getElementById("enableDayExtra").checked) {
    extraInTime = document.getElementById("dayExtraInTime").value;
    extraOutTime = document.getElementById("dayExtraOutTime").value;
  }
  
  if(isAbsence || inTime || extraInTime || note) {
    data[currentEditDateKey] = { type, in: inTime, out: outTime, extraIn: extraInTime, extraOut: extraOutTime, note };
  } else {
    delete data[currentEditDateKey];
  }
  localStorage.setItem(DATA_KEY, JSON.stringify(data)); closeModals(); renderCalendar();
}

function clearSpecificDay() {
  delete data[currentEditDateKey]; localStorage.setItem(DATA_KEY, JSON.stringify(data)); closeModals(); renderCalendar();
}

function diffHours(start, end) {
  if (!start || !end) return 0;
  const [sH, sM] = start.split(":").map(Number); const [eH, eM] = end.split(":").map(Number);
  let mins = (eH * 60 + eM) - (sH * 60 + sM);
  if (mins < 0) mins += 1440; 
  return mins / 60;
}

function renderCalendar() {
  calendarDiv.innerHTML = "";
  const [year, month] = monthPicker.value.split("-").map(Number);
  if (!year || !month) return;

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  dayNames.forEach(n => {
    const hd = document.createElement("div"); hd.className = "day-header"; hd.textContent = n; calendarDiv.appendChild(hd);
  });
  for (let i = 0; i < firstDay; i++) calendarDiv.appendChild(document.createElement("div"));

  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayData = data[key];
    const cell = document.createElement("div"); cell.className = "day";
    
    // Obtener el nombre del día para la vista móvil
    const dateObj = new Date(year, month - 1, d);
    const dName = dayNames[dateObj.getDay()];

    let displayType = ""; let displayHours = ""; let noteIcon = "";

    if (dayData) {
      const type = dayData.type || "normal";
      cell.classList.add(type === "normal" && (dayData.in || dayData.extraIn) ? "worked" : type);
      if (dayData.note) noteIcon = "📝";
      
      if (type === "enfermedad_paga" || type === "enfermedad_nopaga") {
         const badgeColor = type === "enfermedad_paga" ? "var(--danger)" : "#fca5a5";
         displayType = `<div class='day-type-badge' style='color:${badgeColor}'>${typeLabels[type]}</div>`;
      }
      else if (type === "vacaciones_pagas" || type === "vacaciones_nopagas") {
         const badgeColor = type === "vacaciones_pagas" ? "var(--purple)" : "#d8b4fe";
         displayType = `<div class='day-type-badge' style='color:${badgeColor}'>${typeLabels[type]}</div>`;
      }
      else if (type === "feriado") displayType = "<div class='day-type-badge' style='color:var(--warning)'>Feriado</div>";
      else if (type === "parke") displayType = "<div class='day-type-badge' style='color:var(--blue)'>Parke</div>";
      
      let hrsText = "";
      if (type === "normal" || type === "feriado") {
        if (dayData.in && dayData.out) {
          hrsText += `N: ${diffHours(dayData.in, dayData.out).toFixed(1)}h`;
        } else if (dayData.in && !dayData.out) {
          hrsText += `<div class="warning-text">⚠️ Falta Salida</div>`;
        }

        if (dayData.extraIn && dayData.extraOut) {
          const extVal = diffHours(dayData.extraIn, dayData.extraOut).toFixed(1);
          hrsText += hrsText ? `<br><span style="color:var(--primary)">X: ${extVal}h</span>` : `<span style="color:var(--primary)">X: ${extVal}h</span>`;
        } else if (dayData.extraIn && !dayData.extraOut) {
          hrsText += `<br><div class="warning-text">⚠️ F. Salida (Ex)</div>`;
        }
      }
      
      if (hrsText) displayHours = `<div class="day-hours">${hrsText}</div>`;
    }

    // Se divide el interior en dos bloques (Número/Día y Detalles) para alinear lindo en celular
    cell.innerHTML = `
      <div class="day-number">
        <span class="mobile-day-name">${dName}</span> 
        ${d} 
        <span class="note-icon">${noteIcon}</span>
      </div> 
      <div class="day-details">
        ${displayHours} ${displayType}
      </div>
    `;
    
    cell.addEventListener("click", () => openDayModal(key, d));
    calendarDiv.appendChild(cell);
  }
  updateSummary();
}

function updateSummary() {
  const [year, month] = monthPicker.value.split("-").map(Number);
  if (!year || !month) return;
  const daysInMonth = new Date(year, month, 0).getDate();
  
  let totalNormalHours = 0, totalExtraHours = 0;
  let workedDays = 0, paidAbsences = 0, unpaidAbsences = 0, parkeCount = 0;
  let totalEarned = 0;
  let hourlyRate = 0, dailyRate = 0;

  if (config.paymentType === "hora") {
    hourlyRate = config.paymentValue; dailyRate = hourlyRate * config.normalHours;
  } else if (config.paymentType === "dia") {
    dailyRate = config.paymentValue; hourlyRate = dailyRate / config.normalHours;
  } else if (config.paymentType === "quincena") {
    dailyRate = config.paymentValue / 15; hourlyRate = dailyRate / config.normalHours; totalEarned = config.paymentValue * 2;
  } else if (config.paymentType === "mes") {
    dailyRate = config.paymentValue / 30; hourlyRate = dailyRate / config.normalHours; totalEarned = config.paymentValue;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayData = data[key];
    
    if (dayData) {
      const type = dayData.type || "normal";

      if (["enfermedad_paga", "vacaciones_pagas", "parke"].includes(type)) {
        paidAbsences++;
        if (type === "parke") parkeCount++;
        totalNormalHours += config.normalHours;
        
        if (config.paymentType === "hora" || config.paymentType === "dia") totalEarned += dailyRate; 
      } 
      else if (["enfermedad_nopaga", "vacaciones_nopagas"].includes(type)) {
        unpaidAbsences++;
        if (config.paymentType === "quincena" || config.paymentType === "mes") totalEarned -= dailyRate; 
      }
      else if (type === "normal" || type === "feriado") {
        let worked = 0, extraWorked = 0;
        if (dayData.in && dayData.out) worked = diffHours(dayData.in, dayData.out);
        if (dayData.extraIn && dayData.extraOut) extraWorked = diffHours(dayData.extraIn, dayData.extraOut);

        if (worked > 0 || extraWorked > 0 || dayData.in) workedDays++; 
        totalNormalHours += worked;
        totalExtraHours += extraWorked;
        
        if (config.paymentType === "hora") {
          totalEarned += (worked * hourlyRate * (type === "feriado" ? config.holidayMult : 1.0)) + (extraWorked * hourlyRate * config.extraMult);
        } else if (config.paymentType === "dia") {
          if (worked > 0 || dayData.in) totalEarned += (dailyRate * (type === "feriado" ? config.holidayMult : 1.0));
          totalEarned += (extraWorked * hourlyRate * config.extraMult);
        } else {
          if (type === "feriado") totalEarned += (worked * hourlyRate * (config.holidayMult - 1.0)); 
          totalEarned += (extraWorked * hourlyRate * config.extraMult);
        }
      }
    }
  }

  const payMap = { "hora": "Hora", "dia": "Día", "quincena": "Quincena", "mes": "Mes" };
  let paymentLabel = `${payMap[config.paymentType]}: $${config.paymentValue.toFixed(2)}`;

  summaryDiv.innerHTML = `
    <div class="stat-box"><span>Modalidad</span><strong style="color:var(--primary); font-size:1.1em;">${paymentLabel}</strong></div>
    <div class="stat-box"><span>Asistencias</span><strong>${workedDays}</strong></div>
    <div class="stat-box"><span>Aus. Pagas</span><strong>${paidAbsences}</strong></div>
    <div class="stat-box"><span>Faltas S/Pago</span><strong style="color:var(--danger)">${unpaidAbsences}</strong></div>
    <div class="stat-box"><span>Parkes</span><strong style="color:var(--blue)">${parkeCount}</strong></div>
    <div class="stat-box"><span>Hrs. Normales</span><strong>${totalNormalHours.toFixed(1)}</strong></div>
    <div class="stat-box"><span>Hrs. Extras</span><strong style="color:var(--primary)">${totalExtraHours.toFixed(1)}</strong></div>
    <div class="stat-box"><span>Ganancia Est.</span><strong style="color:var(--accent)">$${totalEarned.toFixed(2)}</strong></div>
  `;
}

document.getElementById("downloadPdf").addEventListener("click", () => {
  const { jsPDF } = window.jspdf; const pdf = new jsPDF("p", "pt", "a4");
  const name = workerName.value.trim() || "Trabajador";
  const [year, month] = monthPicker.value.split("-").map(Number);
  
  pdf.setFontSize(18).setFont("helvetica", "bold"); pdf.text("Reporte Mensual de Horas", 40, 40);
  pdf.setFontSize(11).setFont("helvetica", "normal");
  pdf.text(`Nombre: ${name}`, 40, 65);
  pdf.text(`Período: ${monthPicker.value} | Modalidad: ${config.paymentType.toUpperCase()}`, 40, 80);

  const rows = [];
  const sortedKeys = Object.keys(data).filter(k => k.startsWith(`${year}-${String(month).padStart(2, "0")}`)).sort();

  sortedKeys.forEach(key => {
    const dayData = data[key]; const type = dayData.type || "normal"; const [y, m, d] = key.split("-");
    let timeStr = "N/A"; let hourStr = "0.0";
    let stateStr = typeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1);
    if (dayData.note) stateStr += ` (${dayData.note})`;

    const isAbsence = ["enfermedad_paga", "enfermedad_nopaga", "vacaciones_pagas", "vacaciones_nopagas", "parke"].includes(type);

    if (isAbsence) {
      timeStr = "Ausente";
      hourStr = type.includes("paga") || type === "parke" ? `${config.normalHours} (Pagas)` : "0 (No Pagas)";
    } else {
      let worked = 0, extraWorked = 0;
      let segments = []; let hrsSegments = [];

      if (dayData.in && dayData.out) { worked = diffHours(dayData.in, dayData.out); segments.push(`Norm: ${dayData.in}-${dayData.out}`); }
      else if (dayData.in && !dayData.out) { segments.push(`Norm: ${dayData.in}-?? (Falta Salida)`); }

      if (dayData.extraIn && dayData.extraOut) { extraWorked = diffHours(dayData.extraIn, dayData.extraOut); segments.push(`Ext: ${dayData.extraIn}-${dayData.extraOut}`); }
      
      if (segments.length > 0) timeStr = segments.join(" | ");
      if (worked > 0) hrsSegments.push(`${worked.toFixed(1)}n`);
      if (extraWorked > 0) hrsSegments.push(`${extraWorked.toFixed(1)}x`);
      if (hrsSegments.length > 0) hourStr = hrsSegments.join(" + ");
    }
    rows.push([`${d}/${m}/${y}`, timeStr, hourStr, stateStr]);
  });

  pdf.autoTable({
    startY: 100, head: [["Fecha", "Horarios Registrados", "Horas Acum.", "Estado / Notas"]], body: rows,
    styles: { halign: "center", font: "helvetica" }, columnStyles: { 1: { halign: "left" }, 3: { halign: "left" } },
    headStyles: { fillColor: [15, 23, 42] }, alternateRowStyles: { fillColor: [241, 245, 249] }
  });
  pdf.save(`Horas_${name}_${monthPicker.value}.pdf`);
});

document.getElementById("downloadCsv").addEventListener("click", () => {
  const name = workerName.value.trim() || "Trabajador";
  const [year, month] = monthPicker.value.split("-").map(Number);
  let csvContent = "Fecha,Estado,Entrada Normal,Salida Normal,Entrada Extra,Salida Extra,Horas Normales,Horas Extras,Notas\n";
  const sortedKeys = Object.keys(data).filter(k => k.startsWith(`${year}-${String(month).padStart(2, "0")}`)).sort();

  sortedKeys.forEach(key => {
    const dayData = data[key]; const type = dayData.type || "normal"; const [y, m, d] = key.split("-");
    
    let timeIn = dayData.in || ""; let timeOut = dayData.out || "";
    let extraIn = dayData.extraIn || ""; let extraOut = dayData.extraOut || "";
    let normHrs = 0; let extHrs = 0;
    let note = dayData.note ? `"${dayData.note.replace(/"/g, '""')}"` : ""; 
    let stateStr = typeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1);

    const isAbsence = ["enfermedad_paga", "enfermedad_nopaga", "vacaciones_pagas", "vacaciones_nopagas", "parke"].includes(type);

    if (isAbsence) {
      timeIn = "Ausente"; timeOut = "Ausente"; extraIn = "Ausente"; extraOut = "Ausente";
      normHrs = (type.includes("paga") || type === "parke") ? config.normalHours : 0;
    } else {
      if (timeIn && timeOut) normHrs = diffHours(timeIn, timeOut);
      if (extraIn && extraOut) extHrs = diffHours(extraIn, extraOut);
    }
    csvContent += `${d}/${m}/${y},${stateStr},${timeIn},${timeOut},${extraIn},${extraOut},${normHrs.toFixed(2)},${extHrs.toFixed(2)},${note}\n`;
  });

  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a"); link.setAttribute("href", URL.createObjectURL(blob));
  link.setAttribute("download", `Horas_${name}_${monthPicker.value}.csv`);
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
});

document.getElementById("clearData").addEventListener("click", () => {
  if (confirm("¿Seguro que querés borrar todos los registros de este mes?")) {
    const prefix = monthPicker.value;
    Object.keys(data).forEach(key => { if (key.startsWith(prefix)) delete data[key]; });
    localStorage.setItem(DATA_KEY, JSON.stringify(data)); renderCalendar();
  }
});

renderCalendar();