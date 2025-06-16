let currentUser = null;

// Get genre and product ID from URL
const params = new URLSearchParams(window.location.search);
const genre = params.get("genre");
const id = params.get("id");

// First fetch current user
fetch("/api/user")
  .then((res) => {
    if (res.status === 401) throw new Error("Not logged in");
    return res.json();
  })
  .then((user) => {
    currentUser = user;
    loadProductDetails(); // Load product only after user is known
  })
  .catch(() => {
    currentUser = null;
    loadProductDetails(); // Still load product even if user is not logged in
  });

// Function to load product details and render UI
// Function to load product details and render UI
function loadProductDetails() {
  fetch(`/product/${genre}/${id}`)
    .then((res) => {
      if (!res.ok) throw new Error("Product not found");
      return res.json();
    })
    .then((product) => {
      document.getElementById("product-details").innerHTML = `
        <div class="product-image">
          <img src="/public/images/${product.image_url}" alt="${product.name}" width="300">
        </div>
        <div class="product-details">
          <h2>${product.name}</h2>
          <p class="description">${product.description}</p>
          <p class="price"><strong>Price:</strong> $${product.price}</p>
          <label for="quantity">Quantity:</label>
          <input type="number" id="quantity" value="1" min="1" max="10" />
        </div>
      `;

      document.getElementById("add-to-cart-btn-container").innerHTML = `
        <button class="add-to-cart-btn" onclick="addToCart(${product.id}, '${genre}')">
          Add to Cart
        </button>
        <button class="buy-now-btn" onclick="buyNow(${product.id}, '${genre}')">
          Buy Now
        </button>
        <div id="cart-message" style="margin-top: 10px;"></div>
      `;
    })
    .catch((error) => {
      console.error("Error loading product:", error);
      showPopupMessage("Error loading product details.");
    });
}

// Function to handle Buy Now (redirects to checkout page)
function buyNow(productId, genre) {
  const quantity = parseInt(document.getElementById("quantity").value);

  if (!currentUser) {
    showPopupMessage("Please log in to buy now.");
    return;
  }

  // Store the selected product and quantity in sessionStorage for the checkout page
  sessionStorage.setItem("productId", productId);
  sessionStorage.setItem("genre", genre);
  sessionStorage.setItem("quantity", quantity);

  // Redirect to the checkout page
  window.location.href = "/checkout";
}

// Function to handle Add to Cart
function addToCart(productId, genre) {
  console.log("Add to Cart clicked"); // Debug line
  const quantity = parseInt(document.getElementById("quantity").value);

  if (!currentUser) {
    showPopupMessage("Please log in to add to cart.");
    return;
  }

  fetch("/add-to-cart", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: currentUser.id,
      product_id: productId,
      genre,
      quantity,
    }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to add to cart");
      return res.json();
    })
    .then((data) => {
      showPopupMessage("Item added to cart successfully!");
    })
    .catch((error) => {
      console.error(error);
      showPopupMessage("Error adding item to cart.");
    });
}

// Function to display popup messages
function showPopupMessage(message, isError = false) {
  const msgDiv = document.getElementById("cart-message");

  // Clear previous content and apply styling
  msgDiv.textContent = message;
  msgDiv.classList.remove("show", "error");

  if (isError) {
    msgDiv.classList.add("error");
  } else {
    msgDiv.classList.add("show");
  }

  // Hide message after 2 seconds
  setTimeout(() => {
    msgDiv.classList.remove("show");
  }, 2000);
}
