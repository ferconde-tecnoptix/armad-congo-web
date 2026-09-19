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

// Cargar y Renderizar Formato PL-010-F5
async function viewHojaVida(idEquipo) {
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
            <div class="hv-cell"><span class="hv-label">Nombre Cliente:</span> ${cliente.nombre_cliente || ''}</div>
            <div class="hv-cell"><span class="hv-label">Ubicación:</span> ${cliente.ubicacion || ''}</div>
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
            <div class="hv-cell"><span class="hv-label">Frecuencia:</span> ${equipo.frecuencia_trabajo || ''}</div>
          </div>
          <div class="hv-row">
            <div class="hv-cell"><span class="hv-label">Potencia Salida:</span> ${equipo.potencia_salida || ''}</div>
            <div class="hv-cell"><span class="hv-label">Temperatura:</span> ${equipo.temperatura || ''}</div>
            <div class="hv-cell"><span class="hv-label">Humedad:</span> ${equipo.humedad || ''}</div>
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

        <div class="hv-section-title">HISTORIAL DE MANTENIMIENTO / EVENTOS</div>
        <table class="data-table" style="font-size:0.75rem; margin-top: 4px;">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Descripción</th>
              <th>Técnico</th>
              <th>Reporte Ext.</th>
            </tr>
          </thead>
          <tbody>
            ${eventos.length > 0 ? eventos.map(ev => `
              <tr>
                <td>${ev.fecha_evento}</td>
                <td>${ev.tipo_evento}</td>
                <td>${ev.descripcion_trabajo}</td>
                <td>${ev.tecnico_responsable}</td>
                <td>${ev.url_reporte_pdf ? `<a href="${ev.url_reporte_pdf}" target="_blank">Ver Enlace</a>` : 'N/A'}</td>
              </tr>
            `).join('') : '<tr><td colspan="5">No hay eventos registrados.</td></tr>'}
          </tbody>
        </table>
      `;
    }
  } catch (err) {
    container.innerHTML = "<p style='color:red;'>Error al generar la Hoja de Vida.</p>";
  }
}
