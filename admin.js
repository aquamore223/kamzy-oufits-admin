import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ===== Cloudinary (your existing cloud & preset) =====
const CLOUD_NAME = "dmltit7tl";
const UPLOAD_PRESET = "kamzy_outfits_unsigned";

// ===== DOM =====
const message = document.getElementById("message");
const categorySelect = document.getElementById("categorySelect");
const addMoreBtn = document.getElementById("addMoreBtn");
const uploadAllBtn = document.getElementById("uploadAllBtn");
const productRows = document.getElementById("productRows");

// Product lists for viewing
const topsList = document.getElementById("tops-list");
const jeansList = document.getElementById("jeans-list");
const leggingsList = document.getElementById("leggings-list");
const gownsList = document.getElementById("gowns-list");

// Firestore collection reference (✅ correct usage)
const productsRef = collection(db, "products");

// ===== Helpers =====
function setMessage(text, type = "success") {
  message.textContent = text;
  message.className = `message show ${type}`;
  // auto hide after a while (no popups)
  setTimeout(() => { message.className = "message"; }, 3500);
}

function createRow() {
  const row = document.createElement("div");
  row.className = "product-row";
  row.innerHTML = `
    <input type="text" class="name" placeholder="Product name" required />
    <input type="number" class="price" placeholder="Price" min="0" step="0.01" required />
    <div class="preview">No image selected</div>
    <button type="button" class="remove">Remove</button>
    <input type="file" class="file" accept="image/*" hidden />
  `;

  const nameEl = row.querySelector(".name");
  const priceEl = row.querySelector(".price");
  const previewEl = row.querySelector(".preview");
  const removeBtn = row.querySelector(".remove");
  const fileEl = row.querySelector(".file");

  // Click preview to choose file
  previewEl.addEventListener("click", () => fileEl.click());

  // When file chosen, show mini preview + live name/price
  const updatePreview = (blobUrl = null) => {
    const n = nameEl.value || "—";
    const p = priceEl.value ? `₦${Number(priceEl.value)}` : "—";
    const img = blobUrl ? `<img src="${blobUrl}" alt="preview" />` : "";
    previewEl.innerHTML = `${img}<div><div><strong>${n}</strong></div><div>${p}</div></div>`;
  };

  fileEl.addEventListener("change", (e) => {
    const file = e.target.files[0];
    const url = file ? URL.createObjectURL(file) : null;
    updatePreview(url);
  });
  nameEl.addEventListener("input", () => updatePreview());
  priceEl.addEventListener("input", () => updatePreview());

  removeBtn.addEventListener("click", () => row.remove());

  // Initialize
  updatePreview();
  return row;
}

// First row on load
productRows.appendChild(createRow());

// Add more rows
addMoreBtn.addEventListener("click", () => {
  productRows.appendChild(createRow());
});

// Upload all rows
uploadAllBtn.addEventListener("click", async () => {
  const category = categorySelect.value;
  if (!category) {
    setMessage("Please select a category first.", "error");
    return;
  }

  const rows = [...document.querySelectorAll(".product-row")];
  if (rows.length === 0) {
    setMessage("Add at least one product row.", "error");
    return;
  }

  setMessage("Uploading… please wait.");

  try {
    for (const row of rows) {
      const name = row.querySelector(".name").value.trim();
      const price = parseFloat(row.querySelector(".price").value);
      const file = row.querySelector(".file").files[0];

      if (!name || !price || !file) continue; // skip incomplete rows

      // 1) Upload image to Cloudinary
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: fd
      });
      const data = await res.json();
      if (!data.secure_url) throw new Error("Cloudinary upload failed");

      // 2) Save product to Firestore
      await addDoc(productsRef, {
        name,
        price,
        category,
        imageUrl: data.secure_url,
        createdAt: serverTimestamp()
      });
    }

    setMessage("✅ All products uploaded successfully!", "success");
    // reset UI
    productRows.innerHTML = "";
    productRows.appendChild(createRow());
    await loadProducts();

  } catch (err) {
    console.error(err);
    setMessage("❌ Upload failed. Please try again.", "error");
  }
});

// ===== Load products by category (view) =====
async function loadProducts() {
  // Clear existing
  [topsList, jeansList, leggingsList, gownsList].forEach(el => el.innerHTML = "");

  let qRef;
  try {
    qRef = query(productsRef, orderBy("createdAt", "desc"));
  } catch {
    qRef = query(productsRef); // fallback if some docs lack createdAt
  }
  const snap = await getDocs(qRef);

  snap.forEach(docSnap => {
    const p = docSnap.data();
    const target = document.getElementById(`${p.category}-list`);
    if (!target) return;

    const item = document.createElement("div");
    item.className = "card-item";
    item.innerHTML = `
      <img src="${p.imageUrl}" alt="${p.name}" />
      <h4>${p.name}</h4>
      <p>₦${Number(p.price)}</p>
    `;
    target.appendChild(item);
  });
}

// Initial load
loadProducts();
