const mongoose = require('mongoose');

async function testConnection() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://xavihachem:sahara1000@Onyxia.z28fcca.mongodb.net/hamzashop?retryWrites=true&w=majority';
    await mongoose.connect(MONGODB_URI);
    console.log('Successfully connected to MongoDB');

    // Define the Product model
    const Product = mongoose.model('Product', new mongoose.Schema({
      name: { type: String, required: true },
      description: { type: String, required: true },
      price: { type: Number, required: true, min: 0 },
      image: { type: String },
      category: { type: String },
      stock: { type: Number, default: 0 },
      display_home: { type: Boolean, default: false },
      home_position: { type: Number, default: 0 },
      created_at: { type: Date, default: Date.now }
    }));

    // Count existing products
    const count = await Product.countDocuments();
    console.log(`Found ${count} products in the database`);

    if (count === 0) {
      console.log('Adding a test product...');
      const testProduct = new Product({
        name: 'Test Product',
        description: 'This is a test product',
        price: 99.99,
        category: 'test',
        stock: 10
      });
      await testProduct.save();
      console.log('Test product added successfully');
    }

    // List all products
    const products = await Product.find();
    console.log('All products:', JSON.stringify(products, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

testConnection();
