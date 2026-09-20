const API_URL = "https://script.google.com/macros/s/AKfycbyHcNZJK29Nt7JcHpvewCpf2SpsWakm24IlPLkvLX4USvMZQLPhU9unaHs1yAm2Z0Lc/exec";

// Estado de la aplicación
let session = JSON.parse(localStorage.getItem("app_session")) || null;
let listaEquipos = [];
let listaClientes = [];
let listaEventosActuales = [];
let equipoActualId = null;

document.addEventListener("DOMContentLoaded", () => {
  if (session) {
    initApp();
  } else {
    showView("login-screen");
  }

  document.getElementById("login-form").addEventListener("submit", handleLogin);
  document.getElementById("logout-btn").addEventListener("click", handleLogout);
});

// -------------------------------------------------------------------
// UTILIDADES Y CONTROLES DE INTERFAZ
// -------------------------------------------------------------------

async function hashPassword(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function setFormLoading(formId, loading, customBtnText = "") {
  const form = document.getElementById(formId);
  if (!form) return;

  const elements = form.querySelectorAll("input, select, textarea, button");
  const submitBtn = form.querySelector('button[type="submit"]');

  elements.forEach(el => el.disabled = loading);

  if (submitBtn) {
    if (loading) {
      submitBtn.dataset.originalText = submitBtn.innerText;
      submitBtn.innerText = customBtnText || "Procesando...";
      submitBtn.style.opacity = "0.7";
      submitBtn.style.cursor = "not-allowed";
    } else {
      submitBtn.innerText = submitBtn.dataset.originalText || "Guardar";
      submitBtn.style.opacity = "1";
      submitBtn.style.cursor = "pointer";
    }
  }
}

function showView(viewId) {
  ["login-screen", "view-list", "view-form-equipo", "view-hoja-vida", "view-clientes"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });
  document.getElementById(viewId).classList.remove("hidden");
}

function toggleForm(formId) {
  const form = document.getElementById(formId);
  if (form) form.classList.toggle("hidden");
}

// -------------------------------------------------------------------
// INICIO Y AUTENTICACIÓN
// -------------------------------------------------------------------

function initApp() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app-screen").classList.remove("hidden");
  document.getElementById("user-display").innerText = `${session.nombre_completo} (${session.rol})`;
  showView("view-list");
  loadEquipos();
}

async function handleLogin(e) {
  e.preventDefault();
  const formId = "login-form";
  setFormLoading(formId, true, "Verificando...");
  
  const username = document.getElementById("username").value;
  const passwordRaw = document.getElementById("password").value;
  const errorElement = document.getElementById("login-error");
  errorElement.innerText = "";

  try {
    const passwordHash = await hashPassword(passwordRaw);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "login",
        payload: { username, password: passwordHash }
      })
    });

    const res = await response.json();

    if (res.success) {
      session = res.data;
      localStorage.setItem("app_session", JSON.stringify(session));
      initApp();
    } else {
      errorElement.innerText = res.message || "Usuario o contraseña incorrectos.";
    }
  } catch (err) {
    errorElement.innerText = "Error al conectar con el servidor.";
  } finally {
    setFormLoading(formId, false);
  }
}

function handleLogout() {
  localStorage.removeItem("app_session");
  session = null;
  location.reload();
}

// -------------------------------------------------------------------
// MÓDULO DE CLIENTES / SEDES
// -------------------------------------------------------------------

