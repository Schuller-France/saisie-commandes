const allClients = window.APP_DATA?.clients || [];
const products = window.APP_DATA?.products || [];
const prenetClients = window.PRENET_DATA?.clients || [];
const tariffConfig = window.TARIF_CONFIG || {};

let selectedClient = null;
let lines = [];
let currentUser = null;
let visibleClients = [];
let activeHistoryOrderId = null;
let selectedTariff = null;

const formatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

const clientSearch = document.querySelector("#clientSearch");
const clientSuggestions = document.querySelector("#clientSuggestions");
const selectedClientBox = document.querySelector("#selectedClient");
const clientStatus = document.querySelector("#clientStatus");
const orderLines = document.querySelector("#orderLines");
const productRefs = document.querySelector("#productRefs");
const summaryClient = document.querySelector("#summaryClient");
const summaryLines = document.querySelector("#summaryLines");
const summaryTotal = document.querySelector("#summaryTotal");
const orderNote = document.querySelector("#orderNote");
const loginView = document.querySelector("#loginView");
const appView = document.querySelector("#appView");
const loginForm = document.querySelector("#loginForm");
const loginId = document.querySelector("#loginId");
const loginPassword = document.querySelector("#loginPassword");
const loginError = document.querySelector("#loginError");
const loginSubmitButton = document.querySelector("#loginSubmitButton");
const forgotPasswordButton = document.querySelector("#forgotPasswordButton");
const passwordResetCard = document.querySelector("#passwordResetCard");
const passwordResetRequestForm = document.querySelector("#passwordResetRequestForm");
const passwordResetConfirmForm = document.querySelector("#passwordResetConfirmForm");
const passwordResetEmail = document.querySelector("#passwordResetEmail");
const passwordResetCode = document.querySelector("#passwordResetCode");
const newPassword = document.querySelector("#newPassword");
const confirmNewPassword = document.querySelector("#confirmNewPassword");
const passwordResetStatus = document.querySelector("#passwordResetStatus");
const requestResetButton = document.querySelector("#requestResetButton");
const confirmResetButton = document.querySelector("#confirmResetButton");
const backToLoginButton = document.querySelector("#backToLoginButton");
const logoutButton = document.querySelector("#logoutButton");
const sessionLabel = document.querySelector("#sessionLabel");
const homeTab = document.querySelector("#homeTab");
const orderTab = document.querySelector("#orderTab");
const historyTab = document.querySelector("#historyTab");
const prenetTab = document.querySelector("#prenetTab");
const tarifTab = document.querySelector("#tarifTab");
const homeView = document.querySelector("#homeView");
const orderView = document.querySelector("#orderView");
const historyView = document.querySelector("#historyView");
const prenetView = document.querySelector("#prenetView");
const tarifView = document.querySelector("#tarifView");
const historyList = document.querySelector("#historyList");
const historyDetail = document.querySelector("#historyDetail");
const historyCount = document.querySelector("#historyCount");
const prenetClientSearch = document.querySelector("#prenetClientSearch");
const prenetClientSuggestions = document.querySelector("#prenetClientSuggestions");
const prenetResult = document.querySelector("#prenetResult");
const prenetSector = document.querySelector("#prenetSector");
const selectTarif5010 = document.querySelector("#selectTarif5010");
const selectTarifBase = document.querySelector("#selectTarifBase");
const selectCatalogue2026 = document.querySelector("#selectCatalogue2026");
const tarifSendForm = document.querySelector("#tarifSendForm");
const tarifRecipient = document.querySelector("#tarifRecipient");
const tarifSendStatus = document.querySelector("#tarifSendStatus");
const sendTarifButton = document.querySelector("#sendTarifButton");
const selectedTarifName = document.querySelector("#selectedTarifName");

async function postService(parameters) {
  if (!tariffConfig.endpoint) throw new Error("Service indisponible.");
  const response = await fetch(tariffConfig.endpoint, {
    method: "POST",
    body: new URLSearchParams(parameters),
  });
  const result = JSON.parse(await response.text());
  if (!result.ok) throw new Error(result.message || "Opération impossible.");
  return result;
}

function resetTarifForm() {
  tarifSendForm.reset();
  tarifSendForm.classList.add("is-hidden");
  tarifSendStatus.textContent = "";
  tarifSendStatus.className = "tarif-send-status";
  sendTarifButton.disabled = false;
  sendTarifButton.textContent = "Envoyer le document";
}

function openTarifForm(tariffId) {
  selectedTariff = (tariffConfig.tariffs || []).find((tariff) => tariff.id === tariffId) || null;
  if (!selectedTariff) return;
  selectedTarifName.textContent = selectedTariff.name;
  tarifSendForm.classList.remove("is-hidden");
  tarifSendStatus.textContent = tariffConfig.endpoint
    ? ""
    : "L’envoi sera disponible après l’autorisation Google de l’adresse expéditrice.";
  requestAnimationFrame(() => tarifRecipient.focus());
}

async function sendTarif(event) {
  event.preventDefault();
  const recipient = tarifRecipient.value.trim();
  tarifSendStatus.className = "tarif-send-status";

  if (!tarifRecipient.checkValidity()) {
    tarifSendStatus.textContent = "Saisissez une adresse e-mail valide.";
    tarifSendStatus.classList.add("is-error");
    tarifRecipient.focus();
    return;
  }

  if (!tariffConfig.endpoint) {
    tarifSendStatus.textContent = "L’adresse d’envoi doit d’abord être autorisée par Google.";
    tarifSendStatus.classList.add("is-warning");
    return;
  }

  sendTarifButton.disabled = true;
  sendTarifButton.textContent = "Envoi en cours…";
  tarifSendStatus.textContent = "";

  try {
    const body = new URLSearchParams({ recipient, tariff: selectedTariff?.id || "" });
    const response = await fetch(tariffConfig.endpoint, { method: "POST", body });
    const result = JSON.parse(await response.text());
    if (!result.ok) throw new Error(result.message || "Envoi impossible");
    tarifSendStatus.textContent = `${selectedTariff.name} envoyé à ${recipient}.`;
    tarifSendStatus.classList.add("is-success");
    tarifRecipient.value = "";
  } catch (error) {
    tarifSendStatus.textContent = "L’envoi n’a pas pu être effectué. Réessayez dans quelques instants.";
    tarifSendStatus.classList.add("is-error");
  } finally {
    sendTarifButton.disabled = false;
    sendTarifButton.textContent = "Envoyer le document";
  }
}

