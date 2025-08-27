import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const CLOUD_NAME = "dmltit7tl";   // your cloud name
const UPLOAD_PRESET = "kamzy_outfits_unsigned"; // new preset for Kamzy Outfits

const productForm = document.getElementById("productForm");
const productsContainer = document.getElementById("productsContainer");

// ✅ Upload image to Cloudinary
async function uploadImage(file) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(url, { method: "POST", body: formData });
  const data = await res.json();
  return data.secure_url;
}

// ✅ Add Product
productForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const price = parseFloat(document.getElementById("price").value);
  const category = document.getElementById("category").value;
  const imageFile = document.getElementById("image").files[0];

  if (!name || !price || !category || !imageFile) {
    alert("⚠️ Please fill all fields");
    return;
  }

  try {
    const imageUrl = await uploadImage(imageFile);

    await addDoc(collection(db, "products"), {
      name,
      price,
      category,
      imageUrl,
      createdAt: serverTimestamp()
    });

    alert("✅ Product added successfully!");
    productForm.reset();
    loadProducts();
  } catch (error) {
    console.error("Error adding product: ", error);
    alert("❌ Failed to add product.");
  }
});

// ✅ Load Products
async function loadProducts() {
  productsContainer.innerHTML = "";
  const querySnapshot = await getDocs(collection(db, "products"));

  querySnapshot.forEach((docSnap) => {
    const product = docSnap.data();
    const div = document.createElement("div");
    div.classList.add("product-card");
    div.innerHTML = `
      <img src="${product.imageUrl}" alt="${product.name}">
      <h3>${product.name}</h3>
      <p>₦${product.price.toLocaleString()}</p>
      <p><strong>${product.category}</strong></p>
      <button data-id="${docSnap.id}" class="delete-btn">Delete</button>
    `;
    productsContainer.appendChild(div);
  });

  // Attach delete handlers
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      if (confirm("🗑️ Delete this product?")) {
        await deleteDoc(doc(db, "products", id));
        loadProducts();
      }
    });
  });
}

// Load on start
loadProducts();
