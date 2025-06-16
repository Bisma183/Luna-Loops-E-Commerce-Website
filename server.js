// server.js
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2");
const path = require("path");
const adminEmail = "admin@lunaloops.com";
const adminPassword = "admin123";
require("dotenv").config();

const app = express();

// MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("MySQL connection failed:", err);
    return;
  }
  console.log("Connected to MySQL database!");
});

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(
  session({
    secret: "yourSecret",
    resave: false,
    saveUninitialized: true,
  })
);

// Serve static files (like images)
app.use("/public", express.static(path.join(__dirname, "public")));

// Serve static HTML files (like index.html, product-details.html)
app.use(express.static(__dirname)); // Add this line to serve your .html files

// Serve static HTML pages
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "signup.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/checkout", (req, res) => {
  res.sendFile(path.join(__dirname, "checkout.html"));
});

// Signup logic with bcryptjs password hashing
app.post("/signup", (req, res) => {
  console.log("Signup form data:", req.body); // Log the form data
  if (req.body.role === "admin") {
    return res.send("You are not allowed to create admin accounts.");
  }

  const { username, email, password, role } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) return res.status(500).send("Error checking email");

    if (results.length > 0) {
      return res.status(400).send("Email already in use");
    }

    db.query(
      "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [username, email, hashedPassword, role || "customer"],
      (err, result) => {
        if (err) {
          console.error("Insert error:", err); // Log the error
          return res.status(500).send("Error registering user");
        }
        console.log("User registered successfully:", result);
        res.redirect("/");
      }
    );
  });
});

// Login logic with bcryptjs password comparison
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (email === adminEmail && password === adminPassword) {
    // Allow login as admin
    req.session.user = { email, role: "admin" };
    return res.redirect("/admin-dashboard.html");
  }

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err || results.length === 0) {
      console.log("User not found or DB error:", err);
      return res.status(401).send("Invalid credentials");
    }

    const user = results[0];
    console.log("User found:", user); // 👈 Log user from DB
    console.log("Entered password:", password);
    console.log("Stored hash:", user.password_hash);

    if (!bcrypt.compareSync(password, user.password_hash)) {
      console.log("Password mismatch");
      return res.status(401).send("Invalid credentials");
    }

    req.session.user = {
      id: user.id,
      name: user.username,
      role: user.role,
    };

    if (user.role === "admin") {
      res.redirect("/admin-dashboard.html");
    } else {
      res.redirect("/customer-dashboard.html");
    }
  });
});

// Serve dashboard pages
app.get("/customer-dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, "customer-dashboard.html"));
});

app.get("/admin-dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, "admin-dashboard.html"));
});

// Product API
app.get("/products/:genre", (req, res) => {
  const genre = req.params.genre;
  const page = parseInt(req.query.page) || 1;
  const productsPerPage = 10;
  const offset = (page - 1) * productsPerPage;

  let query = "";
  switch (genre) {
    case "crochet":
      query = "SELECT * FROM crochet_products LIMIT ? OFFSET ?";
      break;
    case "embroidered":
      query = "SELECT * FROM embroidered_goods LIMIT ? OFFSET ?";
      break;
    case "accessories":
      query = "SELECT * FROM handmade_accessories LIMIT ? OFFSET ?";
      break;
    case "paintings":
      query = "SELECT * FROM paintings LIMIT ? OFFSET ?";
      break;
    default:
      return res.status(404).json({ error: "Invalid genre" });
  }

  db.query(query, [productsPerPage, offset], (err, results) => {
    if (err) {
      res.status(500).json({ error: "Database error" });
    } else {
      res.json(results);
    }
  });
});

// Get individual product by genre and ID
app.get("/product/:genre/:id", (req, res) => {
  const { genre, id } = req.params;
  let table = "";

  switch (genre) {
    case "crochet":
      table = "crochet_products";
      break;
    case "embroidered":
      table = "embroidered_goods";
      break;
    case "accessories":
      table = "handmade_accessories";
      break;
    case "paintings":
      table = "paintings";
      break;
    default:
      return res.status(400).send("Invalid genre");
  }

  db.query(`SELECT * FROM ${table} WHERE id = ?`, [id], (err, results) => {
    if (err) return res.status(500).send("Database error");
    if (results.length === 0) return res.status(404).send("Product not found");

    res.json(results[0]);
  });
});