function getVisiblePrenetClients() {
  if (!currentUser) return [];
  const allowedCodes = new Set(visibleClients.map((client) => normalize(client.code)));
  const allowedSectors = new Set((currentUser.sectors || [currentUser.sector]).map(normalize));
  return prenetClients.filter((client) => {
    const sameSector = allowedSectors.has(normalize(client.sector || ""));
    const allowedClient = !client.code || allowedCodes.has(normalize(client.code));
    return sameSector && allowedClient;
  });
}

function renderPrenetEmpty() {
  prenetClientSearch.value = "";
  prenetClientSuggestions.innerHTML = "";
  prenetClientSuggestions.classList.remove("is-open");
  prenetSector.textContent = currentUser?.sectors?.join(" + ") || currentUser?.sector || "Secteur";
  prenetResult.innerHTML = `
    <div class="prenet-empty">
      <strong>Sélectionnez un client</strong>
      <span>Ses nouveaux prix nets apparaîtront ici, classés par référence.</span>
    </div>`;
}

function renderPrenetSuggestions(query) {
  const cleanQuery = normalize(query.trim());
  prenetClientSuggestions.innerHTML = "";
  if (!cleanQuery) {
    prenetClientSuggestions.classList.remove("is-open");
    return;
  }

  const matches = getVisiblePrenetClients()
    .filter((client) => normalize(`${client.code || ""} ${client.name || ""}`).includes(cleanQuery))
    .slice(0, 12);

  if (!matches.length) {
    prenetClientSuggestions.innerHTML = '<div class="suggestion-empty">Aucun client avec des prix nets dans votre secteur.</div>';
    prenetClientSuggestions.classList.add("is-open");
    return;
  }

  matches.forEach((client) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggestion";
    button.innerHTML = `<strong>${escapeHtml(client.name || "Client")}</strong><span>${escapeHtml(client.code || "")}</span>`;
    button.addEventListener("click", () => selectPrenetClient(client));
    prenetClientSuggestions.appendChild(button);
  });
  prenetClientSuggestions.classList.add("is-open");
}

function renderPrenetTable(title, entries, statusClass) {
  if (!entries.length) return "";
  return `
    <section class="prenet-group">
      <div class="prenet-group-heading">
        <h3>${escapeHtml(title)}</h3>
        <span class="prenet-count">${entries.length} référence${entries.length > 1 ? "s" : ""}</span>
      </div>
      <div class="prenet-table-wrap">
        <table class="prenet-table">
          <thead><tr><th>Référence</th><th>Quantité</th><th>Prix net</th><th>Statut</th></tr></thead>
          <tbody>${entries.map((entry) => `
            <tr>
              <td><strong>${escapeHtml(entry.ref || "-")}</strong>${entry.designation ? `<small>${escapeHtml(entry.designation)}</small>` : ""}</td>
              <td>${formatNumber(entry.quantity)}</td>
              <td><strong>${escapeHtml(formatter.format(Number(entry.price) || 0))}</strong></td>
              <td><span class="prenet-badge ${statusClass}">${escapeHtml(entry.status || title)}</span></td>
            </tr>`).join("")}</tbody>
        </table>
      </div>
    </section>`;
}

function selectPrenetClient(client) {
  prenetClientSearch.value = `${client.name || ""}${client.code ? ` · ${client.code}` : ""}`;
  prenetClientSuggestions.classList.remove("is-open");
  const entries = Array.isArray(client.entries) ? [...client.entries] : [];
  entries.sort((a, b) => (a.ref || "").localeCompare(b.ref || "", "fr", { numeric: true }));
  const newEntries = entries.filter((entry) => !normalize(entry.status || "").startsWith("ancien"));

  prenetResult.innerHTML = `
    <header class="prenet-client-header">
      <div><p class="step">${escapeHtml(client.code || currentUser.sector)}</p><h2>${escapeHtml(client.name || "Client")}</h2></div>
      <div class="prenet-update"><span>Mise à jour</span><strong>${escapeHtml(window.PRENET_DATA?.updatedAt || "-")}</strong></div>
    </header>
    ${entries.length
      ? renderPrenetTable("Nouveaux prix nets", newEntries, "is-new")
      : '<div class="prenet-empty"><strong>Aucun prix net</strong><span>Aucune ligne disponible pour ce client.</span></div>'}`;
}

function getDashboardStats(user) {
  const stats = window.APP_STATS || {};
  if (stats.byUser?.[user.id]) return stats.byUser[user.id];
  if (user.id === "flo") return stats.default || {};
  return {
    updatedAt: "À venir",
    periodLabel: `Les statistiques ${user.sectors.join(" + ")} seront affichées dès leur import.`,
    kpis: { revenue: 0, clients: visibleClients.length, averageClient: 0 },
    salesTrend: [],
    goals: [],
    topClients: [],
  };
}

function formatNumber(value) {
  return new Intl.NumberFormat("fr-FR").format(Number(value) || 0);
}

