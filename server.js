const express = require('express');
const mongoose = require('mongoose');
const Product = require('./models/Product');
const City = require('./models/City');
const Order = require('./models/Order');
const Language = require('./models/Language');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const cityController = require('./controllers/cityController');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});
const bodyParser = require('body-parser');

const app = express();

// Increase the payload size limit to 10MB - This must be set before routes
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Enhanced CORS configuration (hostname-based matching)
const allowedOrigins = [
  'http://onyxia.store',
  'https://onyxia.store',
  'http://www.onyxia.store',
  'https://www.onyxia.store',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5001',
  'http://127.0.0.1:5001'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, internal health checks)
    if (!origin) return callback(null, true);
    
    // Check if the origin is in the allowed list or is a subdomain of our allowed domains
    const allowed = allowedOrigins.some(allowedOrigin => {
      return origin === allowedOrigin || 
             origin.startsWith(allowedOrigin.replace('*', '')) ||
             origin.endsWith('.onyxia.store');
    });
    
    if (allowed) {
      return callback(null, true);
    } else {
      const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
      console.error(msg);
      return callback(new Error(msg), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'X-Request-ID',
    'X-Client-Timestamp',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Methods'
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-Client-Timestamp',
    'Authorization'
  ],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware
app.use(cors(corsOptions));

app.use(cookieParser());

// Session Configuration
const SESSION_SECRET = process.env.SESSION_SECRET || 'your_super_secret_session_key_here';
const isProd = process.env.NODE_ENV === 'production';

// If behind a reverse proxy (Nginx), enable trust proxy so cookies work correctly
app.set('trust proxy', 1);

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 7 * 24 * 60 * 60 // 7 days in seconds
  }),
  cookie: {
    // Set secure to true in production. This requires HTTPS.
    secure: isProd,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax'
  }
}));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Add CORS headers to all responses
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Connect to MongoDB
console.log('Attempting to connect to MongoDB...');
// Prefer environment variable if set; fallback to Atlas cluster URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://xavihachem:sahara1000@Onyxia.z28fcca.mongodb.net/hamzashop?retryWrites=true&w=majority';
mongoose.connect(MONGODB_URI);

const db = mongoose.connection;

db.on('error', (error) => {
  console.error('MongoDB connection error:', error);
});

db.on('connected', () => {
  console.log('Connected to MongoDB successfully');  
  // List all collections to verify connection
  db.db.listCollections().toArray((err, collections) => {
    if (err) {
      console.error('Error listing collections:', err);
      return;
    }
    console.log('Available collections:', collections.map(c => c.name));
  });
});

db.once('open', async () => {
  console.log('MongoDB connection is open');
  
  // Initialize cities when the database connection is open
  try {
    console.log('Initializing cities...');
    await cityController.initializeCities();
    console.log('Cities initialized successfully');
  } catch (error) {
    console.error('Error initializing cities:', error);
  }
});

// Models are now imported at the top of the file

