import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ===== Cloudinary =====
const CLOUD_NAME = "dmltit7tl";
const UPLOAD_PRESET = "kamzy_outfits_unsigned";

// ===== DOM =====
const message = document.getElementById("message");
const categorySelect = document.getElementById("categorySelect");
const addMoreBtn = document.getElementById("addMoreBtn");
const uploadAllBtn = document.getElementById("uploadAllBtn");
const productRows = document.getElementById("productRows");

const topsList = document.getElementById("tops-list");
const jeansList = document.getElementById("jeans-list");
const leggingsList = document.getElementById("leggings-list");
const gownsList = document.getElementById("gowns-list");

const productsRef = collection(db, "products");

// ===== Helpers =====
function setMessage(text, type = "success") {
  message.textContent = text;
  message.className = `message show ${type}`;
  setTimeout(() => {
    message.className = "message";
  }, 3500);
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

  previewEl.addEventListener("click", () => fileEl.click());

  const updatePreview = (blobUrl = null) => {
    const n = nameEl.value || "—";
    const p = priceEl.value ? `₦${Number(priceEl.value)}` : "—";
    const img = blobUrl ? `<img src="${blobUrl}" alt="preview" />` : "";
    previewEl.innerHTML = `${img}<div><strong>${n}</strong><div>${p}</div></div>`;
  };

  fileEl.addEventListener("change", (e) => {
    const file = e.target.files[0];
    const url = file ? URL.createObjectURL(file) : null;
    updatePreview(url);
  });
  nameEl.addEventListener("input", () => updatePreview());
  priceEl.addEventListener("input", () => updatePreview());

  removeBtn.addEventListener("click", () => row.remove());

  updatePreview();
  return row;
}

// First row
productRows.appendChild(createRow());

// Add more rows
addMoreBtn.addEventListener("click", () => {
  productRows.appendChild(createRow());
});

// Upload all
uploadAllBtn.addEventListener("click", async () => {
  const category = categorySelect.value;
  if (!category) return setMessage("Please select a category.", "error");

  const rows = [...document.querySelectorAll(".product-row")];
  if (rows.length === 0) return setMessage("Add at least one product.", "error");

  setMessage("Uploading… please wait.");

  try {
    for (const row of rows) {
      const name = row.querySelector(".name").value.trim();
      const price = parseFloat(row.querySelector(".price").value);
      const file = row.querySelector(".file").files[0];

      if (!name || !price || !file) continue;

      // upload to Cloudinary
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: fd
      });
      const data = await res.json();
      if (!data.secure_url) throw new Error("Cloudinary upload failed");

      await addDoc(productsRef, {
        name,
        price,
        category,
        imageUrl: data.secure_url,
        createdAt: serverTimestamp()
      });
    }

    setMessage("✅ All products uploaded successfully!");
    productRows.innerHTML = "";
    productRows.appendChild(createRow());
    await loadProducts();

  } catch (err) {
    console.error(err);
    setMessage("❌ Upload failed.", "error");
  }
});

// ===== Load with Edit + Delete =====
async function loadProducts() {
  [topsList, jeansList, leggingsList, gownsList].forEach(el => el.innerHTML = "");

  let qRef;
  try {
    qRef = query(productsRef, orderBy("createdAt", "desc"));
  } catch {
    qRef = query(productsRef);
  }
  const snap = await getDocs(qRef);

  snap.forEach(docSnap => {
    const p = docSnap.data();
    const id = docSnap.id;
    const target = document.getElementById(`${p.category}-list`);
    if (!target) return;

    const item = document.createElement("div");
    item.className = "card-item";
    item.innerHTML = `
      <img src="${p.imageUrl}" alt="${p.name}" class="prod-img"/>
      <input type="text" value="${p.name}" class="edit-name" disabled />
      <input type="number" value="${p.price}" class="edit-price" disabled />
      <input type="file" class="edit-file" hidden />
      <div class="buttons">
        <button class="edit-btn">Edit</button>
        <button class="save-btn" style="display:none;">Save</button>
        <button class="delete-btn">Delete</button>
      </div>
    `;

    const editBtn = item.querySelector(".edit-btn");
    const saveBtn = item.querySelector(".save-btn");
    const deleteBtn = item.querySelector(".delete-btn");
    const nameInput = item.querySelector(".edit-name");
    const priceInput = item.querySelector(".edit-price");
    const fileInput = item.querySelector(".edit-file");
    const imgEl = item.querySelector(".prod-img");

    // Edit mode
    editBtn.addEventListener("click", () => {
      nameInput.disabled = false;
      priceInput.disabled = false;
      fileInput.hidden = false;
      editBtn.style.display = "none";
      saveBtn.style.display = "inline-block";
    });

    // Save changes
    saveBtn.addEventListener("click", async () => {
      try {
        let newUrl = p.imageUrl;
        if (fileInput.files[0]) {
          const fd = new FormData();
          fd.append("file", fileInput.files[0]);
          fd.append("upload_preset", UPLOAD_PRESET);

          const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: "POST",
            body: fd
          });
          const data = await res.json();
          newUrl = data.secure_url;
        }

        await updateDoc(doc(db, "products", id), {
          name: nameInput.value,
          price: parseFloat(priceInput.value),
          imageUrl: newUrl
        });

        setMessage("✅ Product updated!");
        loadProducts();
      } catch (err) {
        console.error(err);
        setMessage("❌ Update failed", "error");
      }
    });

    // Delete
    deleteBtn.addEventListener("click", async () => {
      if (confirm("Delete this product?")) {
        try {
          await deleteDoc(doc(db, "products", id));
          setMessage("🗑️ Product deleted!");
          loadProducts();
        } catch (err) {
          console.error(err);
          setMessage("❌ Delete failed", "error");
        }
      }
    });

    target.appendChild(item);
  });
}

loadProducts();