function renderDashboard(user) {
  const stats = getDashboardStats(user);
  const kpis = stats.kpis || {};
  const trend = Array.isArray(stats.salesTrend) ? stats.salesTrend : [];
  const goals = Array.isArray(stats.goals) ? stats.goals : [];
  const topClients = Array.isArray(stats.topClients) ? stats.topClients : [];

  document.querySelector("#dashboardUpdatedAt").textContent = stats.updatedAt || "En attente";
  document.querySelector("#dashboardPeriod").textContent = stats.periodLabel || "Vue synthétique de votre activité commerciale.";
  document.querySelector("#metricOrders").textContent = formatter.format(Number(kpis.revenue) || 0);
  document.querySelector("#metricRevenue").textContent = formatNumber(kpis.clients);
  document.querySelector("#metricClients").textContent = formatter.format(Number(kpis.averageClient) || 0);
  document.querySelector("#metricOrdersNote").textContent = kpis.revenueNote || "Secteur du commercial";
  document.querySelector("#metricRevenueNote").textContent = kpis.clientsNote || "Clients avec CA prévisionnel";
  document.querySelector("#metricClientsNote").textContent = kpis.averageNote || "Valeur moyenne du portefeuille";

  const maxTrend = Math.max(...trend.map((item) => Number(item.value) || 0), 1);
  document.querySelector("#trendTotal").textContent = trend.length
    ? formatter.format(trend.reduce((sum, item) => sum + (Number(item.value) || 0), 0))
    : "Aucune donnée";
  document.querySelector("#salesChart").innerHTML = trend.length
    ? trend.map((item) => {
        const value = Number(item.value) || 0;
        const height = Math.max((value / maxTrend) * 100, value > 0 ? 6 : 0);
        return `<div class="chart-column"><span class="chart-value">${escapeHtml(formatter.format(value))}</span><div class="chart-bar-track"><div class="chart-bar" style="height:${height}%"></div></div><strong>${escapeHtml(item.label || "-")}</strong></div>`;
      }).join("")
    : '<div class="dashboard-empty">Aucune donnée géographique.</div>';

  document.querySelector("#goalList").innerHTML = goals.length
    ? goals.map((goal) => {
        const current = Number(goal.current) || 0;
        const target = Number(goal.target) || 0;
        const percent = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
        const displayCurrent = goal.format === "currency" ? formatter.format(current) : formatNumber(current);
        const displayTarget = goal.format === "currency" ? formatter.format(target) : formatNumber(target);
        return `<div class="goal-item"><div><strong>${escapeHtml(goal.label || "Indicateur")}</strong><span>${escapeHtml(displayCurrent)}</span></div><div class="goal-track"><span style="width:${percent}%"></span></div><small>${escapeHtml(goal.note || `${percent}% du CA total`)}</small></div>`;
      }).join("")
    : '<div class="dashboard-empty">Aucun objectif renseigné.</div>';

  document.querySelector("#topClientsBody").innerHTML = topClients.length
    ? topClients.slice(0, 8).map((client) => `<tr><td><strong>${escapeHtml(client.name || "-")}</strong><small>${escapeHtml(client.code || "")}</small></td><td>${escapeHtml(formatter.format(Number(client.revenue) || 0))}</td></tr>`).join("")
    : '<tr><td colspan="2" class="dashboard-empty">Aucune donnée client.</td></tr>';

}

function escapeHtml(value) {
  return value
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value) {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

products.forEach((product) => {
  const option = document.createElement("option");
  option.value = product.ref;
  option.label = `${product.ref} - ${product.name} - ${product.gencod}`;
  productRefs.appendChild(option);
});

function renderClientSuggestions(query) {
  const cleanQuery = normalize(query.trim());
  clientSuggestions.innerHTML = "";

  if (!cleanQuery) {
    clientSuggestions.classList.remove("is-open");
    return;
  }

  const matches = visibleClients
    .filter((client) => {
      const searchable = [
        client.code,
        client.name,
        client.billingCity,
        client.billingZip,
        client.deliveryCity,
        client.deliveryZip,
        client.sector,
      ].join(" ");
      return normalize(searchable).includes(cleanQuery);
    })
    .slice(0, 10);

  if (!matches.length) {
    clientSuggestions.classList.remove("is-open");
    return;
  }

  matches.forEach((client) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggestion";
    button.innerHTML = `
      <strong>${escapeHtml(client.name)}</strong>
      <span>${escapeHtml(client.code)} - ${escapeHtml(client.billingZip)} ${escapeHtml(client.billingCity)} - ${escapeHtml(client.sector)}</span>
    `;
    button.addEventListener("click", () => selectClient(client));
    clientSuggestions.appendChild(button);
  });

  clientSuggestions.classList.add("is-open");
}

function getClientsForUser(user) {
  const allowedSectors = new Set((user.sectors || [user.sector]).map(normalize));
  return allClients.filter((client) => allowedSectors.has(normalize(client.sector)));
}

function closePasswordReset() {
  passwordResetCard.classList.add("is-hidden");
  loginForm.classList.remove("is-hidden");
  passwordResetRequestForm.reset();
  passwordResetConfirmForm.reset();
  passwordResetRequestForm.classList.remove("is-hidden");
  passwordResetConfirmForm.classList.add("is-hidden");
  passwordResetStatus.textContent = "";
  passwordResetStatus.className = "reset-status";
  requestAnimationFrame(() => loginId.focus());
}

function openPasswordReset() {
  loginForm.classList.add("is-hidden");
  passwordResetCard.classList.remove("is-hidden");
  passwordResetStatus.textContent = "";
  passwordResetStatus.className = "reset-status";
  if (loginId.value.includes("@")) passwordResetEmail.value = loginId.value.trim();
  requestAnimationFrame(() => passwordResetEmail.focus());
}

function showLogin() {
  currentUser = null;
  visibleClients = [];
  activeHistoryOrderId = null;
  sessionStorage.removeItem("orderEntryUser");
  loginView.classList.remove("is-hidden");
  appView.classList.add("is-hidden");
  loginId.value = "";
  loginPassword.value = "";
  loginError.textContent = "";
  loginError.className = "login-error";
  closePasswordReset();
  resetOrder();
  renderPrenetEmpty();
  resetTarifForm();
  requestAnimationFrame(() => loginId.focus());
}