async function loadClientesView() {
  showView("view-clientes");
  const tbody = document.getElementById("clientes-tbody");
  tbody.innerHTML = `<tr><td colspan="6">Cargando clientes...</td></tr>`;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "getClientes",
        payload: { id_cuenta: session.id_cuenta }
      })
    });

    const res = await response.json();

    if (res.success && res.data.length > 0) {
      listaClientes = res.data;
      tbody.innerHTML = res.data.map(c => `
        <tr>
          <td><b>${c.id_cliente}</b></td>
          <td>${c.nombre_cliente}</td>
          <td>${c.ubicacion}</td>
          <td>${c.ciudad}</td>
          <td>${c.contacto_nombre || ''} (${c.telefono || ''})</td>
          <td class="no-print">
            <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;" onclick="editarCliente('${c.id_cliente}')">Editar</button>
          </td>
        </tr>
      `).join("");
    } else {
      tbody.innerHTML = `<tr><td colspan="6">No hay clientes registrados aún.</td></tr>`;
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:red;">Error al cargar clientes.</td></tr>`;
  }
}

function nuevoClienteModal() {
  document.getElementById("form-nuevo-cliente").reset();
  document.getElementById("cli_id_cliente").value = "";
  document.getElementById("cliente-form-title").innerText = "Registrar Cliente / Ubicación";
  document.getElementById("form-nuevo-cliente").classList.remove("hidden");
}

function editarCliente(idCliente) {
  const c = listaClientes.find(item => String(item.id_cliente) === String(idCliente));
  if (!c) return;

  document.getElementById("cli_id_cliente").value = c.id_cliente;
  document.getElementById("cli_nombre").value = c.nombre_cliente || "";
  document.getElementById("cli_ubicacion").value = c.ubicacion || "";
  document.getElementById("cli_ciudad").value = c.ciudad || "";
  document.getElementById("cli_direccion").value = c.direccion || "";
  document.getElementById("cli_telefono").value = c.telefono || "";
  document.getElementById("cli_contacto").value = c.contacto_nombre || "";

  document.getElementById("cliente-form-title").innerText = "Editar Cliente: " + c.id_cliente;
  document.getElementById("form-nuevo-cliente").classList.remove("hidden");
}

async function guardarCliente(e) {
  e.preventDefault();
  const formId = "form-nuevo-cliente";
  setFormLoading(formId, true, "Guardando Cliente...");

  try {
    const clienteData = {
      id_cliente: document.getElementById("cli_id_cliente").value,
      nombre_cliente: document.getElementById("cli_nombre").value,
      ubicacion: document.getElementById("cli_ubicacion").value,
      ciudad: document.getElementById("cli_ciudad").value,
      direccion: document.getElementById("cli_direccion").value,
      telefono: document.getElementById("cli_telefono").value,
      contacto_nombre: document.getElementById("cli_contacto").value
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "saveCliente",
        payload: { id_cuenta: session.id_cuenta, clienteData }
      })
    });

    const res = await response.json();

    if (res.success) {
      alert("Cliente guardado correctamente.");
      document.getElementById(formId).reset();
      document.getElementById("cli_id_cliente").value = "";
      toggleForm(formId);
      loadClientesView();
    } else {
      alert("Error: " + res.message);
    }
  } catch (err) {
    alert("Error de conexión al guardar cliente.");
  } finally {
    setFormLoading(formId, false);
  }
}

// -------------------------------------------------------------------
// MÓDULO DE EQUIPOS
// -------------------------------------------------------------------

async function loadEquipos() {
  showView("view-list");
  const tbody = document.getElementById("equipos-tbody");
  tbody.innerHTML = `<tr><td colspan="6">Cargando equipos...</td></tr>`;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "getEquipos",
        payload: { id_cuenta: session.id_cuenta }
      })
    });

    const res = await response.json();

    if (res.success && res.data.length > 0) {
      listaEquipos = res.data; // Mantiene la lista global sincronizada
      tbody.innerHTML = res.data.map(eq => `
        <tr>
          <td><b>${eq.id_equipo}</b></td>
          <td>${eq.marca} / ${eq.modelo}</td>
          <td>${eq.serie}</td>
          <td>${eq.cliente_nombre} - ${eq.ubicacion_cliente}</td>
          <td>${eq.estado_equipo || 'OPERATIVO'}</td>
          <td class="no-print">
            <button class="btn" style="padding: 4px 8px; font-size:0.8rem;" onclick="viewHojaVida('${eq.id_equipo}')">Ver HV</button>
            <button class="btn btn-secondary" style="padding: 4px 8px; font-size:0.8rem;" onclick="editarEquipo('${eq.id_equipo}')">Editar</button>
          </td>
        </tr>
      `).join("");
    } else {
      tbody.innerHTML = `<tr><td colspan="6">No hay equipos registrados aún.</td></tr>`;
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:red;">Error al cargar equipos.</td></tr>`;
  }
}

