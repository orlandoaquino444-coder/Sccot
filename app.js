// Orlando AI - Main Application Logic

let currentUser = null;
let currentSchoolId = null;
let currentSchoolName = "";
let chatHistory = []; // Formato Gemini: {role, parts}

// ========== AUTH ==========
auth.onAuthStateChanged(user => {
  currentUser = user;
  if (user) {
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("home-screen").classList.remove("hidden");
    document.getElementById("chat-screen").classList.add("hidden");
    document.getElementById("user-email").textContent = user.email || "Usuario";
    loadSchools();
  } else {
    document.getElementById("login-screen").classList.remove("hidden");
    document.getElementById("home-screen").classList.add("hidden");
    document.getElementById("chat-screen").classList.add("hidden");
  }
});

document.getElementById("btn-login").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const errEl = document.getElementById("login-error");
  errEl.textContent = "";

  if (!email || !password) {
    errEl.textContent = "Completa correo y contraseña";
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (e) {
    errEl.textContent = translateAuthError(e.code);
  }
});

document.getElementById("btn-register").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const errEl = document.getElementById("login-error");
  errEl.textContent = "";

  if (!email || !password) {
    errEl.textContent = "Completa correo y contraseña";
    return;
  }
  if (password.length < 6) {
    errEl.textContent = "La contraseña debe tener al menos 6 caracteres";
    return;
  }

  try {
    await auth.createUserWithEmailAndPassword(email, password);
  } catch (e) {
    errEl.textContent = translateAuthError(e.code);
  }
});

document.getElementById("btn-logout").addEventListener("click", () => {
  auth.signOut();
});

function translateAuthError(code) {
  const map = {
    "auth/user-not-found": "Usuario no encontrado",
    "auth/wrong-password": "Contraseña incorrecta",
    "auth/email-already-in-use": "Este correo ya está registrado",
    "auth/invalid-email": "Correo inválido",
    "auth/weak-password": "Contraseña demasiado débil",
    "auth/too-many-requests": "Demasiados intentos. Intenta más tarde",
    "auth/invalid-credential": "Credenciales incorrectas"
  };
  return map[code] || "Error de autenticación. Intenta de nuevo.";
}