function showApp(user) {
  const sectors = Array.isArray(user.sectors) && user.sectors.length ? user.sectors : [user.sector].filter(Boolean);
  currentUser = { ...user, sectors, sector: sectors[0] || "Secteur" };
  visibleClients = getClientsForUser(currentUser);
  sessionStorage.setItem("orderEntryUser", JSON.stringify(currentUser));
  sessionLabel.textContent = `${currentUser.name} - ${currentUser.sectors.join(" + ")}`;
  loginView.classList.add("is-hidden");
  appView.classList.remove("is-hidden");
  resetOrder();
  renderDashboard(currentUser);
  renderPrenetEmpty();
  setActiveTab("home");
  renderOrderHistory();
}

async function submitLogin() {
  loginError.textContent = "";
  loginError.className = "login-error";
  loginSubmitButton.disabled = true;
  loginSubmitButton.textContent = "Connexion…";
  try {
    const result = await postService({
      action: "login",
      identifier: loginId.value.trim(),
      password: loginPassword.value,
    });
    showApp(result.user);
  } catch (error) {
    loginError.textContent = error.message || "Connexion impossible.";
    loginPassword.select();
  } finally {
    loginSubmitButton.disabled = false;
    loginSubmitButton.textContent = "Se connecter";
  }
}

async function requestPasswordReset(event) {
  event.preventDefault();
  passwordResetStatus.textContent = "";
  passwordResetStatus.className = "reset-status";
  requestResetButton.disabled = true;
  requestResetButton.textContent = "Envoi en cours…";
  try {
    const result = await postService({ action: "requestReset", email: passwordResetEmail.value.trim() });
    passwordResetStatus.textContent = result.message;
    passwordResetStatus.classList.add("is-success");
    passwordResetRequestForm.classList.add("is-hidden");
    passwordResetConfirmForm.classList.remove("is-hidden");
    requestAnimationFrame(() => passwordResetCode.focus());
  } catch (error) {
    passwordResetStatus.textContent = error.message || "La demande n’a pas pu être envoyée.";
    passwordResetStatus.classList.add("is-error");
  } finally {
    requestResetButton.disabled = false;
    requestResetButton.textContent = "Recevoir mon code";
  }
}

async function confirmPasswordReset(event) {
  event.preventDefault();
  passwordResetStatus.textContent = "";
  passwordResetStatus.className = "reset-status";
  if (newPassword.value !== confirmNewPassword.value) {
    passwordResetStatus.textContent = "Les deux mots de passe ne correspondent pas.";
    passwordResetStatus.classList.add("is-error");
    confirmNewPassword.focus();
    return;
  }

  confirmResetButton.disabled = true;
  confirmResetButton.textContent = "Modification…";
  try {
    const result = await postService({
      action: "confirmReset",
      email: passwordResetEmail.value.trim(),
      code: passwordResetCode.value.trim(),
      newPassword: newPassword.value,
    });
    loginId.value = result.identifier || passwordResetEmail.value.trim();
    closePasswordReset();
    loginError.textContent = "Mot de passe modifié. Vous pouvez vous connecter.";
    loginError.classList.add("is-success");
    loginPassword.focus();
  } catch (error) {
    passwordResetStatus.textContent = error.message || "Le mot de passe n’a pas pu être modifié.";
    passwordResetStatus.classList.add("is-error");
  } finally {
    confirmResetButton.disabled = false;
    confirmResetButton.textContent = "Modifier mon mot de passe";
  }
}

function restoreSession() {
  try {
    const savedUser = JSON.parse(sessionStorage.getItem("orderEntryUser") || "null");
    if (savedUser?.id) {
      showApp(savedUser);
      return;
    }
  } catch (error) {
    sessionStorage.removeItem("orderEntryUser");
  }

  loginView.classList.remove("is-hidden");
  appView.classList.add("is-hidden");
  requestAnimationFrame(() => loginId.focus());
}

function selectClient(client) {
  selectedClient = client;
  clientSearch.value = client.name;
  clientSuggestions.classList.remove("is-open");
  clientStatus.textContent = "Client selectionne";
  clientStatus.classList.add("is-ready");
  selectedClientBox.innerHTML = `
    <strong>${escapeHtml(client.name)}</strong>
    <span>${escapeHtml(client.code)}</span>
    <span>Facturation : ${escapeHtml(client.billingAddress)}</span>
    <span>${escapeHtml(client.billingZip)} ${escapeHtml(client.billingCity)}</span>
    <span>Livraison : ${escapeHtml(client.deliveryAddress)}</span>
    <span>${escapeHtml(client.deliveryZip)} ${escapeHtml(client.deliveryCity)}</span>
    <span>${escapeHtml(client.sector)}</span>
    <span>${escapeHtml(client.phone)} - ${escapeHtml(client.email)}</span>
  `;
  updateSummary();
}

function addLine() {
  const line = {
    id: crypto.randomUUID(),
    ref: "",
    qty: 1,
  };
  lines.push(line);
  renderLines();
  return line.id;
}

function findProduct(ref) {
  const query = normalize(ref.trim());
  return products.find((product) => normalize(product.ref) === query || normalize(product.gencod) === query);
}

function defaultQuantityForProduct(product) {
  return Math.max(Number(product?.udv) || 1, 1);
}

function setLineReference(id, ref) {
  lines = lines.map((line) => {
    if (line.id !== id) {
      return line;
    }

    const product = findProduct(ref);
    const referenceChanged = normalize(line.ref) !== normalize(ref);
    return {
      ...line,
      ref,
      qty: product && referenceChanged ? defaultQuantityForProduct(product) : line.qty,
    };
  });
  renderLines();
}

function updateLine(id, changes) {
  lines = lines.map((line) => (line.id === id ? { ...line, ...changes } : line));
  renderLines();
}

function removeLine(id) {
  lines = lines.filter((line) => line.id !== id);
  if (!lines.length) {
    addLine();
    return;
  }
  renderLines();
}

function focusLineRef(id) {
  requestAnimationFrame(() => {
    const row = [...orderLines.querySelectorAll("tr")].find((item) => item.dataset.lineId === id);
    const input = row?.querySelector(".ref-cell input");
    if (input) {
      input.focus();
      input.select();
    }
  });
}

