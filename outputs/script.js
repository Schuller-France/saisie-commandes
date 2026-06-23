const allClients = window.APP_DATA?.clients || [];
const products = window.APP_DATA?.products || [];
const users = [
  {
    id: "flo",
    password: "flo",
    name: "Flo",
    sector: "Secteur 9",
  },
];

let selectedClient = null;
let lines = [];
let currentUser = null;
let visibleClients = [];

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
const logoutButton = document.querySelector("#logoutButton");
const sessionLabel = document.querySelector("#sessionLabel");

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
  return allClients.filter((client) => normalize(client.sector) === normalize(user.sector));
}

function showLogin() {
  currentUser = null;
  visibleClients = [];
  sessionStorage.removeItem("orderEntryUser");
  loginView.classList.remove("is-hidden");
  appView.classList.add("is-hidden");
  loginId.value = "";
  loginPassword.value = "";
  loginError.textContent = "";
  resetOrder();
  requestAnimationFrame(() => loginId.focus());
}

function showApp(user) {
  currentUser = user;
  visibleClients = getClientsForUser(user);
  sessionStorage.setItem("orderEntryUser", user.id);
  sessionLabel.textContent = `${user.name} - ${user.sector}`;
  loginView.classList.add("is-hidden");
  appView.classList.remove("is-hidden");
  resetOrder();
  requestAnimationFrame(() => clientSearch.focus());
}

function authenticate(id, password) {
  return users.find((user) => normalize(user.id) === normalize(id) && user.password === password);
}

function submitLogin() {
  const user = authenticate(loginId.value.trim(), loginPassword.value);

  if (!user) {
    loginError.textContent = "Identifiant ou mot de passe incorrect.";
    loginPassword.select();
    return;
  }

  showApp(user);
}

function restoreSession() {
  const savedUserId = sessionStorage.getItem("orderEntryUser");
  const savedUser = users.find((user) => user.id === savedUserId);

  if (savedUser) {
    showApp(savedUser);
    return;
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

    refInput.addEventListener("change", (event) => updateLine(line.id, { ref: event.target.value.trim() }));
    refInput.addEventListener("blur", (event) => updateLine(line.id, { ref: event.target.value.trim() }));
    refInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        updateLine(line.id, { ref: event.target.value.trim() });
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
  return value.toString().replace(/\s+/g, " ").trim();
}

function toUtf16Hex(value) {
  const text = `\uFEFF${pdfText(value)}`;
  let hex = "";
  for (let index = 0; index < text.length; index += 1) {
    hex += text.charCodeAt(index).toString(16).padStart(4, "0");
  }
  return `<${hex.toUpperCase()}>`;
}

function pdfEscapeNumber(value) {
  return Number(value).toFixed(2).replace(/\.00$/, "");
}

function createPdfBlob({ orderNumber, orderDate, validLines, note }) {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 36;
  const lineHeight = 13;
  const pages = [];
  let commands = [];
  let y = pageHeight - margin;

  function addPage() {
    if (commands.length) {
      pages.push(commands.join("\n"));
    }
    commands = [];
    y = pageHeight - margin;
  }

  function ensureSpace(height) {
    if (y - height < margin) {
      addPage();
    }
  }

  function text(x, size, value, options = {}) {
    const font = options.bold ? "F2" : "F1";
    commands.push(`BT /${font} ${size} Tf ${pdfEscapeNumber(x)} ${pdfEscapeNumber(y)} Td ${toUtf16Hex(value)} Tj ET`);
    y -= options.lineHeight || lineHeight;
  }

  function textAt(x, currentY, size, value, options = {}) {
    const font = options.bold ? "F2" : "F1";
    commands.push(`BT /${font} ${size} Tf ${pdfEscapeNumber(x)} ${pdfEscapeNumber(currentY)} Td ${toUtf16Hex(value)} Tj ET`);
  }

  function hline(currentY) {
    commands.push(`${margin} ${pdfEscapeNumber(currentY)} m ${pageWidth - margin} ${pdfEscapeNumber(currentY)} l S`);
  }

  function row(columns, options = {}) {
    ensureSpace(options.height || 22);
    const rowY = y;
    columns.forEach((column) => {
      textAt(column.x, rowY, options.size || 8, column.value, { bold: options.bold });
    });
    y -= options.height || 22;
    hline(y + 7);
  }

  text(margin, 20, "Commande", { bold: true, lineHeight: 18 });
  text(margin, 10, "Schuller Eh'Klar France", { lineHeight: 16 });
  text(pageWidth - 180, 10, orderNumber, { bold: true, lineHeight: 13 });
  text(pageWidth - 180, 10, orderDate, { lineHeight: 18 });
  hline(y + 8);

  y -= 10;
  text(margin, 13, "Client", { bold: true, lineHeight: 17 });
  text(margin, 10, `${selectedClient.name} - ${selectedClient.code}`);
  text(margin, 10, `Facturation : ${selectedClient.billingAddress}`);
  text(margin, 10, `${selectedClient.billingZip} ${selectedClient.billingCity}`);
  text(margin, 10, `Livraison : ${selectedClient.deliveryAddress}`);
  text(margin, 10, `${selectedClient.deliveryZip} ${selectedClient.deliveryCity}`);
  text(margin, 10, selectedClient.sector);
  text(margin, 10, `${selectedClient.phone} - ${selectedClient.email}`, { lineHeight: 20 });

  text(margin, 13, "Produits", { bold: true, lineHeight: 17 });
  row(
    [
      { x: margin, value: "Réf." },
      { x: 92, value: "Gencod" },
      { x: 190, value: "Désignation" },
      { x: 390, value: "UDV" },
      { x: 425, value: "Qté" },
      { x: 465, value: "Prix U." },
      { x: 520, value: "Total" },
    ],
    { bold: true, size: 8, height: 18 }
  );

  validLines.forEach((line) => {
    const lineTotal = line.product.price * line.qty;
    row(
      [
        { x: margin, value: line.product.ref },
        { x: 92, value: line.product.gencod },
        { x: 190, value: line.product.name.slice(0, 34) },
        { x: 390, value: line.product.udv || "-" },
        { x: 425, value: line.qty },
        { x: 465, value: formatter.format(line.product.price) },
        { x: 520, value: formatter.format(lineTotal) },
      ],
      { size: 8, height: 18 }
    );
  });

  y -= 8;
  text(pageWidth - 210, 13, `Total HT : ${formatter.format(getTotal())}`, { bold: true, lineHeight: 22 });

  if (note) {
    ensureSpace(50);
    text(margin, 11, "Note", { bold: true, lineHeight: 15 });
    text(margin, 9, note, { lineHeight: 15 });
  }

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
  const pdfBlob = createPdfBlob({ orderNumber, orderDate, validLines, note });

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
document.querySelector("#resetOrder").addEventListener("click", resetOrder);
logoutButton.addEventListener("click", showLogin);
loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitLogin();
});
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
});

restoreSession();