// **Add to Cart Route (Insert Cart Item)** - ADD THIS HERE
app.post("/add-to-cart", (req, res) => {
  console.log("Add to cart request body:", req.body); // 👈 Add this line

  const { user_id, product_id, quantity, genre } = req.body;

  if (!user_id) {
    return res.status(401).json({ message: "Please log in to add to cart." });
  }

  const query =
    "INSERT INTO cart (user_id, product_id, quantity, genre) VALUES (?, ?, ?, ?)";
  db.query(
    query,
    [user_id, product_id, quantity || 1, genre],
    (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Internal Server Error" });
      }
      res.json({ message: "Product added to cart successfully!" });
    }
  );
});

app.get("/api/user", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not logged in" });
  }
  res.json(req.session.user);
});

//delete from cart
app.delete("/cart/remove/:id", (req, res) => {
  const userId = req.session.user?.id;
  const cartItemId = req.params.id;

  if (!userId) {
    return res.status(401).json({ message: "Not logged in" });
  }

  const query = "DELETE FROM cart WHERE id = ? AND user_id = ?";
  db.query(query, [cartItemId, userId], (err, result) => {
    if (err) return res.status(500).json({ error: "Database error" });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    res.json({ message: "Item removed from cart" });
  });
});

//complete purchase
app.post("/place-order", (req, res) => {
  const { user_id, name, address, email, phone, items } = req.body;

  if (
    !user_id ||
    !name ||
    !address ||
    !email ||
    !phone ||
    !items ||
    items.length === 0
  ) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const query = `INSERT INTO orders (user_id, product_id, genre, quantity, name, address, email, phone, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

  // Convert db.query calls into promises
  const insertPromises = items.map((item) => {
    const { product_id, genre, quantity } = item;

    if (!product_id || !genre || !quantity) {
      return Promise.reject(new Error("Missing item fields"));
    }

    return new Promise((resolve, reject) => {
      db.query(
        query,
        [user_id, product_id, genre, quantity, name, address, email, phone],
        (err, result) => {
          if (err) {
            console.error("Error placing order for item:", item, err);
            reject(err);
          } else {
            resolve(result);
          }
        }
      );
    });
  });

  // Execute all insertions
  Promise.all(insertPromises)
    .then(() => {
      res.json({ message: "Order placed successfully" });
    })
    .catch((err) => {
      console.error("Order placement failed:", err);
      res.status(500).json({ message: "Database error while placing order" });
    });
});

//cart
app.get("/cart", (req, res) => {
  const userId = req.session.user?.id;

  // Check if the user is logged in
  if (!userId) {
    return res.status(401).json({ message: "Not logged in" });
  }

  // Query to fetch cart items
  const query = `
    SELECT c.id, c.product_id, c.quantity, c.genre,
           p.name, p.price, p.image_url
    FROM cart c
    JOIN (
      SELECT id, name, price, image_url, 'crochet' AS genre FROM crochet_products
      UNION
      SELECT id, name, price, image_url, 'embroidered' FROM embroidered_goods
      UNION
      SELECT id, name, price, image_url, 'accessories' FROM handmade_accessories
      UNION
      SELECT id, name, price, image_url, 'paintings' FROM paintings
    ) p ON c.product_id = p.id AND c.genre = p.genre
    WHERE c.user_id = ?;
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    // Return the cart items as a JSON response
    res.json(results);
  });
});

//Adding this route on your backend to handle the checkout request
app.post("/checkout", (req, res) => {
  const userId = req.session.user?.id;

  if (!userId) {
    return res.status(401).send("Not logged in");
  }

  const deleteQuery = `DELETE FROM cart WHERE user_id = ?`;

  db.query(deleteQuery, [userId], (err) => {
    if (err) return res.status(500).send("Failed to checkout");

    // Optionally, redirect to an order confirmation page
    res.redirect("/order-confirmation.html");
  });
});

// Logout route
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// Admin: Fetch all products from all categories
app.get("/admin/products", (req, res) => {
  const queries = [
    "SELECT id, name, description, price, image_url, 'crochet'    AS genre FROM crochet_products",
    "SELECT id, name, description, price, image_url, 'embroidered' AS genre FROM embroidered_goods",
    "SELECT id, name, description, price, image_url, 'accessories' AS genre FROM handmade_accessories",
    "SELECT id, name, description, price, image_url, 'paintings'   AS genre FROM paintings",
  ];

  Promise.all(
    queries.map(
      (q) =>
        new Promise((resolve, reject) => {
          db.query(q, (err, results) => (err ? reject(err) : resolve(results)));
        })
    )
  )
    .then((results) => res.json([].concat(...results)))
    .catch((err) => res.status(500).json({ error: "DB error" }));
});