function focusLineQty(id) {
  requestAnimationFrame(() => {
    const row = [...orderLines.querySelectorAll("tr")].find((item) => item.dataset.lineId === id);
    const input = row?.querySelector(".qty-cell input");
    if (input) {
      input.focus();
      input.select();
    }
  });
}

function getNextLineId(currentId) {
  const index = lines.findIndex((line) => line.id === currentId);
  const currentLine = lines[index];

  if (!currentLine || !findProduct(currentLine.ref) || Number(currentLine.qty) <= 0) {
    return null;
  }

  const nextLine = lines[index + 1];
  if (nextLine) {
    return nextLine.id;
  }

  const newLine = {
    id: crypto.randomUUID(),
    ref: "",
    qty: 1,
  };
  lines.push(newLine);
  return newLine.id;
}

function completeQuantity(id, qty) {
  lines = lines.map((line) => (line.id === id ? { ...line, qty } : line));
  const nextLineId = getNextLineId(id);
  renderLines();
  if (nextLineId) {
    focusLineRef(nextLineId);
  }
}

function renderLines() {
  orderLines.innerHTML = "";

  lines.forEach((line) => {
    const product = findProduct(line.ref);
    const quantity = Math.max(Number(line.qty) || 0, 0);
    const lineTotal = product ? product.price * quantity : 0;
    const row = document.createElement("tr");
    row.dataset.lineId = line.id;

    row.innerHTML = `
      <td class="ref-cell">
        <input value="${escapeHtml(line.ref)}" list="productRefs" inputmode="numeric" aria-label="Reference produit" />
      </td>
      <td class="gencod-cell">${product ? escapeHtml(product.gencod) : "-"}</td>
      <td class="name-cell ${product ? "" : "empty-product"}">${product ? escapeHtml(product.name) : "Saisir une reference"}</td>
      <td class="udv-cell">${product ? escapeHtml(product.udv || "-") : "-"}</td>
      <td class="qty-cell">
        <input value="${escapeHtml(line.qty)}" type="number" min="1" step="1" aria-label="Quantite" />
      </td>
      <td class="price-cell">${product ? formatter.format(product.price) : "-"}</td>
      <td class="line-total-cell">${product ? formatter.format(lineTotal) : "-"}</td>
      <td>
        <button class="remove-line" type="button" aria-label="Supprimer la ligne">x</button>
      </td>
    `;

    const refInput = row.querySelector("td:first-child input");
    const qtyInput = row.querySelector(".qty-cell input");
    const removeButton = row.querySelector(".remove-line");

    refInput.addEventListener("change", (event) => setLineReference(line.id, event.target.value.trim()));
    refInput.addEventListener("blur", (event) => setLineReference(line.id, event.target.value.trim()));
    refInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        setLineReference(line.id, event.target.value.trim());
        focusLineQty(line.id);
      }
    });
    qtyInput.addEventListener("change", (event) => {
      completeQuantity(line.id, Number(event.target.value) || 1);
    });
    qtyInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const qty = Number(event.target.value) || 1;
        completeQuantity(line.id, qty);
      }
    });
    qtyInput.addEventListener("blur", (event) => {
      const qty = Number(event.target.value) || 1;
      completeQuantity(line.id, qty);
    });
    removeButton.addEventListener("click", () => removeLine(line.id));

    orderLines.appendChild(row);
  });

  updateSummary();
}

function getValidLines() {
  return lines
    .map((line) => ({
      ...line,
      product: findProduct(line.ref),
      qty: Math.max(Number(line.qty) || 0, 0),
    }))
    .filter((line) => line.product && line.qty > 0);
}

function getTotal() {
  return getValidLines().reduce((sum, line) => sum + line.product.price * line.qty, 0);
}

function updateSummary() {
  const validLines = getValidLines();
  summaryClient.textContent = selectedClient ? selectedClient.name : "Non selectionne";
  summaryLines.textContent = validLines.length.toString();
  summaryTotal.textContent = formatter.format(getTotal());
}

function getStoredOrders() {
  try {
    return JSON.parse(localStorage.getItem("schullerOrders") || "[]");
  } catch {
    return [];
  }
}

function saveStoredOrders(orders) {
  localStorage.setItem("schullerOrders", JSON.stringify(orders));
}

function buildOrderSnapshot({ orderNumber, orderDate, note, validLines }) {
  const isoDate = new Date().toISOString();
  return {
    id: orderNumber,
    orderNumber,
    orderDate,
    isoDate,
    dayKey: isoDate.slice(0, 10),
    user: currentUser ? { id: currentUser.id, name: currentUser.name, sector: currentUser.sector } : null,
    client: { ...selectedClient },
    note,
    total: getTotal(),
    lines: validLines.map((line) => ({
      ref: line.product.ref,
      gencod: line.product.gencod,
      name: line.product.name,
      udv: line.product.udv || "",
      qty: line.qty,
      price: line.product.price,
      total: line.product.price * line.qty,
    })),
  };
}

function storeOrder(order) {
  const orders = getStoredOrders().filter((item) => item.id !== order.id);
  orders.push(order);
  saveStoredOrders(orders);
  activeHistoryOrderId = order.id;
  renderOrderHistory();
}

function formatStoredDate(dayKey) {
  const [year, month, day] = dayKey.split("-");
  return `${day}/${month}/${year}`;
}

function getVisibleStoredOrders() {
  const orders = getStoredOrders();
  if (!currentUser) {
    return [];
  }

  return orders
    .filter((order) => order.user?.id === currentUser.id)
    .sort((a, b) => b.isoDate.localeCompare(a.isoDate));
}

