import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// DOM Elements
const message = document.getElementById("message");
const ordersList = document.getElementById("ordersList");
const refreshBtn = document.getElementById("refreshOrders");
const markAllBtn = document.getElementById("markAllProcessed");

// Orders reference
const ordersRef = collection(db, "orders");

// Message helper
function setMessage(text, type = "success") {
  message.textContent = text;
  message.className = `message show ${type}`;
  setTimeout(() => {
    message.className = "message";
  }, 3500);
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amount);
}

// Format date
function formatDate(timestamp) {
  if (!timestamp) return 'No date';
  const date = timestamp.toDate();
  return date.toLocaleString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Load orders
async function loadOrders() {
  try {
    ordersList.innerHTML = '<p>Loading orders...</p>';
    
    const q = query(ordersRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      ordersList.innerHTML = '<p class="empty">No orders found.</p>';
      return;
    }
    
    let html = '';
    querySnapshot.forEach((doc) => {
      const order = doc.data();
      const orderId = doc.id;
      
      html += `
        <div class="order-card ${order.status || 'pending'}">
          <div class="order-header">
            <h3>Order #${orderId.slice(-6)}</h3>
            <span class="order-status ${order.status || 'pending'}">
              ${order.status || 'pending'}
            </span>
            <span class="order-date">${formatDate(order.createdAt)}</span>
          </div>
          
          <div class="order-items">
            <h4>Items (${order.items.length})</h4>
            ${order.items.map(item => `
              <div class="order-item">
                <img src="${item.imageUrl}" alt="${item.name}" class="item-image">
                <div class="item-details">
                  <h5>${item.name}</h5>
                  <p>₦${item.price.toLocaleString()} × ${item.quantity}</p>
                  <p>Subtotal: ₦${(item.price * item.quantity).toLocaleString()}</p>
                </div>
              </div>
            `).join('')}
          </div>
          
          <div class="order-footer">
            <div class="order-total">
              <strong>Total: ${formatCurrency(order.total || order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0))}</strong>
            </div>
            <div class="order-actions">
              <button class="btn success mark-processed" data-order-id="${orderId}">
                ✓ Mark Processed
              </button>
              <button class="btn error delete-order" data-order-id="${orderId}">
                🗑️ Delete
              </button>
              <a href="https://wa.me/2347033800470?text=Hello!%20I'm%20following%20up%20on%20Order%20#${orderId.slice(-6)}%20from%20Kamzy%20Outfits." 
                 target="_blank" class="btn primary">
                💬 Contact Customer
              </a>
            </div>
          </div>
        </div>
      `;
    });
    
    ordersList.innerHTML = html;
    
    // Add event listeners to buttons
    document.querySelectorAll('.mark-processed').forEach(btn => {
      btn.addEventListener('click', (e) => {
        markOrderAsProcessed(e.target.dataset.orderId);
      });
    });
    
    document.querySelectorAll('.delete-order').forEach(btn => {
      btn.addEventListener('click', (e) => {
        deleteOrder(e.target.dataset.orderId);
      });
    });
    
  } catch (error) {
    console.error('Error loading orders:', error);
    ordersList.innerHTML = '<p class="error">Error loading orders. Please try again.</p>';
    setMessage('Error loading orders', 'error');
  }
}

// Mark order as processed
async function markOrderAsProcessed(orderId) {
  try {
    await updateDoc(doc(db, "orders", orderId), {
      status: "processed",
      processedAt: serverTimestamp()
    });
    
    setMessage('Order marked as processed!');
    loadOrders();
  } catch (error) {
    console.error('Error updating order:', error);
    setMessage('Error updating order', 'error');
  }
}

// Delete order
async function deleteOrder(orderId) {
  if (confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
    try {
      // Note: We're using updateDoc instead of deleteDoc to preserve order history
      await updateDoc(doc(db, "orders", orderId), {
        status: "deleted",
        deletedAt: serverTimestamp()
      });
      
      setMessage('Order deleted!');
      loadOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      setMessage('Error deleting order', 'error');
    }
  }
}

// Mark all orders as processed
async function markAllAsProcessed() {
  if (confirm('Mark all orders as processed?')) {
    try {
      const q = query(ordersRef, where("status", "!=", "processed"));
      const querySnapshot = await getDocs(q);
      
      const updatePromises = [];
      querySnapshot.forEach((doc) => {
        updatePromises.push(
          updateDoc(doc(db, "orders", doc.id), {
            status: "processed",
            processedAt: serverTimestamp()
          })
        );
      });
      
      await Promise.all(updatePromises);
      setMessage(`Marked ${updatePromises.length} orders as processed!`);
      loadOrders();
    } catch (error) {
      console.error('Error updating orders:', error);
      setMessage('Error updating orders', 'error');
    }
  }
}

// Event listeners
refreshBtn.addEventListener('click', loadOrders);
markAllBtn.addEventListener('click', markAllAsProcessed);

// Initial load
loadOrders();