async function showNewEquipoForm() {
  const selectClient = document.getElementById("eq_id_cliente");
  selectClient.innerHTML = `<option value="">Cargando clientes...</option>`;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "getClientes",
        payload: { id_cuenta: session.id_cuenta }
      })
    });

    const res = await response.json();

    if (res.success && res.data.length > 0) {
      selectClient.innerHTML = res.data.map(c => `<option value="${c.id_cliente}">${c.nombre_cliente} - ${c.ubicacion} (${c.ciudad})</option>`).join("");
    } else {
      selectClient.innerHTML = `<option value="">No hay clientes creados. Registre un cliente primero.</option>`;
    }
  } catch (err) {
    selectClient.innerHTML = `<option value="">Error al obtener clientes</option>`;
  }

  document.getElementById("form-equipo").reset();
  document.getElementById("eq_id_equipo").value = "";
  document.getElementById("equipo-form-title").innerText = "Registrar Nuevo Equipo";
  showView("view-form-equipo");
}

async function editarEquipo(idEquipo) {
  const eq = listaEquipos.find(item => String(item.id_equipo) === String(idEquipo));
  if (!eq) return;

  await showNewEquipoForm();

  document.getElementById("equipo-form-title").innerText = "Editar Equipo: " + eq.id_equipo;
  document.getElementById("eq_id_equipo").value = eq.id_equipo;
  document.getElementById("eq_id_cliente").value = eq.id_cliente || "";
  document.getElementById("eq_estado_equipo").value = eq.estado_equipo || "OPERATIVO";
  document.getElementById("eq_marca").value = eq.marca || "";
  document.getElementById("eq_modelo").value = eq.modelo || "";
  document.getElementById("eq_serie").value = eq.serie || "";
  document.getElementById("eq_proveedor").value = eq.proveedor || "";
  document.getElementById("eq_representante").value = eq.representante || "";
  document.getElementById("eq_telefono_proveedor").value = eq.telefono_proveedor || "";
  document.getElementById("eq_ano_fabricacion").value = eq.ano_fabricacion || "";
  document.getElementById("eq_fecha_adquisicion").value = eq.fecha_adquisicion || "";
  document.getElementById("eq_fecha_instalacion").value = eq.fecha_instalacion || "";
  document.getElementById("eq_vida_util_anos").value = eq.vida_util_anos || "";
  document.getElementById("eq_voltaje_operacion").value = eq.voltaje_operacion || "";
  document.getElementById("eq_frecuencia_trabajo").value = eq.frecuencia_trabajo || "";
  document.getElementById("eq_potencia_salida").value = eq.potencia_salida || "";
  document.getElementById("eq_presion").value = eq.presion || "";
  document.getElementById("eq_velocidad").value = eq.velocidad || "";
  document.getElementById("eq_temperatura").value = eq.temperatura || "";
  document.getElementById("eq_humedad").value = eq.humedad || "";
  document.getElementById("eq_fuentes_alimentacion").value = eq.fuentes_alimentacion || "";
  document.getElementById("eq_empleo").value = eq.empleo || "Médico";
  document.getElementById("eq_riesgo").value = eq.riesgo || "Bajo I";
  document.getElementById("eq_posicion").value = eq.posicion || "Fijo";
  document.getElementById("eq_clasificacion_biomedica").value = eq.clasificacion_biomedica || "Diagnóstico";
  document.getElementById("eq_tecnologia").value = eq.tecnologia || "Electrónico";
}