function renderOrderHistory() {
  const orders = getVisibleStoredOrders();
  historyCount.textContent = `${orders.length} commande${orders.length > 1 ? "s" : ""}`;
  historyList.innerHTML = "";

  if (!orders.length) {
    historyList.innerHTML = '<div class="history-day">Aucune commande enregistrée</div>';
    historyDetail.innerHTML = "<span>Les commandes générées apparaîtront ici.</span>";
    return;
  }

  let currentDay = "";
  orders.forEach((order) => {
    if (order.dayKey !== currentDay) {
      currentDay = order.dayKey;
      const day = document.createElement("div");
      day.className = "history-day";
      day.textContent = formatStoredDate(order.dayKey);
      historyList.appendChild(day);
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = `history-item${order.id === activeHistoryOrderId ? " is-active" : ""}`;
    button.innerHTML = `
      <span>
        <strong>${escapeHtml(order.client.name)}</strong>
        <small>${escapeHtml(order.orderNumber)} - ${escapeHtml(order.lines.length)} ligne${order.lines.length > 1 ? "s" : ""}</small>
      </span>
      <span class="history-item-total">${formatter.format(order.total)}</span>
    `;
    button.addEventListener("click", () => {
      activeHistoryOrderId = order.id;
      renderOrderHistory();
      renderOrderDetail(order);
    });
    historyList.appendChild(button);
  });

  const activeOrder = orders.find((order) => order.id === activeHistoryOrderId) || orders[0];
  activeHistoryOrderId = activeOrder.id;
  renderOrderDetail(activeOrder);
}

function renderOrderDetail(order) {
  historyDetail.innerHTML = `
    <div class="history-detail-header">
      <div>
        <p class="step">${escapeHtml(order.orderDate)}</p>
        <h3>${escapeHtml(order.orderNumber)}</h3>
      </div>
      <strong>${formatter.format(order.total)}</strong>
    </div>
    <div class="history-detail-grid">
      <div class="history-detail-box">
        <strong>${escapeHtml(order.client.name)}</strong>
        <span>${escapeHtml(order.client.code)}</span>
        <span>${escapeHtml(order.client.sector)}</span>
        <span>${escapeHtml(order.client.phone)} - ${escapeHtml(order.client.email)}</span>
      </div>
      <div class="history-detail-box">
        <strong>Livraison</strong>
        <span>${escapeHtml(order.client.deliveryAddress)}</span>
        <span>${escapeHtml(order.client.deliveryZip)} ${escapeHtml(order.client.deliveryCity)}</span>
      </div>
    </div>
    <table class="history-table">
      <thead>
        <tr>
          <th>Réf.</th>
          <th>Désignation</th>
          <th>Qté</th>
          <th>Prix U.</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${order.lines
          .map(
            (line) => `
              <tr>
                <td>${escapeHtml(line.ref)}</td>
                <td>${escapeHtml(line.name)}</td>
                <td>${escapeHtml(line.qty)}</td>
                <td>${formatter.format(line.price)}</td>
                <td>${formatter.format(line.total)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
    ${order.note ? `<div class="history-detail-box"><strong>Note</strong><span>${escapeHtml(order.note)}</span></div>` : ""}
  `;
}

function setActiveTab(tabName) {
  const showHome = tabName === "home";
  const showOrder = tabName === "order";
  const showHistory = tabName === "history";
  const showPrenet = tabName === "prenet";
  const showTarif = tabName === "tarif";
  homeTab.classList.toggle("is-active", showHome);
  orderTab.classList.toggle("is-active", showOrder);
  historyTab.classList.toggle("is-active", showHistory);
  prenetTab.classList.toggle("is-active", showPrenet);
  tarifTab.classList.toggle("is-active", showTarif);
  homeView.classList.toggle("is-hidden", !showHome);
  orderView.classList.toggle("is-hidden", !showOrder);
  historyView.classList.toggle("is-hidden", !showHistory);
  prenetView.classList.toggle("is-hidden", !showPrenet);
  tarifView.classList.toggle("is-hidden", !showTarif);

  if (showOrder) {
    requestAnimationFrame(() => clientSearch.focus());
  }

  if (showHistory) {
    renderOrderHistory();
  }

  if (showPrenet) {
    requestAnimationFrame(() => prenetClientSearch.focus());
  }
}

function csvValue(value) {
  return `"${value.toString().replaceAll('"', '""')}"`;
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(csvValue).join(";")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  downloadBlob(filename, blob);
}

function buildErpCsvRows(validLines) {
  const rows = ["Référence (SKU)"];
  validLines.forEach((line) => {
    rows.push(line.product.ref);
  });
  return rows;
}

function downloadErpCsv(filename, rows) {
  const csv = rows.join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  downloadBlob(filename, blob);
}

function pdfText(value) {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’]/g, "'")
    .replace(/[€]/g, "EUR")
    .replace(/[°]/g, "o")
    .replace(/\s+/g, " ")
    .trim();
}

function toUtf16Hex(value) {
  const text = pdfText(value).replace(/[\\()]/g, "\\$&");
  return `(${text})`;
}

function pdfEscapeNumber(value) {
  return Number(value).toFixed(2).replace(/\.00$/, "");
}

