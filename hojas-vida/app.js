const API_URL = "https://script.google.com/macros/s/AKfycbyHcNZJK29Nt7JcHpvewCpf2SpsWakm24IlPLkvLX4USvMZQLPhU9unaHs1yAm2Z0Lc/exec";

// Estado local de sesión
let session = JSON.parse(localStorage.getItem("app_session")) || null;

document.addEventListener("DOMContentLoaded", () => {
  if (session) {
    initApp();
  } else {
    showView("login-screen");
  }

  document.getElementById("login-form").addEventListener("submit", handleLogin);
  document.getElementById("logout-btn").addEventListener("click", handleLogout);
});

// Función Encriptación SHA-256
async function hashPassword(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Manejo de Inicio de Sesión
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("username").value;
  const passwordRaw = document.getElementById("password").value;
  const errorElement = document.getElementById("login-error");

  errorElement.innerText = "Verificando...";

  const passwordHash = await hashPassword(passwordRaw);

  try {
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
      errorElement.innerText = "";
      initApp();
    } else {
      errorElement.innerText = res.message || "Credenciales incorrectas";
    }
  } catch (err) {
    errorElement.innerText = "Error al conectar con el servidor.";
  }
}

function handleLogout() {
  localStorage.removeItem("app_session");
  session = null;
  location.reload();
}

function initApp() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app-screen").classList.remove("hidden");
  document.getElementById("user-display").innerText = `${session.nombre_completo} (${session.rol})`;
  loadEquipos();
}

function showView(viewId) {
  ["login-screen", "view-list", "view-hoja-vida"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });
  document.getElementById(viewId).classList.remove("hidden");
}

// Cargar Lista de Equipos
async function loadEquipos() {
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
      tbody.innerHTML = res.data.map(eq => `
        <tr>
          <td><b>${eq.id_equipo}</b></td>
          <td>${eq.marca} / ${eq.modelo}</td>
          <td>${eq.serie}</td>
          <td>${eq.cliente_nombre} - ${eq.ubicacion_cliente}</td>
          <td>${eq.estado_equipo || 'OPERATIVO'}</td>
          <td>
            <button class="btn" style="padding: 4px 8px; font-size:0.8rem;" onclick="viewHojaVida('${eq.id_equipo}')">Ver HV</button>
          </td>
        </tr>
      `).join("");
    } else {
      tbody.innerHTML = `<tr><td colspan="6">No hay equipos registrados para esta cuenta.</td></tr>`;
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:red;">Error al cargar datos.</td></tr>`;
  }
}

// Variable global para almacenar el equipo actual en pantalla
let equipoActualId = null;

// Modificación en viewHojaVida para asignar equipoActualId
async function viewHojaVida(idEquipo) {
  equipoActualId = idEquipo;
  document.getElementById("evt_id_equipo").value = idEquipo;
  showView("view-hoja-vida");
  const container = document.getElementById("hv-content");
  container.innerHTML = "<p>Cargando Hoja de Vida...</p>";

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
            </tr>
          </thead>
          <tbody>
            ${eventos.length > 0 ? eventos.map(ev => `
              <tr>
                <td>${ev.fecha_evento}</td>
                <td><b>${ev.tipo_evento}</b></td>
                <td>${ev.descripcion_trabajo}</td>
                <td>${ev.tecnico_responsable}</td>
                <td>${ev.url_reporte_pdf ? `<a href="${ev.url_reporte_pdf}" target="_blank">Ver Adjunto</a>` : 'N/A'}</td>
              </tr>
            `).join('') : '<tr><td colspan="5" style="text-align:center;">No hay eventos ni mantenimientos registrados aún.</td></tr>'}
          </tbody>
        </table>
      `;
    }
  } catch (err) {
    container.innerHTML = "<p style='color:red;'>Error al consultar la Hoja de Vida.</p>";
  }
}

// Guardar Nuevo Evento / Mantenimiento
async function guardarEvento(e) {
  e.preventDefault();

  const eventoData = {
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
    alert("Evento registrado exitosamente.");
    document.getElementById("form-nuevo-evento").reset();
    toggleForm("form-nuevo-evento");
    viewHojaVida(equipoActualId); // Recarga la Hoja de Vida actualizada con el nuevo mantenimiento
  } else {
    alert("Error al guardar evento: " + res.message);
  }
}

// Mostrar / Ocultar Formularios
function toggleForm(formId) {
  const form = document.getElementById(formId);
  form.classList.toggle("hidden");
}

// Variable global para almacenar el listado de clientes activo
let listaClientes = [];

// Cargar Vista de Clientes con Botón de Edición
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
      listaClientes = res.data; // Guardar en memoria
      tbody.innerHTML = res.data.map(c => `
        <tr>
          <td><b>${c.id_cliente}</b></td>
          <td>${c.nombre_cliente}</td>
          <td>${c.ubicacion}</td>
          <td>${c.ciudad}</td>
          <td>${c.contacto_nombre || ''} (${c.telefono || ''})</td>
          <td>
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

// Editar Cliente
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

  document.getElementById("form-nuevo-cliente").classList.remove("hidden");
}


// Preparar y Mostrar Formulario de Registro de Equipos
async function showNewEquipoForm() {
  // Cargar primero los clientes en la lista desplegable
  const selectClient = document.getElementById("eq_id_cliente");
  selectClient.innerHTML = `<option value="">Cargando clientes...</option>`;

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

  document.getElementById("form-equipo").reset();
  document.getElementById("eq_id_equipo").value = "";
  document.getElementById("equipo-form-title").innerText = "Registrar Nuevo Equipo";
  showView("view-form-equipo");
}

// Guardar Nuevo Equipo
async function guardarEquipo(e) {
  e.preventDefault();

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
    showView("view-list");
    loadEquipos();
  } else {
    alert("Error al guardar equipo: " + res.message);
  }
}

// Guardar / Actualizar Cliente
async function guardarCliente(e) {
  e.preventDefault();

  const clienteData = {
    id_cliente: document.getElementById("cli_id_cliente") ? document.getElementById("cli_id_cliente").value : "",
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
    document.getElementById("form-nuevo-cliente").reset();
    if(document.getElementById("cli_id_cliente")) document.getElementById("cli_id_cliente").value = "";
    toggleForm("form-nuevo-cliente");
    loadClientesView();
  } else {
    alert("Error: " + res.message);
  }
}
