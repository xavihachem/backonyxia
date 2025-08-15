const mongoose = require('mongoose');
const Order = require('./models/Order');

async function analyzeOrders() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://xavihachem:sahara1000@Onyxia.z28fcca.mongodb.net/hamzashop?retryWrites=true&w=majority';
    await mongoose.connect(MONGODB_URI);

    console.log('Connected to MongoDB');

    // Get all orders
    const orders = await Order.find().sort({ createdAt: -1 });
    
    if (orders.length === 0) {
      console.log('No orders found in the database.');
      return;
    }

    console.log(`\n=== ORDER ANALYSIS REPORT ===`);
    console.log(`Total Orders: ${orders.length}`);

    // Analyze by status
    const statusCount = {};
    orders.forEach(order => {
      statusCount[order.status] = (statusCount[order.status] || 0) + 1;
    });
    console.log('\nOrders by Status:');
    console.table(statusCount);

    // Analyze by city
    const cityStats = {};
    orders.forEach(order => {
      cityStats[order.city] = (cityStats[order.city] || 0) + 1;
    });
    console.log('\nOrders by City:');
    console.table(cityStats);

    // Calculate total revenue
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    console.log(`\nTotal Revenue: ${totalRevenue.toFixed(2)} DZD`);

    // Calculate average order value
    const avgOrderValue = totalRevenue / orders.length;
    console.log(`Average Order Value: ${avgOrderValue.toFixed(2)} DZD`);

    // Get recent orders
    console.log('\nRecent Orders:');
    const recentOrders = orders.slice(0, 5).map(order => ({
      id: order.orderId,
      date: order.createdAt.toLocaleDateString(),
      customer: `${order.firstName} ${order.lastName}`,
      city: order.city,
      status: order.status,
      total: `${order.total} DZD`
    }));
    console.table(recentOrders);

    // Analyze delivery methods
    const deliveryMethods = {};
    orders.forEach(order => {
      deliveryMethods[order.deliveryMethod] = (deliveryMethods[order.deliveryMethod] || 0) + 1;
    });
    console.log('\nDelivery Methods:');
    console.table(deliveryMethods);

  } catch (error) {
    console.error('Error analyzing orders:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
  }
}

analyzeOrders();