async function guardarEquipo(e) {
  e.preventDefault();
  const formId = "form-equipo";
  setFormLoading(formId, true, "Guardando Equipo...");

  try {
    const equipoData = {
      id_equipo: document.getElementById("eq_id_equipo").value,
      id_cliente: document.getElementById("eq_id_cliente").value,
      estado_equipo: document.getElementById("eq_estado_equipo").value,
      marca: document.getElementById("eq_marca").value,
      modelo: document.getElementById("eq_modelo").value,
      serie: document.getElementById("eq_serie").value,
      proveedor: document.getElementById("eq_proveedor").value,
      representante: document.getElementById("eq_representante").value,
      telefono_proveedor: document.getElementById("eq_telefono_proveedor").value,
      ano_fabricacion: document.getElementById("eq_ano_fabricacion").value,
      fecha_adquisicion: document.getElementById("eq_fecha_adquisicion").value,
      fecha_instalacion: document.getElementById("eq_fecha_instalacion").value,
      vida_util_anos: document.getElementById("eq_vida_util_anos").value,
      voltaje_operacion: document.getElementById("eq_voltaje_operacion").value,
      frecuencia_trabajo: document.getElementById("eq_frecuencia_trabajo").value,
      potencia_salida: document.getElementById("eq_potencia_salida").value,
      presion: document.getElementById("eq_presion").value,
      velocidad: document.getElementById("eq_velocidad").value,
      temperatura: document.getElementById("eq_temperatura").value,
      humedad: document.getElementById("eq_humedad").value,
      fuentes_alimentacion: document.getElementById("eq_fuentes_alimentacion").value,
      empleo: document.getElementById("eq_empleo").value,
      riesgo: document.getElementById("eq_riesgo").value,
      posicion: document.getElementById("eq_posicion").value,
      clasificacion_biomedica: document.getElementById("eq_clasificacion_biomedica").value,
      tecnologia: document.getElementById("eq_tecnologia").value
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "saveEquipo",
        payload: { id_cuenta: session.id_cuenta, equipoData }
      })
    });

    const res = await response.json();

    if (res.success) {
      alert("Equipo guardado exitosamente.");
      loadEquipos();
    } else {
      alert("Error al guardar equipo: " + res.message);
    }
  } catch (err) {
    alert("Error de conexión al guardar el equipo.");
  } finally {
    setFormLoading(formId, false);
  }
}

// -------------------------------------------------------------------
// MÓDULO HOJA DE VIDA (PL-010-F5) Y EVENTOS
// -------------------------------------------------------------------