// Admin: View users
app.get("/admin/users", (req, res) => {
  db.query("SELECT id, username, email, role FROM users", (err, results) => {
    if (err) return res.status(500).json({ error: "DB error" });
    res.json(results);
  });
});

// Admin: View orders (make sure you have an 'orders' table)
// Admin: View orders with detailed product info
app.get("/admin/orders", (req, res) => {
  const query = `
(
  SELECT
    o.id           AS order_id,
    o.user_id,
    u.username,
    u.email,
    o.name         AS shipping_name,
    o.address,
    o.phone,
    o.created_at,
    o.product_id,
    o.genre,
    o.quantity,
    p.name         AS product_name,
    p.price
  FROM orders o
  JOIN users u               ON o.user_id = u.id
  JOIN crochet_products p    ON p.id = o.product_id
  WHERE o.genre = 'crochet'
)
UNION ALL
(
  SELECT
    o.id,
    o.user_id,
    u.username,
    u.email,
    o.name,
    o.address,
    o.phone,
    o.created_at,
    o.product_id,
    o.genre,
    o.quantity,
    p.name,
    p.price
  FROM orders o
  JOIN users u                 ON o.user_id = u.id
  JOIN embroidered_goods p     ON p.id = o.product_id
  WHERE o.genre = 'embroidered'
)
UNION ALL
(
  SELECT
    o.id,
    o.user_id,
    u.username,
    u.email,
    o.name,
    o.address,
    o.phone,
    o.created_at,
    o.product_id,
    o.genre,
    o.quantity,
    p.name,
    p.price
  FROM orders o
  JOIN users u                   ON o.user_id = u.id
  JOIN handmade_accessories p   ON p.id = o.product_id
  WHERE o.genre = 'accessories'
)
UNION ALL
(
  SELECT
    o.id,
    o.user_id,
    u.username,
    u.email,
    o.name,
    o.address,
    o.phone,
    o.created_at,
    o.product_id,
    o.genre,
    o.quantity,
    p.name,
    p.price
  FROM orders o
  JOIN users u          ON o.user_id = u.id
  JOIN paintings p      ON p.id = o.product_id
  WHERE o.genre = 'paintings'
)
ORDER BY created_at DESC`;

  db.query(query, (err, results) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ error: "Error fetching orders" });
    }

    res.json(results);
  });
});

// Middleware to parse JSON if not already used
app.use(express.json());

//status api
app.post("/admin/orders/update-status", (req, res) => {
  const { orderId, status } = req.body;

  const query = "UPDATE orders SET status = ? WHERE id = ?";
  db.query(query, [status, orderId], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Failed to update order status");
    }
    res.send("Order status updated successfully");
  });
});

// Add new product (Admin only)
app.post("/admin/products/add", (req, res) => {
  const { name, description, price, image_url, genre } = req.body;

  let table = "";
  switch (genre) {
    case "crochet":
      table = "crochet_products";
      break;
    case "embroidered":
      table = "embroidered_goods";
      break;
    case "accessories":
      table = "handmade_accessories";
      break;
    case "paintings":
      table = "paintings";
      break;
    default:
      return res.status(400).send("Invalid genre");
  }

  const sql = `INSERT INTO ${table} (name, description, price, image_url) VALUES (?, ?, ?, ?)`;
  db.query(sql, [name, description, price, image_url], (err, result) => {
    if (err) {
      console.error("Error adding product:", err);
      return res.status(500).send("Error adding product");
    }
    res.send("Product added successfully!");
  });
});

// Delete product by ID (Admin only)
app.delete("/admin/products/delete/:genre/:id", (req, res) => {
  const { genre, id } = req.params;
  const tableMap = {
    crochet: "crochet_products",
    embroidered: "embroidered_goods",
    accessories: "handmade_accessories",
    paintings: "paintings",
  };
  const table = tableMap[genre];
  if (!table) return res.status(400).send("Invalid genre");

  const sql = `DELETE FROM ${table} WHERE id = ?`;
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Error deleting product:", err);
      return res.status(500).send("Error deleting product");
    }
    res.send("Product deleted successfully!");
  });
});

// Start server
app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
