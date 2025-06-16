// Open modal function
function openModal(type) {
  const modal = document.getElementById(`${type}-modal`);
  modal.style.display = "block";
}

// Close modal function
function closeModal(type) {
  const modal = document.getElementById(`${type}-modal`);
  modal.style.display = "none";
}

// Handle clicks outside the modal to close
window.onclick = function (event) {
  const loginModal = document.getElementById("login-modal");
  const signupModal = document.getElementById("signup-modal");

  if (event.target === loginModal) {
    closeModal("login");
  } else if (event.target === signupModal) {
    closeModal("signup");
  }
};

// Handle login form submission
document.getElementById("login-form")?.addEventListener("submit", function (e) {
  e.preventDefault();

  const email = this.email.value;
  const password = this.password.value;

  fetch("/login", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ email, password }),
  })
    .then((res) => {
      if (res.redirected) {
        window.location.href = res.url;
      } else {
        return res.text().then(alert);
      }
    })
    .catch(() => alert("Login failed."));
});

// Handle signup form submission
document
  .getElementById("signup-form")
  ?.addEventListener("submit", function (e) {
    e.preventDefault();

    const username = this.username.value;
    const email = this.email.value;
    const password = this.password.value;
    const role = this.role.value;

    fetch("/signup", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username, email, password, role }),
    })
      .then((res) => {
        if (res.redirected) {
          window.location.href = res.url;
        } else {
          return res.text().then(alert);
        }
      })
      .catch(() => alert("Signup failed."));
  });

// Load products by genre
function loadProducts(genre) {
  fetch(`/products/${genre}?page=1`)
    .then((response) => response.json())
    .then((products) => {
      document.getElementById("genre-title").textContent =
        genre.charAt(0).toUpperCase() + genre.slice(1) + " Products";
      const container = document.getElementById("product-list");
      container.innerHTML = "";

      products.forEach((product) => {
        const card = document.createElement("div");
        card.className = "product-card";
        card.style.cursor = "pointer";

        card.innerHTML = `
          <div class="image-container">
            <img src="/public/images/${product.image_url}" alt="${product.name}">
          </div>
          <div class="details">
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <p class="price">$${product.price}</p>
          </div>
        `;

        card.addEventListener("click", () => {
          window.location.href = `/product-details.html?genre=${genre}&id=${product.id}`;
        });

        container.appendChild(card);
      });
    });
}

// Load cart items
function loadCart() {
  fetch("/cart")
    .then((response) => response.json())
    .then((cartItems) => {
      const container = document.getElementById("cart-items");
      container.innerHTML = "";

      if (cartItems.message === "Not logged in") {
        container.innerHTML = "<p>Please log in to view your cart.</p>";
        return;
      }

      if (!cartItems.length) {
        container.innerHTML = "<p>Your cart is empty.</p>";
        return;
      }

      cartItems.forEach((item) => {
        const div = document.createElement("div");
        div.className = "cart-item";

        div.innerHTML = `
          <img src="/public/images/${item.image_url}" alt="${item.name}" />
          <div class="cart-item-details">
            <h3>${item.name}</h3>
            <p>Quantity: ${item.quantity}</p>
            <p>Price: $${item.price}</p>
          </div>
          <div class="cart-item-actions">
            <button class="remove-btn" data-id="${item.id}">Remove</button>
          </div>
        `;
        container.appendChild(div);

        div.querySelector(".remove-btn").addEventListener("click", () => {
          removeFromCart(item.id);
        });
      });

      // Add checkout button after cart items
      const actionsDiv = document.getElementById("cart-actions");
      actionsDiv.innerHTML = `<button id="checkout-btn">Proceed to Checkout</button>`;

      // Attach event listener to checkout button
      document.getElementById("checkout-btn").addEventListener("click", () => {
        // Redirect to checkout.html when the button is clicked
        window.location.href = "/checkout.html";
      });
    })
    .catch(() => {
      document.getElementById("cart-items").innerHTML =
        "<p>Error loading cart items.</p>";
    });
}

// Remove product from cart
function removeFromCart(cartItemId) {
  fetch(`/cart/remove/${cartItemId}`, {
    method: "DELETE",
  })
    .then((res) => res.json())
    .then(() => {
      loadCart(); // Refresh cart
    })
    .catch(() => {
      alert("Failed to remove item from cart.");
    });
}

//Adding Click Listener in app.js
document.getElementById("checkout-btn")?.addEventListener("click", () => {
  fetch("/checkout", {
    method: "POST",
  })
    .then((res) => {
      if (res.redirected) {
        window.location.href = res.url;
      } else {
        return res.text().then(alert);
      }
    })
    .catch(() => alert("Checkout failed."));
});

// On page load
window.onload = () => {
  if (window.location.pathname.includes("/cart.html")) {
    loadCart();
  } else {
    const listPage = document.getElementById("product-list");
    if (listPage) loadProducts("crochet");
  }
};