function createPdfBlob({ orderNumber, orderDate, validLines, note }) {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 36;
  const pages = [];
  let commands = [];
  let y = pageHeight - margin;
  let pageNumber = 0;
  const pdfTotal = validLines.reduce((sum, line) => sum + line.product.price * line.qty, 0);

  function addPage() {
    if (commands.length) {
      drawFooter();
      pages.push(commands.join("\n"));
    }
    commands = [];
    pageNumber += 1;
    y = pageHeight - margin;
    drawHeader();
  }

  function ensureSpace(height) {
    if (y - height < 74) {
      addPage();
    }
  }

  function textAt(x, currentY, size, value, options = {}) {
    const font = options.bold ? "F2" : "F1";
    commands.push(`BT /${font} ${size} Tf ${pdfEscapeNumber(x)} ${pdfEscapeNumber(currentY)} Td ${toUtf16Hex(value)} Tj ET`);
  }

  function textLine(x, size, value, options = {}) {
    textAt(x, y, size, value, options);
    y -= options.lineHeight || 13;
  }

  function setColor(hex) {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    commands.push(`${pdfEscapeNumber(r)} ${pdfEscapeNumber(g)} ${pdfEscapeNumber(b)} rg`);
  }

  function setStroke(hex) {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    commands.push(`${pdfEscapeNumber(r)} ${pdfEscapeNumber(g)} ${pdfEscapeNumber(b)} RG`);
  }

  function fillRect(x, rectY, width, height, color) {
    setColor(color);
    commands.push(`${pdfEscapeNumber(x)} ${pdfEscapeNumber(rectY)} ${pdfEscapeNumber(width)} ${pdfEscapeNumber(height)} re f`);
    setColor("#1E1E22");
  }

  function strokeRect(x, rectY, width, height, color = "#DEDFE3") {
    setStroke(color);
    commands.push(`${pdfEscapeNumber(x)} ${pdfEscapeNumber(rectY)} ${pdfEscapeNumber(width)} ${pdfEscapeNumber(height)} re S`);
    setStroke("#1E1E22");
  }

  function hline(x1, x2, currentY, color = "#DEDFE3") {
    setStroke(color);
    commands.push(`${pdfEscapeNumber(x1)} ${pdfEscapeNumber(currentY)} m ${pdfEscapeNumber(x2)} ${pdfEscapeNumber(currentY)} l S`);
    setStroke("#1E1E22");
  }

  function drawHeader() {
    fillRect(margin, pageHeight - 50, 76, 4, "#E30613");
    textAt(margin, pageHeight - 30, 18, "Schuller Eh'klar", { bold: true });
    textAt(margin, pageHeight - 45, 7.5, "BROSSERIE ET OUTILLAGE POUR PEINTRES");
    textAt(margin, pageHeight - 58, 7.5, "4 rue Jean Marie Lhen - 67560 ROSHEIM - Tel. 03 88 04 68 04");
    textAt(margin, pageHeight - 70, 7.5, "www.schuller.eu - france@schuller.eu");

    textAt(pageWidth - 198, pageHeight - 30, 18, "BON DE COMMANDE", { bold: true });
    fillRect(pageWidth - 198, pageHeight - 54, 162, 22, "#F5F5F5");
    strokeRect(pageWidth - 198, pageHeight - 54, 162, 22);
    textAt(pageWidth - 190, pageHeight - 47, 8.5, `N° ${orderNumber}`, { bold: true });
    textAt(pageWidth - 190, pageHeight - 66, 8.5, `Date : ${orderDate}`);
    hline(margin, pageWidth - margin, pageHeight - 82, "#E30613");
    y = pageHeight - 104;
  }

  function drawFooter() {
    hline(margin, pageWidth - margin, 48, "#DEDFE3");
    textAt(margin, 34, 6.5, "SARL au capital de 24.000 Euros - RCS Saverne 2002 B 113 - SIRET 429542392 00031 - TVA FR36429542392");
    textAt(margin, 24, 6.5, "Banque CCM Strasbourg FR76 1027 8010 0400 0576 5794 597 - BIC CMCIFR2A");
    textAt(pageWidth - 58, 24, 7, `${pageNumber}`);
  }

  function drawInfoBoxes() {
    const boxY = y - 96;
    const boxW = (pageWidth - margin * 2 - 14) / 2;
    fillRect(margin, boxY + 74, boxW, 22, "#1E1E22");
    fillRect(margin + boxW + 14, boxY + 74, boxW, 22, "#1E1E22");
    strokeRect(margin, boxY, boxW, 96);
    strokeRect(margin + boxW + 14, boxY, boxW, 96);
    setColor("#FFFFFF");
    textAt(margin + 10, boxY + 82, 9, "Adresse de facturation", { bold: true });
    textAt(margin + boxW + 24, boxY + 82, 9, "Adresse de livraison", { bold: true });
    setColor("#1E1E22");

    const leftX = margin + 10;
    const rightX = margin + boxW + 24;
    textAt(leftX, boxY + 60, 10, selectedClient.name, { bold: true });
    textAt(leftX, boxY + 45, 8, selectedClient.billingAddress || "-");
    textAt(leftX, boxY + 33, 8, `${selectedClient.billingZip} ${selectedClient.billingCity}`);
    textAt(leftX, boxY + 18, 8, `Code client : ${selectedClient.code}`);
    textAt(leftX, boxY + 7, 8, selectedClient.sector || "");

    textAt(rightX, boxY + 60, 10, selectedClient.name, { bold: true });
    textAt(rightX, boxY + 45, 8, selectedClient.deliveryAddress || "-");
    textAt(rightX, boxY + 33, 8, `${selectedClient.deliveryZip} ${selectedClient.deliveryCity}`);
    textAt(rightX, boxY + 18, 8, selectedClient.phone || "");
    textAt(rightX, boxY + 7, 8, selectedClient.email || "");
    y = boxY - 26;
  }

  function drawTableHeader() {
    fillRect(margin, y - 4, pageWidth - margin * 2, 21, "#E30613");
    setColor("#FFFFFF");
    textAt(margin + 6, y + 3, 7.5, "Réf.", { bold: true });
    textAt(88, y + 3, 7.5, "Gencod", { bold: true });
    textAt(172, y + 3, 7.5, "Désignation", { bold: true });
    textAt(382, y + 3, 7.5, "UDV", { bold: true });
    textAt(417, y + 3, 7.5, "Qté", { bold: true });
    textAt(456, y + 3, 7.5, "Prix U.", { bold: true });
    textAt(515, y + 3, 7.5, "Total", { bold: true });
    setColor("#1E1E22");
    y -= 22;
  }

  function drawProductRow(line, index) {
    ensureSpace(24);
    if (y > pageHeight - 110) {
      drawTableHeader();
    }
    if (index % 2 === 1) {
      fillRect(margin, y - 8, pageWidth - margin * 2, 20, "#F8F8F9");
    }
    const lineTotal = line.product.price * line.qty;
    textAt(margin + 6, y, 7.5, line.product.ref);
    textAt(88, y, 7.2, line.product.gencod);
    textAt(172, y, 7.6, line.product.name.slice(0, 42), { bold: true });
    textAt(386, y, 7.5, line.product.udv || "-");
    textAt(419, y, 7.5, line.qty);
    textAt(456, y, 7.5, formatter.format(line.product.price));
    textAt(515, y, 7.5, formatter.format(lineTotal));
    y -= 20;
    hline(margin, pageWidth - margin, y + 7, "#E5E5E8");
  }

  addPage();
  drawInfoBoxes();
  textLine(margin, 12, "Produits commandés", { bold: true, lineHeight: 17 });
  drawTableHeader();
  validLines.forEach((line, index) => drawProductRow(line, index));

  y -= 10;
  ensureSpace(92);
  const recapX = pageWidth - 210;
  fillRect(recapX, y - 55, 174, 66, "#F5F5F5");
  strokeRect(recapX, y - 55, 174, 66);
  fillRect(recapX, y - 55, 4, 66, "#E30613");
  textAt(recapX + 14, y - 6, 9, "Récapitulatif", { bold: true });
  textAt(recapX + 14, y - 25, 8, "Total HT");
  textAt(recapX + 90, y - 25, 8, formatter.format(pdfTotal), { bold: true });
  textAt(recapX + 14, y - 42, 8, "Total TTC");
  textAt(recapX + 90, y - 42, 8, formatter.format(pdfTotal), { bold: true });
  y -= 76;

  if (note) {
    ensureSpace(46);
    fillRect(margin, y - 28, pageWidth - margin * 2 - 190, 38, "#F8F8F9");
    strokeRect(margin, y - 28, pageWidth - margin * 2 - 190, 38);
    textAt(margin + 10, y - 4, 8, "Note", { bold: true });
    textAt(margin + 10, y - 18, 8, note.slice(0, 95));
    y -= 48;
  }

  textAt(margin, 74, 7, "Tous nos prix sont indiqués en Euros. Prix nets valables uniquement pour cette commande.");
  textAt(margin, 64, 7, "Document généré automatiquement par l'outil de saisie de commande Schuller Eh'klar France.");
  setColor("#1E1E22");

  addPage();

  const objects = [];
  const addObject = (content) => {
    objects.push(content);
    return objects.length;
  };

  const fontRegular = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBold = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const pageRefs = [];

  pages.forEach((pageCommands) => {
    const stream = pageCommands;
    const contentRef = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageRef = addObject(
      `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentRef} 0 R >>`
    );
    pageRefs.push(pageRef);
  });

  const pagesRef = addObject(`<< /Type /Pages /Kids [${pageRefs.map((ref) => `${ref} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`);
  pageRefs.forEach((pageRef) => {
    objects[pageRef - 1] = objects[pageRef - 1].replace("/Parent 0 0 R", `/Parent ${pagesRef} 0 R`);
  });
  const catalogRef = addObject(`<< /Type /Catalog /Pages ${pagesRef} 0 R >>`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogRef} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function generateOrderFiles() {
  const validLines = getValidLines();

  if (!selectedClient) {
    alert("Selectionne d'abord un client.");
    clientSearch.focus();
    return;
  }

  if (!validLines.length) {
    alert("Ajoute au moins un produit valide.");
    return;
  }

  const orderDate = new Date().toLocaleDateString("fr-FR");
  const orderNumber = `CMD-${Date.now().toString().slice(-6)}`;
  const note = orderNote.value.trim();
  const safeClientCode = selectedClient.code.replace(/[^a-z0-9_-]/gi, "_");
  const baseName = `${orderNumber}_${safeClientCode}`;
  const orderSnapshot = buildOrderSnapshot({ orderNumber, orderDate, note, validLines });
  const pdfBlob = createPdfBlob({ orderNumber, orderDate, validLines, note });

  storeOrder(orderSnapshot);
  downloadErpCsv(`${baseName}_ERP_REFERENCES.csv`, buildErpCsvRows(validLines));
  downloadBlob(`${baseName}_COMMANDE_COMPLETE.pdf`, pdfBlob);
}

function resetOrder() {
  selectedClient = null;
  lines = [];
  clientSearch.value = "";
  orderNote.value = "";
  clientStatus.textContent = "Client non selectionne";
  clientStatus.classList.remove("is-ready");
  selectedClientBox.innerHTML = "<span>Aucun client choisi pour le moment.</span>";
  addLine();
  updateSummary();
}

clientSearch.addEventListener("input", (event) => renderClientSuggestions(event.target.value));
document.querySelector("#addLine").addEventListener("click", addLine);
document.querySelector("#generateOrderFiles").addEventListener("click", generateOrderFiles);
document.querySelector("#resetOrder").addEventListener("click", () => {
  resetOrder();
  setActiveTab("order");
});
homeTab.addEventListener("click", () => setActiveTab("home"));
orderTab.addEventListener("click", () => setActiveTab("order"));
historyTab.addEventListener("click", () => setActiveTab("history"));
prenetTab.addEventListener("click", () => setActiveTab("prenet"));
tarifTab.addEventListener("click", () => setActiveTab("tarif"));
prenetClientSearch.addEventListener("input", (event) => renderPrenetSuggestions(event.target.value));
selectTarif5010.addEventListener("click", () => openTarifForm("tarif-50-plus-10"));
selectTarifBase.addEventListener("click", () => openTarifForm("tarif-de-base"));
selectCatalogue2026.addEventListener("click", () => openTarifForm("catalogue-2026"));
tarifSendForm.addEventListener("submit", sendTarif);
logoutButton.addEventListener("click", showLogin);
loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitLogin();
});
forgotPasswordButton.addEventListener("click", openPasswordReset);
backToLoginButton.addEventListener("click", closePasswordReset);
passwordResetRequestForm.addEventListener("submit", requestPasswordReset);
passwordResetConfirmForm.addEventListener("submit", confirmPasswordReset);
loginPassword.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    submitLogin();
  }
});
loginId.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    loginPassword.focus();
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".search-block")) {
    clientSuggestions.classList.remove("is-open");
  }
  if (!event.target.closest(".prenet-search-block")) {
    prenetClientSuggestions.classList.remove("is-open");
  }
});

restoreSession();
