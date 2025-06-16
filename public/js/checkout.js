let currentUser = null;
let isBuyNow = false;
let checkoutItem = null;

fetch("/api/user")
  .then((res) => {
    if (res.status === 401) throw new Error("Not logged in");
    return res.json();
  })
  .then((user) => {
    currentUser = user;
    loadCheckoutDetails();
  })
  .catch(() => {
    currentUser = null;
    showMessage("Please log in to view your checkout.", true);
  });

function loadCheckoutDetails() {
  const productId = sessionStorage.getItem("productId");
  const genre = sessionStorage.getItem("genre");
  const quantity = parseInt(sessionStorage.getItem("quantity"));

  if (productId && genre && quantity) {
    isBuyNow = true;

    fetch(`/product/${genre}/${productId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Product not found");
        return res.json();
      })
      .then((product) => {
        const total = product.price * quantity;
        checkoutItem = {
          product_id: product.id,
          genre: genre,
          name: product.name,
          quantity,
          price: product.price,
          total,
        };

        document.getElementById("checkout-product-details").innerHTML = `
          <h2>Order Summary</h2>
          <div class="checkout-item">
            <h3>${product.name}</h3>
            <p><strong>Quantity:</strong> ${quantity}</p>
            <p><strong>Price:</strong> $${product.price}</p>
            <p><strong>Total:</strong> $${total.toFixed(2)}</p>
          </div>
        `;
      })
      .catch((err) => {
        console.error(err);
        showMessage("Error loading checkout product details.", true);
      });
  } else {
    fetch("/cart")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load cart");
        return res.json();
      })
      .then((cartItems) => {
        if (cartItems.length === 0) {
          document.getElementById("checkout-product-details").innerHTML =
            "<p>Your cart is empty.</p>";
          return;
        }

        let total = 0;
        let html = "<h2>Your Cart</h2>";
        checkoutItem = cartItems.map((item) => {
          const itemTotal = item.price * item.quantity;
          total += itemTotal;
          return {
            product_id: item.product_id,
            genre: item.genre,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: itemTotal,
          };
        });

        cartItems.forEach((item) => {
          const itemTotal = item.price * item.quantity;
          html += `
            <div class="checkout-item">
              <h3>${item.name}</h3>
              <p><strong>Quantity:</strong> ${item.quantity}</p>
              <p><strong>Price:</strong> $${item.price}</p>
              <p><strong>Item Total:</strong> $${itemTotal.toFixed(2)}</p>
              <hr />
            </div>
          `;
        });

        html += `<h3>Grand Total: $${total.toFixed(2)}</h3>`;
        document.getElementById("checkout-product-details").innerHTML = html;
      })
      .catch((error) => {
        console.error(error);
        showMessage("Error loading cart data.", true);
      });
  }
}

document.getElementById("checkout-form").addEventListener("submit", (e) => {
  e.preventDefault();

  if (!currentUser) {
    showMessage("You must be logged in to complete the purchase.", true);
    return;
  }

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const address = document.getElementById("address").value.trim();

  if (!name || !email || !phone || !address) {
    showMessage("Please fill in all required fields.", true);
    return;
  }

  const orderData = {
    user_id: currentUser.id,
    name,
    email,
    phone,
    address,
    payment_method: "Cash on Delivery",
    items: Array.isArray(checkoutItem) ? checkoutItem : [checkoutItem],
  };

  fetch("/place-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(orderData),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to place order");
      return res.json();
    })
    .then(() => {
      if (isBuyNow) {
        sessionStorage.removeItem("productId");
        sessionStorage.removeItem("genre");
        sessionStorage.removeItem("quantity");
      }

      showMessage("Order placed successfully!");
      document.getElementById("checkout-form").reset();
      document.getElementById("checkout-product-details").innerHTML = "";
    })
    .catch((err) => {
      console.error(err);
      showMessage("Error placing order.", true);
    });
});

function showMessage(message, isError = false) {
  let msgBox = document.getElementById("checkout-message");

  if (!msgBox) {
    msgBox = document.createElement("div");
    msgBox.id = "checkout-message";
    document.querySelector("main").appendChild(msgBox);
  }

  msgBox.textContent = message;
  msgBox.style.color = isError ? "red" : "green";
  msgBox.style.marginTop = "10px";
}
