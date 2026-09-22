const TICKET_PRICE = 10000;

// Diccionario de imágenes de QR según el monto
const QR_IMAGES = {
  10000: 'qr_10000.jpg',
  20000: 'qr_20000.jpg',
  30000: 'qr_30000.jpg',
  40000: 'qr_40000.jpg',
  50000: 'qr_50000.jpg',
  0:     'qr_abierto.jpg' // QR sin monto asignado
};

let currentQty = 1;
let currentStep = 1;
let totalSteps = 1;
let secondaryAmount = 0;

function calculateTotal() {
  const input = document.getElementById('ticket-quantity');
  currentQty = parseInt(input.value);

  if (isNaN(currentQty) || currentQty < 1) {
    currentQty = 1;
    input.value = 1;
  }

  const total = currentQty * TICKET_PRICE;
  document.getElementById('total-price').innerText = `$${total.toLocaleString('es-CO')} COP`;
  document.getElementById('hidden-quantity').value = currentQty;
  document.getElementById('hidden-total').value = `$${total.toLocaleString('es-CO')} COP`;
}

function startPaymentProcess() {
  const total = currentQty * TICKET_PRICE;
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');

  if (currentQty <= 5) {
    // Caso 1: Pago único de 1 a 5 boletas
    totalSteps = 1;
    modalTitle.innerText = "Instrucción de Pago";
    modalBody.innerHTML = `Elegiste <strong>${currentQty} entrada(s)</strong> por un total de <strong>$${total.toLocaleString('es-CO')} COP</strong>.<br><br>A continuación se mostrará un código QR de Nequi generado exactamente por ese valor. Escanéalo desde tu app bancaria y confirma la transferencia.`;
  
  } else if (currentQty <= 10) {
    // Caso 2: Combinación de 2 pagos (Ejemplo: 7 boletas = 1 QR de $50.000 + 1 QR de $20.000)
    totalSteps = 2;
    secondaryAmount = (currentQty - 5) * TICKET_PRICE;
    
    modalTitle.innerText = "Instrucciones de Pago (2 Pasos)";
    modalBody.innerHTML = `Elegiste <strong>${currentQty} entradas</strong> por un total de <strong>$${total.toLocaleString('es-CO')} COP</strong>.<br><br>Para facilitar tu pago con valor exacto, realizaremos el cobro en <strong>dos transacciones seguidas</strong>:<br><br>
    1. Primer pago: QR por <strong>$50.000 COP</strong>.<br>
    2. Segundo pago: QR por <strong>$${secondaryAmount.toLocaleString('es-CO')} COP</strong>.<br><br>
    Presiona "Entendido" para escanear el primer código.`;
  
  } else {
    // Caso 3: Más de 10 entradas (QR abierto)
    totalSteps = 1;
    modalTitle.innerText = "Instrucción de Pago Manual";
    modalBody.innerHTML = `Elegiste <strong>${currentQty} entradas</strong> por un total de <strong>$${total.toLocaleString('es-CO')} COP</strong>.<br><br>A continuación te mostraremos un código QR abierto. Cuando lo escanees en tu aplicación bancaria, **deberás digitar manualmente** el valor total: <strong>$${total.toLocaleString('es-CO')} COP</strong>.`;
  }

  // Mostrar Modal
  document.getElementById('instruction-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('instruction-modal').style.display = 'none';
  document.getElementById('payment-card').style.display = 'block';
  document.getElementById('form-card').style.display = 'block';
  
  currentStep = 1;
  renderQRStep();

  // Desplazar la pantalla suavemente a la sección de pago
  document.getElementById('payment-card').scrollIntoView({ behavior: 'smooth' });
}

function renderQRStep() {
  const qrImg = document.getElementById('qr-image');
  const title = document.getElementById('qr-instruction-title');
  const desc = document.getElementById('qr-instruction-desc');
  const badge = document.getElementById('payment-step-indicator');
  const nextBtn = document.getElementById('next-qr-btn');

  if (currentQty <= 5) {
    const amount = currentQty * TICKET_PRICE;
    badge.innerText = "Pago único de valor exacto";
    qrImg.src = QR_IMAGES[amount];
    title.innerText = `Escanear QR de $${amount.toLocaleString('es-CO')} COP`;
    desc.innerText = "El valor se cargará automáticamente en tu app.";
    nextBtn.style.display = 'none';

  } else if (currentQty <= 10) {
    if (currentStep === 1) {
      badge.innerText = "Paso 1 de 2: Primer Pago";
      qrImg.src = QR_IMAGES[50000];
      title.innerText = "Escanear 1er QR: $50.000 COP";
      desc.innerText = "Realiza esta primera transferencia por $50.000.";
      nextBtn.style.display = 'block';
    } else {
      badge.innerText = "Paso 2 de 2: Segundo Pago";
      qrImg.src = QR_IMAGES[secondaryAmount];
      title.innerText = `Escanear 2do QR: $${secondaryAmount.toLocaleString('es-CO')} COP`;
      desc.innerText = `Ahora realiza la transferencia restante por $${secondaryAmount.toLocaleString('es-CO')}.`;
      nextBtn.style.display = 'none';
    }

  } else {
    const total = currentQty * TICKET_PRICE;
    badge.innerText = "Pago Manual";
    qrImg.src = QR_IMAGES[0]; // Carga la imagen del QR abierto
    title.innerText = "Escanear QR Abierto";
    desc.innerText = `RECUERDA DIGITAR MANUALLY: $${total.toLocaleString('es-CO')} COP en tu app.`;
    nextBtn.style.display = 'none';
  }
}

function showNextQR() {
  currentStep = 2;
  renderQRStep();
}