async function viewHojaVida(idEquipo) {
  equipoActualId = idEquipo;
  showView("view-hoja-vida");
  
  const formEvt = document.getElementById("form-nuevo-evento");
  if (formEvt) formEvt.classList.add("hidden");

  const container = document.getElementById("hv-content");
  container.innerHTML = "<p style='padding:1rem;'>Cargando Hoja de Vida...</p>";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "getHojaDeVida",
        payload: { id_cuenta: session.id_cuenta, id_equipo: idEquipo }
      })
    });

    const res = await response.json();

    if (res.success) {
      const { equipo, cliente, subconjuntos, eventos } = res.data;
      listaEventosActuales = eventos || [];

      container.innerHTML = `
        <div class="hv-header">
          HOJA DE VIDA EQUIPO BIOMÉDICO / TÉCNICO <br>
          <span style="font-size: 0.75rem;">CÓDIGO: PL-010-F5 | VERSIÓN: 2</span>
        </div>

        <div class="hv-section-title">LOCALIZACIÓN</div>
        <div class="hv-grid">
          <div class="hv-row">
            <div class="hv-cell"><span class="hv-label">Nombre Cliente:</span> ${cliente.nombre_cliente || 'N/A'}</div>
            <div class="hv-cell"><span class="hv-label">Ubicación:</span> ${cliente.ubicacion || 'N/A'}</div>
          </div>
        </div>

        <div class="hv-section-title">REGISTRO HISTÓRICO</div>
        <div class="hv-grid">
          <div class="hv-row">
            <div class="hv-cell"><span class="hv-label">Marca:</span> ${equipo.marca || ''}</div>
            <div class="hv-cell"><span class="hv-label">Proveedor:</span> ${equipo.proveedor || ''}</div>
            <div class="hv-cell"><span class="hv-label">Representante:</span> ${equipo.representante || ''}</div>
          </div>
          <div class="hv-row">
            <div class="hv-cell"><span class="hv-label">Modelo:</span> ${equipo.modelo || ''}</div>
            <div class="hv-cell"><span class="hv-label">Año Fab:</span> ${equipo.ano_fabricacion || ''}</div>
            <div class="hv-cell"><span class="hv-label">Teléfono:</span> ${equipo.telefono_proveedor || ''}</div>
          </div>
          <div class="hv-row">
            <div class="hv-cell"><span class="hv-label">Serie:</span> ${equipo.serie || ''}</div>
            <div class="hv-cell"><span class="hv-label">Fecha Adq:</span> ${equipo.fecha_adquisicion || ''}</div>
            <div class="hv-cell"><span class="hv-label">Ciudad:</span> ${cliente.ciudad || ''}</div>
          </div>
          <div class="hv-row">
            <div class="hv-cell"><span class="hv-label">Vida Útil:</span> ${equipo.vida_util_anos || ''} años</div>
            <div class="hv-cell"><span class="hv-label">Fecha Inst:</span> ${equipo.fecha_instalacion || ''}</div>
            <div class="hv-cell"><span class="hv-label">Dirección:</span> ${cliente.direccion || ''}</div>
          </div>
        </div>

        <div class="hv-section-title">REGISTRO TÉCNICO</div>
        <div class="hv-grid">
          <div class="hv-row">
            <div class="hv-cell"><span class="hv-label">Voltaje Operación:</span> ${equipo.voltaje_operacion || ''}</div>
            <div class="hv-cell"><span class="hv-label">Presión:</span> ${equipo.presion || ''}</div>
            <div class="hv-cell"><span class="hv-label">Fuente Alimentación:</span> ${equipo.fuentes_alimentacion || ''}</div>
          </div>
          <div class="hv-row">
            <div class="hv-cell"><span class="hv-label">Frecuencia Trabajo:</span> ${equipo.frecuencia_trabajo || ''}</div>
            <div class="hv-cell"><span class="hv-label">Velocidad:</span> ${equipo.velocidad || ''}</div>
            <div class="hv-cell"><span class="hv-label">Potencia Salida:</span> ${equipo.potencia_salida || ''}</div>
          </div>
        </div>

        <div class="hv-section-title">CLASIFICACIÓN Y TECNOLOGÍA</div>
        <div class="hv-grid">
          <div class="hv-row">
            <div class="hv-cell"><span class="hv-label">Empleo:</span> ${equipo.empleo || ''}</div>
            <div class="hv-cell"><span class="hv-label">Riesgo:</span> ${equipo.riesgo || ''}</div>
            <div class="hv-cell"><span class="hv-label">Posición:</span> ${equipo.posicion || ''}</div>
          </div>
          <div class="hv-row">
            <div class="hv-cell" style="flex: 2;"><span class="hv-label">Clasificación Biomédica:</span> ${equipo.clasificacion_biomedica || ''}</div>
            <div class="hv-cell"><span class="hv-label">Tecnología:</span> ${equipo.tecnologia || ''}</div>
          </div>
        </div>

        <div class="hv-section-title">HISTORIAL DE MANTENIMIENTO Y EVENTOS</div>
        <table class="data-table" style="font-size:0.75rem; margin-top: 4px;">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo Evento</th>
              <th>Descripción Trabajo</th>
              <th>Técnico</th>
              <th>Reporte PDF</th>
              <th class="no-print">Acción</th>
            </tr>
          </thead>
          <tbody>
            ${eventos && eventos.length > 0 ? eventos.map(ev => `
              <tr>
                <td>${ev.fecha_evento}</td>
                <td><b>${ev.tipo_evento}</b></td>
                <td>${ev.descripcion_trabajo}</td>
                <td>${ev.tecnico_responsable}</td>
                <td>${ev.url_reporte_pdf ? `<a href="${ev.url_reporte_pdf}" target="_blank">Ver Adjunto</a>` : 'N/A'}</td>
                <td class="no-print">
                  <button class="btn btn-secondary" style="padding: 2px 6px; font-size: 0.7rem;" onclick="editarEvento('${ev.id_evento}')">Editar</button>
                </td>
              </tr>
            `).join('') : '<tr><td colspan="6" style="text-align:center;">No hay eventos ni mantenimientos registrados aún.</td></tr>'}
          </tbody>
        </table>
      `;
    } else {
      container.innerHTML = `<p style='color:red;'>${res.message}</p>`;
    }
  } catch (err) {
    container.innerHTML = "<p style='color:red;'>Error al consultar la Hoja de Vida.</p>";
  }
}

