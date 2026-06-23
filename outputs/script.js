const clients = window.APP_DATA?.clients || [];
const products = window.APP_DATA?.products || [];

let selectedClient = null;
let lines = [];

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

  const matches = clients
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
  lines.push({
    id: crypto.randomUUID(),
    ref: "",
    qty: 1,
  });
  renderLines();
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

function renderLines() {
  orderLines.innerHTML = "";

  lines.forEach((line) => {
    const product = findProduct(line.ref);
    const quantity = Math.max(Number(line.qty) || 0, 0);
    const lineTotal = product ? product.price * quantity : 0;
    const row = document.createElement("tr");

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
    qtyInput.addEventListener("change", (event) => updateLine(line.id, { qty: Number(event.target.value) || 1 }));
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

function generateOrderDocument() {
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
  const rows = validLines
    .map(
      (line) => `
        <tr>
          <td>${escapeHtml(line.product.ref)}</td>
          <td>${escapeHtml(line.product.gencod)}</td>
          <td>${escapeHtml(line.product.name)}</td>
          <td>${escapeHtml(line.product.udv || "-")}</td>
          <td>${escapeHtml(line.qty)}</td>
          <td>${formatter.format(line.product.price)}</td>
          <td>${formatter.format(line.product.price * line.qty)}</td>
        </tr>
      `
    )
    .join("");

  const pdfWindow = window.open("", "_blank");
  pdfWindow.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>${orderNumber}</title>
        <style>
          body { margin: 0; padding: 32px; color: #1e1e22; font-family: Arial, Helvetica, sans-serif; }
          header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 4px solid #e30613; padding-bottom: 18px; }
          h1 { margin: 0; font-size: 30px; }
          h2 { margin: 28px 0 10px; font-size: 18px; }
          p { margin: 4px 0; }
          table { width: 100%; margin-top: 18px; border-collapse: collapse; }
          th, td { padding: 10px; border-bottom: 1px solid #dedfe3; text-align: left; }
          th { background: #f5f5f5; font-size: 12px; text-transform: uppercase; }
          .meta { text-align: right; }
          .total { margin-top: 22px; text-align: right; font-size: 24px; font-weight: 800; }
          .note { margin-top: 24px; padding: 14px; background: #f5f5f5; }
          @media print { body { padding: 18mm; } button { display: none; } }
        </style>
      </head>
      <body>
        <header>
          <div>
            <h1>Commande</h1>
            <p><strong>Schuller Eh'Klar France</strong></p>
          </div>
          <div class="meta">
            <p><strong>${orderNumber}</strong></p>
            <p>${orderDate}</p>
          </div>
        </header>

        <h2>Client</h2>
        <p><strong>${escapeHtml(selectedClient.name)}</strong> - ${escapeHtml(selectedClient.code)}</p>
        <p>Facturation : ${escapeHtml(selectedClient.billingAddress)}</p>
        <p>${escapeHtml(selectedClient.billingZip)} ${escapeHtml(selectedClient.billingCity)}</p>
        <p>Livraison : ${escapeHtml(selectedClient.deliveryAddress)}</p>
        <p>${escapeHtml(selectedClient.deliveryZip)} ${escapeHtml(selectedClient.deliveryCity)}</p>
        <p>${escapeHtml(selectedClient.sector)}</p>
        <p>${escapeHtml(selectedClient.phone)} - ${escapeHtml(selectedClient.email)}</p>

        <h2>Produits</h2>
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Gencod</th>
              <th>Designation</th>
              <th>UDV</th>
              <th>Qte</th>
              <th>Prix U.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        ${note ? `<div class="note"><strong>Note :</strong><p>${escapeHtml(note)}</p></div>` : ""}
        <p class="total">Total HT : ${formatter.format(getTotal())}</p>

        <script>
          window.addEventListener("load", () => window.print());
        </script>
      </body>
    </html>
  `);
  pdfWindow.document.close();
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
document.querySelector("#generatePdf").addEventListener("click", generateOrderDocument);
document.querySelector("#resetOrder").addEventListener("click", resetOrder);

document.addEventListener("click", (event) => {
  if (!event.target.closest(".search-block")) {
    clientSuggestions.classList.remove("is-open");
  }
});

addLine();