// ========== SCHOOLS ==========
async function loadSchools() {
  const grid = document.getElementById("schools-grid");
  grid.innerHTML = '<p style="color:var(--text-muted)">Cargando colegios...</p>';

  try {
    const snap = await schoolsCol()
      .where("ownerId", "==", currentUser.uid)
      .get();

    grid.innerHTML = "";

    if (snap.empty) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-muted)">
          <p style="font-size:1.1rem;margin-bottom:0.5rem">Aún no tienes colegios</p>
          <p>Presiona el botón de abajo para agregar el primero</p>
        </div>`;
      return;
    }

    // Ordenar por fecha de creación (más reciente primero) en el cliente
    const docs = [];
    snap.forEach(doc => docs.push(doc));
    docs.sort((a, b) => {
      const ta = a.data().createdAt?.toMillis?.() || 0;
      const tb = b.data().createdAt?.toMillis?.() || 0;
      return tb - ta;
    });

    docs.forEach(doc => {
      const data = doc.data();
      const card = document.createElement("div");
      card.className = "school-card";
      card.dataset.id = doc.id;
      card.innerHTML = `
        <button class="delete-school" title="Eliminar colegio">✕</button>
        <div class="icon">🏫</div>
        <h3>${escapeHtml(data.name)}</h3>
      `;
      card.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete-school")) return;
        openSchool(doc.id, data.name);
      });
      card.querySelector(".delete-school").addEventListener("click", (e) => {
        e.stopPropagation();
        deleteSchool(doc.id, data.name);
      });
      grid.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    grid.innerHTML = `<p style="color:var(--danger)">Error al cargar colegios. Revisa las reglas de Firestore.</p>`;
  }
}

// Modal agregar colegio
document.getElementById("btn-add-school").addEventListener("click", () => {
  document.getElementById("school-name-input").value = "";
  document.getElementById("modal-add-school").classList.remove("hidden");
  document.getElementById("school-name-input").focus();
});

document.getElementById("btn-cancel-school").addEventListener("click", () => {
  document.getElementById("modal-add-school").classList.add("hidden");
});

document.getElementById("btn-save-school").addEventListener("click", async () => {
  const name = document.getElementById("school-name-input").value.trim();
  if (!name) {
    alert("Escribe el nombre del colegio");
    return;
  }

  try {
    await schoolsCol().add({
      name: name,
      ownerId: currentUser.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById("modal-add-school").classList.add("hidden");
    loadSchools();
  } catch (err) {
    console.error(err);
    alert("No se pudo guardar el colegio. Verifica las reglas de Firestore.");
  }
});

async function deleteSchool(id, name) {
  if (!confirm(`¿Eliminar el colegio "${name}" y todo su historial?\nEsta acción no se puede deshacer.`)) return;

  try {
    // Borrar mensajes (batch limitado)
    const msgs = await schoolMessages(id).limit(400).get();
    const batch = db.batch();
    msgs.forEach(d => batch.delete(d.ref));
    batch.delete(schoolMeta(id));
    await batch.commit();
    loadSchools();
  } catch (err) {
    console.error(err);
    alert("Error al eliminar. Intenta de nuevo.");
  }
}

// ========== CHAT ==========
async function openSchool(schoolId, name) {
  currentSchoolId = schoolId;
  currentSchoolName = name;
  chatHistory = [];

  document.getElementById("home-screen").classList.add("hidden");
  document.getElementById("chat-screen").classList.remove("hidden");
  document.getElementById("current-school-name").textContent = name;
  document.getElementById("chat-messages").innerHTML = "";

  // Cargar historial
  try {
    const snap = await schoolMessages(schoolId)
      .orderBy("timestamp", "asc")
      .limit(80)
      .get();

    const messagesEl = document.getElementById("chat-messages");

    if (snap.empty) {
      // Mensaje de bienvenida
      addMessageToUI("assistant", `¡Hola! Soy Orlando, tu asistente para el colegio **${name}**.

Puedes contarme:
• Asistencias y faltas del día
• Tareas entregadas o pendientes (con puntajes)
• Observaciones de conducta
• Pedirme promedios, reportes o explicaciones de calificaciones
• Generar exámenes, tareas o ejercicios

Todo lo que escribas aquí queda guardado solo para este colegio. ¿En qué te ayudo hoy?`);
    } else {
      snap.forEach(doc => {
        const m = doc.data();
        addMessageToUI(m.role === "user" ? "user" : "assistant", m.content, false);
        // Construir historial para Gemini
        chatHistory.push({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.content }]
        });
      });
      scrollToBottom();
    }
  } catch (err) {
    console.error(err);
    addMessageToUI("assistant", "Hubo un problema al cargar el historial. Puedes seguir escribiendo.");
  }

  document.getElementById("chat-input").focus();
}

document.getElementById("btn-back").addEventListener("click", () => {
  currentSchoolId = null;
  currentSchoolName = "";
  chatHistory = [];
  document.getElementById("chat-screen").classList.add("hidden");
  document.getElementById("home-screen").classList.remove("hidden");
  loadSchools();
});

// Enviar mensaje
async function sendMessage() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text || !currentSchoolId) return;

  input.value = "";
  autoResize(input);
  document.getElementById("btn-send").disabled = true;

  // UI usuario
  addMessageToUI("user", text);
  chatHistory.push({ role: "user", parts: [{ text }] });

  // Guardar en Firestore
  try {
    await schoolMessages(currentSchoolId).add({
      role: "user",
      content: text,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.error("Error guardando mensaje user:", e);
  }

  // Typing
  document.getElementById("typing").classList.remove("hidden");
  scrollToBottom();

  try {
    const reply = await callGemini(chatHistory.slice(0, -1), text); // history sin el último (ya se manda)

    document.getElementById("typing").classList.add("hidden");
    addMessageToUI("assistant", reply);

    chatHistory.push({ role: "model", parts: [{ text: reply }] });

    // Guardar respuesta
    await schoolMessages(currentSchoolId).add({
      role: "assistant",
      content: reply,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    document.getElementById("typing").classList.add("hidden");
    addMessageToUI("assistant", `⚠️ ${err.message || "No pude responder. Revisa la conexión o la API key de Gemini."}`);
  }

  document.getElementById("btn-send").disabled = false;
  document.getElementById("chat-input").focus();
}

document.getElementById("btn-send").addEventListener("click", sendMessage);

document.getElementById("chat-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

document.getElementById("chat-input").addEventListener("input", function () {
  autoResize(this);
});

// Quick actions
document.querySelectorAll(".quick-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const prompt = btn.dataset.prompt;
    document.getElementById("chat-input").value = prompt;
    autoResize(document.getElementById("chat-input"));
    document.getElementById("chat-input").focus();
  });
});

// Limpiar chat
document.getElementById("btn-clear-chat").addEventListener("click", async () => {
  if (!confirm("¿Borrar todo el historial de este colegio? Los datos de memoria se perderán.")) return;

  try {
    const snap = await schoolMessages(currentSchoolId).limit(500).get();
    const batch = db.batch();
    snap.forEach(d => batch.delete(d.ref));
    await batch.commit();

    chatHistory = [];
    document.getElementById("chat-messages").innerHTML = "";
    addMessageToUI("assistant", `Historial limpiado. ¿En qué te ayudo ahora para **${currentSchoolName}**?`);
  } catch (e) {
    alert("No se pudo limpiar el chat.");
  }
});

// ========== GENERAR MATERIAL ==========
document.getElementById("btn-generate-exam").addEventListener("click", () => {
  document.getElementById("modal-generate").classList.remove("hidden");
});

document.getElementById("btn-cancel-gen").addEventListener("click", () => {
  document.getElementById("modal-generate").classList.add("hidden");
});

document.getElementById("btn-do-generate").addEventListener("click", async () => {
  const type = document.getElementById("gen-type").value;
  const subject = document.getElementById("gen-subject").value.trim();
  const grade = document.getElementById("gen-grade").value.trim();
  const count = document.getElementById("gen-count").value || 10;
  const extra = document.getElementById("gen-extra").value.trim();

  if (!subject) {
    alert("Indica la materia o tema");
    return;
  }

  document.getElementById("modal-generate").classList.add("hidden");
  document.getElementById("typing").classList.remove("hidden");
  scrollToBottom();

  try {
    const content = await generateMaterial(type, subject, grade, count, extra);
    document.getElementById("typing").classList.add("hidden");

    // Mostrar en modal de resultado
    document.getElementById("result-title").textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} — ${subject}`;
    document.getElementById("result-content").textContent = content;
    document.getElementById("modal-result").classList.remove("hidden");

    // También agregar al chat como mensaje de la IA
    const summary = `📄 He generado un ${type} de **${subject}** (${count} ítems).\n\nPuedes exportarlo a PDF, Word o imagen desde el panel que se abrió.`;
    addMessageToUI("assistant", summary + "\n\n---\n" + content.slice(0, 600) + (content.length > 600 ? "…" : ""));
    chatHistory.push({ role: "model", parts: [{ text: summary + "\n\n" + content }] });

    await schoolMessages(currentSchoolId).add({
      role: "assistant",
      content: summary + "\n\n" + content,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (err) {
    document.getElementById("typing").classList.add("hidden");
    addMessageToUI("assistant", `No pude generar el material: ${err.message}`);
  }
});

// Export buttons
document.getElementById("btn-export-pdf").addEventListener("click", () => {
  const title = document.getElementById("result-title").textContent;
  const content = document.getElementById("result-content").textContent;
  exportToPDF(title, content);
});

document.getElementById("btn-export-word").addEventListener("click", async () => {
  const title = document.getElementById("result-title").textContent;
  const content = document.getElementById("result-content").textContent;
  await exportToWord(title, content);
});

document.getElementById("btn-export-image").addEventListener("click", () => {
  exportToImage("result-content", document.getElementById("result-title").textContent);
});

document.getElementById("btn-copy-text").addEventListener("click", async () => {
  const content = document.getElementById("result-content").textContent;
  await copyToClipboard(content);
  alert("Texto copiado al portapapeles");
});

document.getElementById("btn-close-result").addEventListener("click", () => {
  document.getElementById("modal-result").classList.add("hidden");
});

// ========== HELPERS UI ==========
function addMessageToUI(role, content, scroll = true) {
  const messagesEl = document.getElementById("chat-messages");
  const div = document.createElement("div");
  div.className = `message ${role}`;

  const avatar = role === "user" ? "👤" : "🎓";
  // Convertir **negrita** simple a HTML
  let htmlContent = escapeHtml(content)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");

  div.innerHTML = `
    <div class="avatar">${avatar}</div>
    <div class="bubble">${htmlContent}</div>
  `;
  messagesEl.appendChild(div);
  if (scroll) scrollToBottom();
}

function scrollToBottom() {
  const container = document.querySelector(".chat-container");
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Cerrar modales con Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.getElementById("modal-add-school").classList.add("hidden");
    document.getElementById("modal-generate").classList.add("hidden");
    document.getElementById("modal-result").classList.add("hidden");
  }
});