function nuevoEventoModal() {
  document.getElementById("form-nuevo-evento").reset();
  document.getElementById("evt_id_evento").value = "";
  document.getElementById("evento-form-title").innerText = "Nuevo Evento / Mantenimiento";
  document.getElementById("form-nuevo-evento").classList.remove("hidden");
}

function editarEvento(idEvento) {
  const ev = listaEventosActuales.find(item => String(item.id_evento) === String(idEvento));
  if (!ev) return;

  document.getElementById("evt_id_evento").value = ev.id_evento;
  document.getElementById("evt_fecha").value = ev.fecha_evento || "";
  document.getElementById("evt_tipo").value = ev.tipo_evento || "MANTENIMIENTO PREVENTIVO";
  document.getElementById("evt_descripcion").value = ev.descripcion_trabajo || "";
  document.getElementById("evt_tecnico").value = ev.tecnico_responsable || "";
  document.getElementById("evt_repuestos").value = ev.repuestos_utilizados || "";
  document.getElementById("evt_url_pdf").value = ev.url_reporte_pdf || "";

  document.getElementById("evento-form-title").innerText = "Editar Evento: " + ev.id_evento;
  document.getElementById("form-nuevo-evento").classList.remove("hidden");
}

async function guardarEvento(e) {
  e.preventDefault();
  const formId = "form-nuevo-evento";
  setFormLoading(formId, true, "Guardando Evento...");

  try {
    const eventoData = {
      id_evento: document.getElementById("evt_id_evento").value,
      id_equipo: equipoActualId,
      fecha_evento: document.getElementById("evt_fecha").value,
      tipo_evento: document.getElementById("evt_tipo").value,
      descripcion_trabajo: document.getElementById("evt_descripcion").value,
      tecnico_responsable: document.getElementById("evt_tecnico").value,
      repuestos_utilizados: document.getElementById("evt_repuestos").value,
      url_reporte_pdf: document.getElementById("evt_url_pdf").value
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "saveEvento",
        payload: { id_cuenta: session.id_cuenta, eventoData }
      })
    });

    const res = await response.json();

    if (res.success) {
      alert("Evento guardado correctamente.");
      document.getElementById(formId).reset();
      document.getElementById("evt_id_evento").value = "";
      toggleForm(formId);
      viewHojaVida(equipoActualId);
    } else {
      alert("Error al guardar evento: " + res.message);
    }
  } catch (err) {
    alert("Error de conexión al guardar el evento.");
  } finally {
    setFormLoading(formId, false);
  }
}