// Debug endpoint to check product schema
app.get('/api/debug/product-schema/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    res.json({
      success: true,
      data: {
        _id: product._id,
        name: product.name,
        hasSmallDescription: 'smallDescription' in product,
        smallDescription: product.smallDescription,
        schemaPaths: Object.keys(Product.schema.paths)
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ success: false, message: 'Debug error', error: error.message });
  }
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    // Get all products with selected fields
    console.log('Fetching all products...');
    const products = await Product.find({}, 'name description smallDescription price image additionalImages stock display_home home_position created_at');
    console.log('product fetched');
    // Convert to plain objects to ensure all fields are included
    const responseData = products.map(product => ({
      _id: product._id,
      smallDescription: product.smallDescription || '',
      name: product.name,
      description: product.description,
      price: product.price,
      image: product.image,
      imageUrl: product.image && !product.image.startsWith('data:')
        ? `${req.protocol}://${req.get('host')}${product.image}`
        : product.image,
      additionalImages: product.additionalImages || [],
      stock: product.stock,
      display_home: product.display_home || false,
      home_position: product.home_position || 0,
      created_at: product.created_at
    }));
    
    res.json(responseData);
    console.log('Response sent successfully with', responseData.length, 'products');
  } catch (err) {
    console.error('Error in /api/products:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    
    res.status(500).json({ 
      success: false,
      message: 'Error fetching products',
      error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
  }
});

// Get products for home page (display_home = true)
app.get('/api/products/home', async (req, res) => {
  try {
    console.log('Fetching home products...');
    const products = await Product
      .find(
        { display_home: true },
        'name description smallDescription price image additionalImages stock display_home home_position created_at'
      )
      .sort({ home_position: 1 });

    const responseData = products.map(product => ({
      _id: product._id,
      smallDescription: product.smallDescription || '',
      name: product.name,
      description: product.description,
      price: product.price,
      image: product.image,
      imageUrl: product.image && !product.image.startsWith('data:')
        ? `${req.protocol}://${req.get('host')}${product.image}`
        : product.image,
      additionalImages: product.additionalImages || [],
      stock: product.stock,
      display_home: product.display_home || false,
      home_position: product.home_position || 0,
      created_at: product.created_at
    }));

    res.json(responseData);
    console.log('Response sent successfully with', responseData.length, 'home products');
  } catch (err) {
    console.error('Error in /api/products/home:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    
    res.status(500).json({ 
      success: false,
      message: 'Error fetching home products',
      error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
  }
});

// Get single product by ID
app.get('/api/products/:id', async (req, res) => {
  const productId = req.params.id;
  console.log(`\n--- Request for product ${productId} ---`);
  
  // Validate ID format
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    console.error('Invalid product ID format:', productId);
    return res.status(400).json({
      success: false,
      message: 'Invalid product ID format'
    });
  }
  
  try {
    console.log(`Fetching product with ID: ${productId}`);
    const product = await Product.findById(productId);
    
    if (!product) {
      console.error('Product not found with ID:', productId);
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    console.log('Product found:', {
      id: product._id,
      name: product.name,
      price: product.price,
      smallDescription: product.smallDescription
    });
    
    // Explicitly include all fields we want to return
    const responseData = {
      _id: product._id,
      name: product.name,
      description: product.description,
      smallDescription: product.smallDescription || '',
      price: product.price,
      image: product.image,
      imageUrl: product.image && !product.image.startsWith('data:')
        ? `${req.protocol}://${req.get('host')}${product.image}`
        : product.image,
      additionalImages: product.additionalImages || [],
      stock: product.stock,
      display_home: product.display_home,
      home_position: product.home_position,
      created_at: product.created_at
    };
    
    res.json(responseData);
  } catch (err) {
    console.error('Error fetching product:', {
      id: productId,
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    
    res.status(500).json({ 
      success: false,
      message: 'Error fetching products',
      error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
  }
});

// Add request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

app.post('/api/products', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'additionalImages', maxCount: 10 }]), async (req, res) => {
    console.log('=== CREATE PRODUCT REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Small description in request:', req.body.smallDescription);
  try {
    console.log('=== NEW PRODUCT REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Uploaded files:', req.files);
    
    // Parse display_home and home_position with proper defaults
    const displayHome = req.body.display_home === 'true' || req.body.display_home === true;
    const homePosition = displayHome ? parseInt(req.body.home_position || '0', 10) : 0;
    
    // Handle file uploads
    let imagePath = '';
    let additionalImages = [];
    
    // Handle main image
    if (req.files && req.files.image && req.files.image[0]) {
      // If file was uploaded via multipart/form-data
      imagePath = '/uploads/' + req.files.image[0].filename;
      console.log('Main image uploaded:', imagePath);
    } else if (req.body.image) {
      // If image is sent as base64 in the body
      console.log('Main image received as base64');
      // Check if it's a base64 string or a path
      if (req.body.image.startsWith('data:image')) {
        imagePath = req.body.image;
      } else {
        // If it's a path, ensure it starts with /uploads/
        imagePath = req.body.image.startsWith('/') ? req.body.image : '/uploads/' + req.body.image;
      }
    }
    
    // Handle additional images
    if (req.files && req.files.additionalImages) {
      // If files were uploaded via multipart/form-data
      additionalImages = req.files.additionalImages.map(file => '/uploads/' + file.filename);
      console.log('Additional images uploaded:', additionalImages);
    } else if (req.body.additionalImages) {
      // If additional images are sent in the body (as base64 or array of base64)
      console.log('Additional images received in body');
      additionalImages = Array.isArray(req.body.additionalImages) ? 
        req.body.additionalImages : [req.body.additionalImages];
        
      // Process each additional image
      additionalImages = additionalImages.map(img => {
        if (img.startsWith('data:image')) {
          return img; // Keep as base64
        }
        // Ensure path starts with /uploads/
        return img.startsWith('/') ? img : '/uploads/' + img;
      });
    }
    
    // Handle stock data
    let stockData = {
      quantity: 0,
      status: 'غير متاح'
    };
    
    if (req.body.stock) {
      if (typeof req.body.stock === 'object' && req.body.stock.quantity !== undefined) {
        // If stock is an object with quantity and status
        stockData = {
          quantity: parseInt(req.body.stock.quantity) || 0,
          status: req.body.stock.status || (req.body.stock.quantity > 0 ? 'متاح' : 'غير متاح')
        };
      } else if (!isNaN(req.body.stock)) {
        // If stock is just a number (for backward compatibility)
        const stockQuantity = parseInt(req.body.stock, 10);
        stockData = {
          quantity: stockQuantity,
          status: stockQuantity > 0 ? 'متاح' : 'غير متاح'
        };
      }
    }
    
    console.log('Creating product with stock data:', stockData);
    
    const productData = {
      name: req.body.name,
      price: parseFloat(req.body.price || 0),
      description: req.body.description,
      smallDescription: req.body.smallDescription || '',
      display_home: displayHome,
      home_position: homePosition,
      stock: stockData,
      image: imagePath,
      additionalImages: additionalImages
    };
    
    console.log('Parsed product data:', productData);
    
    // Validate required fields
    const errors = {};
    if (!productData.name || productData.name.trim() === '') {
      errors.name = 'Product name is required';
    }
    if (isNaN(productData.price) || productData.price <= 0) {
      errors.price = 'Valid price is required';
    }
    if (!productData.description || productData.description.trim() === '') {
      errors.description = 'Description is required';
    }
    
    if (Object.keys(errors).length > 0) {
      console.error('Validation errors:', errors);
      return res.status(400).json({ 
        success: false, 
        message: 'Validation failed',
        errors: errors
      });
    }
    
    console.log('Creating product with data:', productData);
    
    const product = new Product(productData);
    const newProduct = await product.save();
    
    console.log('Product created successfully:', {
      id: newProduct._id,
      category: newProduct.category,
      hasAdditionalImages: newProduct.additionalImages ? newProduct.additionalImages.length : 0
    });
    
    res.status(201).json({
      success: true,
      data: newProduct
    });
  } catch (err) {
    console.error('Error creating product:', {
      message: err.message,
      stack: err.stack,
      name: err.name,
      errors: err.errors
    });
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errors = {};
      Object.keys(err.errors).forEach(key => {
        errors[key] = err.errors[key].message;
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: errors
      });
    }
    
    res.status(400).json({ 
      success: false,
      message: 'Error creating product',
      error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
  }
});

// Update a product
app.put('/api/products/:id', async (req, res) => {
    console.log(`=== UPDATE PRODUCT REQUEST (ID: ${req.params.id}) ===`);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Small description in request:', req.body.smallDescription);
  try {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid product ID format: ${req.params.id}`
      });
    }
    
    // Prepare update data
    const updateData = { ...req.body };
    
    // Include small description in update data if it exists in the request
    if ('smallDescription' in req.body) {
      updateData.smallDescription = req.body.smallDescription;
    }
    
    // Remove category from update data if it exists
    if (updateData.category) {
      delete updateData.category;
    }
    
    // Handle stock update
    if (updateData.stock) {
      // Initialize default stock data
      let stockQuantity = 0;
      
      // If stock is just a number (for backward compatibility)
      if (typeof updateData.stock === 'number' || (typeof updateData.stock === 'string' && !isNaN(updateData.stock))) {
        stockQuantity = Math.max(0, parseInt(updateData.stock, 10) || 0);
      }
      // If stock is an object with quantity and status
      else if (updateData.stock && typeof updateData.stock === 'object') {
        // Safely parse quantity
        if (updateData.stock.quantity !== undefined && updateData.stock.quantity !== null) {
          if (typeof updateData.stock.quantity === 'string') {
            stockQuantity = Math.max(0, parseInt(updateData.stock.quantity.trim(), 10) || 0);
          } else if (typeof updateData.stock.quantity === 'number') {
            stockQuantity = Math.max(0, updateData.stock.quantity);
          }
        }
      }
      
      // Always determine status from quantity to ensure consistency
      const stockStatus = stockQuantity > 0 ? 'متاح' : 'غير متاح';
      
      // Update the stock data with validated values
      updateData.stock = {
        quantity: stockQuantity,
        status: stockStatus
      };
    } else {
      // If no stock data provided, set default values
      updateData.stock = {
        quantity: 0,
        status: 'غير متاح'
      };
    }
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: `Product with ID ${req.params.id} not found`
      });
    }
    
    res.json({
      success: true,
      data: product
    });
    
  } catch (err) {
    // Handle validation errors
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message,
        value: e.value
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Handle duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      const value = err.keyValue[field];
      
      return res.status(400).json({
        success: false,
        message: `Duplicate key error: ${field} '${value}' already exists`,
        field,
        value
      });
    }
    
    // For all other errors
    console.error('Error updating product:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update product'
    });
  }
});

// Delete a product
app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Order Endpoints

// Create new order with cart items
app.post('/api/orders', async (req, res) => {
  console.log('=== CREATE ORDER REQUEST ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'phone', 'address', 'city', 'deliveryMethod', 'items'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        missingFields: missingFields
      });
    }
    
    // Validate cart items
    if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart must contain at least one item'
      });
    }

    // Process cart items
    let subtotal = 0;
    const items = req.body.items.map(item => {
      const itemTotal = parseFloat(item.price) * parseInt(item.quantity, 10);
      subtotal += itemTotal;
      
      // Validate required fields for each item
      if (!item.productId || !item.productName || !item.productImage) {
        throw new Error('Missing required fields in cart items: productId, productName, or productImage');
      }

      return {
        productId: item.productId, // from request
        name: item.productName,    // map productName to name
        image: item.productImage,  // map productImage to image
        price: parseFloat(item.price),
        quantity: parseInt(item.quantity, 10),
        itemTotal: itemTotal
      };
    });
    
    // Calculate shipping fee (you can implement your own logic here)
    const shippingFee = req.body.deliveryMethod === 'home' ? 500 : 0; // Example shipping fee
    const total = subtotal + shippingFee;
    
    // Prepare order data
    const orderData = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone,
      address: req.body.address,
      city: req.body.city,
      deliveryMethod: req.body.deliveryMethod,
      notes: req.body.notes || '',
      orderId: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      status: 'pending',
      items: items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: parseFloat(subtotal.toFixed(2)),
      shippingFee: shippingFee,
      total: parseFloat(total.toFixed(2)),
      orderDate: new Date()
    };

    console.log('Creating order with data:', orderData);
    const order = new Order(orderData);
    await order.save();
    
    console.log('Order created successfully:', order);
    res.status(201).json({ 
      success: true, 
      message: 'Order created successfully',
      orderId: order.orderId,
      data: order
    });
  } catch (err) {
    console.error('Error creating order:', {
      message: err.message,
      stack: err.stack,
      name: err.name,
      code: err.code
    });
    
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate order ID',
        error: 'An order with this ID already exists'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create order',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Get all orders
app.get('/api/orders', async (req, res) => {
  console.log('=== GET ALL ORDERS REQUEST ===');
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    console.log(`Found ${orders.length} orders`);
    res.json({ 
      success: true, 
      data: orders 
    });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch orders',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Get single order
app.get('/api/orders/:id', async (req, res) => {
  console.log(`=== GET ORDER REQUEST (ID: ${req.params.id}) ===`);
  try {
    const order = await Order.findOne({ orderId: req.params.id });
    if (!order) {
      console.log('Order not found');
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }
    console.log('Order found:', order);
    res.json({ 
      success: true, 
      data: order 
    });
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch order',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Update order status
app.put('/api/orders/:id', async (req, res) => {
  console.log(`=== UPDATE ORDER STATUS REQUEST (ID: ${req.params.id}) ===`);
  console.log('Update data:', req.body);
  
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Status is required' 
      });
    }

    const order = await Order.findOneAndUpdate(
      { orderId: req.params.id },
      { 
        status,
        updatedAt: new Date() 
      },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    console.log('Order status updated successfully:', order);
    res.json({ 
      success: true, 
      message: 'Order status updated',
      data: order
    });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update order status',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Test route
app.get('/test', (req, res) => {
    res.json({ message: 'API is working!' });
});

// Import and use routes
const cityRoutes = require('./routes/cityRoutes');
const orderRoutes = require('./routes/orderRoutes');
const languageRoutes = require('./routes/languageRoutes');

app.use('/api/cities', cityRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/languages', languageRoutes);

// --- Admin Authentication Routes ---
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'H01a05M19z97A@';

// Middleware to check if the user is authenticated
const isAuthenticated = (req, res, next) => {
  console.log('--- isAuthenticated Middleware ---');
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  console.log('Request cookies:', req.headers.cookie);

  if (req.session && req.session.user) {
    console.log('Authentication successful for user:', req.session.user.username);
    return next();
  }
  
  console.log('Authentication failed: No user found in session.');
  return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
};

// POST /api/admin/login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    // Regenerate session to prevent session fixation attacks
    req.session.regenerate(function(err) {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
      }
      
      // Store user information in session
      req.session.user = { username: username };
      console.log('--- Login Successful ---');
      console.log('Session created for user:', username);
      console.log('Session ID:', req.sessionID);
      console.log('Set-Cookie will be sent with response for session.');
      
      // Save the session before responding
      req.session.save(err => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ success: false, message: 'Login failed to save session.' });
        }
        return res.json({ success: true, message: 'Login successful' });
      });
    });
  } else {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// GET /api/admin/verify - Always return JSON, avoid proxy HTML error pages
app.get('/api/admin/verify', (req, res) => {
  console.log('--- /api/admin/verify ---');
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  console.log('Request cookies:', req.headers.cookie);

  if (req.session && req.session.user) {
    return res.json({ success: true, user: req.session.user });
  }
  // Do not use 401 here to avoid proxies replacing the JSON body with HTML
  return res.json({ success: false, message: 'Not authenticated' });
});

// POST /api/admin/logout
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Could not log out, please try again.' });
    }
    res.clearCookie('connect.sid'); // clear the session cookie
    return res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Secure admin-only endpoints
app.post('/api/products', isAuthenticated, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'additionalImages', maxCount: 10 }]), async (req, res) => {
    console.log('=== CREATE PRODUCT REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Small description in request:', req.body.smallDescription);
  try {
    console.log('=== NEW PRODUCT REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Uploaded files:', req.files);
    
    // Parse display_home and home_position with proper defaults
    const display_home = req.body.display_home === 'true' || req.body.display_home === true;
    const home_position = display_home ? parseInt(req.body.home_position, 10) || 0 : 0;

    let imagePath = '';
    if (req.files && req.files.image && req.files.image[0]) {
      imagePath = '/uploads/' + req.files.image[0].filename;
    } else if (req.body.image) {
      // Handle case where image is a URL or existing path
      if (req.body.image.startsWith('http')) {
        imagePath = req.body.image;
      } else {
        // If it's a path, ensure it starts with /uploads/
        imagePath = req.body.image.startsWith('/') ? req.body.image : '/uploads/' + req.body.image;
      }
    }
    
    // Handle additional images
    let additionalImagePaths = [];
    if (req.files && req.files.additionalImages) {
      additionalImagePaths = req.files.additionalImages.map(file => '/uploads/' + file.filename);
    } else if (req.body.additionalImages) {
      try {
        const parsedImages = JSON.parse(req.body.additionalImages);
        if (Array.isArray(parsedImages)) {
          additionalImagePaths = parsedImages;
        }
      } catch (e) {
        console.error('Could not parse additionalImages JSON:', e);
      }
    }

    const newProduct = new Product({
      name: req.body.name,
      price: req.body.price,
      description: req.body.description,
      smallDescription: req.body.smallDescription,
      image: imagePath,
      additionalImages: additionalImagePaths,
      stock: req.body.stock,
      display_home: display_home,
      home_position: home_position,
      created_at: new Date()
    });

    await newProduct.save();
    console.log('Product created successfully:', newProduct);
    res.status(201).json({ success: true, data: newProduct });
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ success: false, message: 'Error creating product', error: err.message });
  }
});

app.put('/api/products/:id', isAuthenticated, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'additionalImages', maxCount: 10 }]), async (req, res) => {
  console.log(`=== UPDATE PRODUCT REQUEST (ID: ${req.params.id}) ===`);
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Uploaded files:', req.files);
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Parse boolean and number values
    if (updateData.display_home !== undefined) {
      updateData.display_home = updateData.display_home === 'true' || updateData.display_home === true;
    }
    if (updateData.home_position !== undefined) {
      updateData.home_position = parseInt(updateData.home_position, 10) || 0;
    }

    // Handle main image update
    if (req.files && req.files.image && req.files.image[0]) {
      updateData.image = '/uploads/' + req.files.image[0].filename;
    } else if (updateData.image && !updateData.image.startsWith('/uploads/') && !updateData.image.startsWith('http')) {
      // If a non-path string is sent, prepend the path
      updateData.image = '/uploads/' + updateData.image;
    }

    // Handle additional images update
    if (req.files && req.files.additionalImages) {
      const newImages = req.files.additionalImages.map(file => '/uploads/' + file.filename);
      // Get existing product to combine images
      const product = await Product.findById(id);
      updateData.additionalImages = [...(product.additionalImages || []), ...newImages];
    } else if (updateData.additionalImages) {
      try {
        const parsedImages = JSON.parse(updateData.additionalImages);
        if (Array.isArray(parsedImages)) {
          updateData.additionalImages = parsedImages;
        }
      } catch (e) {
        console.error('Could not parse additionalImages on update:', e);
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    console.log('Product updated successfully:', updatedProduct);
    res.json({ success: true, data: updatedProduct });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ success: false, message: 'Error updating product', error: err.message });
  }
});

app.delete('/api/products/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const deletedProduct = await Product.findByIdAndDelete(id);
    if (!deletedProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting product', error: err.message });
  }
});

app.put('/api/orders/:id', isAuthenticated, async (req, res) => {
  console.log(`=== UPDATE ORDER STATUS REQUEST (ID: ${req.params.id}) ===`);
  console.log('Update data:', req.body);
  
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Status is required' 
      });
    }

    const order = await Order.findOneAndUpdate(
      { orderId: req.params.id },
      { 
        status,
        updatedAt: new Date() 
      },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    console.log('Order status updated successfully:', order);
    res.json({ 
      success: true, 
      message: 'Order status updated',
      data: order
    });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update order status',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Handle 404 - This should be after all other routes
app.use((req, res) => {
  console.log(`404 - ${req.method} ${req.url}`);
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handling middleware - This should be after all other middleware and routes
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
  console.log(`Test endpoint accessible at http://<your_vps_ip>:${PORT}/test`);
  console.log(`API Endpoint accessible at http://<your_vps_ip>:${PORT}/api`);
});
