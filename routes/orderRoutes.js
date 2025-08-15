const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// Get all orders
router.get('/', async (req, res) => {
  try {
    console.log('=== GET ALL ORDERS REQUEST ===');
    const orders = await Order.find().sort({ createdAt: -1 });
    console.log(`Found ${orders.length} orders`);
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: 'Error fetching orders', error: error.message });
  }
});

// Get a single order by ID
router.get('/:id', async (req, res) => {
  try {
    console.log(`=== GET ORDER REQUEST (ID: ${req.params.id}) ===`);
    const order = await Order.findOne({ orderId: req.params.id });
    
    if (!order) {
      console.log(`Order not found with ID: ${req.params.id}`);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    console.log('Order found:', order);
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, message: 'Error fetching order', error: error.message });
  }
});

// Update order status
router.patch('/:id/status', async (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;
  const timestamp = new Date().toISOString();
  
  console.log(`\n=== [${timestamp}] UPDATE ORDER STATUS REQUEST ===`);
  console.log(`Order ID: ${orderId}`);
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
  console.log('Request Headers:', JSON.stringify(req.headers, null, 2));
  
  if (!status) {
    console.error('Error: Status is required');
    return res.status(400).json({ 
      success: false, 
      message: 'Status is required' 
    });
  }
  
  if (!status) {
    return res.status(400).json({ 
      success: false, 
      message: 'Status is required' 
    });
  }
  
  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    console.error(`Error: Invalid status '${status}'. Must be one of:`, validStatuses);
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
    });
  }
  
  try {
    console.log(`Attempting to find and update order ${orderId} with status: ${status}`);
    
    const updatedOrder = await Order.findOneAndUpdate(
      { orderId: orderId },
      { $set: { status: status, updatedAt: new Date() } },
      { new: true, runValidators: true }
    );
    
    if (!updatedOrder) {
      console.error(`Error: Order not found with ID: ${orderId}`);
      return res.status(404).json({ 
        success: false, 
        message: `Order with ID ${orderId} not found` 
      });
    }
    
    console.log('=== ORDER STATUS UPDATE SUCCESS ===');
    console.log(`Order ID: ${updatedOrder.orderId}`);
    console.log('Old Status:', updatedOrder.status);
    console.log('New Status:', status);
    console.log('Updated At:', updatedOrder.updatedAt);
    console.log('Full Order Details:', JSON.stringify(updatedOrder, null, 2));
    
    res.json({ 
      success: true, 
      message: 'Order status updated successfully',
      order: updatedOrder
    });
    
  } catch (error) {
    console.error('=== ERROR UPDATING ORDER STATUS ===');
    console.error('Timestamp:', new Date().toISOString());
    console.error('Order ID:', orderId);
    console.error('Requested Status:', status);
    console.error('Error Details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      success: false, 
      message: 'Error updating order status', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    console.log(`=== END OF REQUEST - ${new Date().toISOString()} ===\n`);
  }
});

// Delete an order
router.delete('/:id', async (req, res) => {
  const orderId = req.params.id;
  console.log(`=== DELETE ORDER REQUEST (ID: ${orderId}) ===`);
  
  try {
    // Find and delete the order
    const deletedOrder = await Order.findOneAndDelete({ orderId: orderId });
    
    if (!deletedOrder) {
      console.log(`Order not found with ID: ${orderId}`);
      return res.status(404).json({ 
        success: false, 
        message: `Order with ID ${orderId} not found` 
      });
    }
    
    console.log('Successfully deleted order:', deletedOrder);
    res.json({ 
      success: true, 
      message: 'Order deleted successfully',
      order: deletedOrder
    });
    
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting order', 
      error: error.message 
    });
  }
});

module.exports = router;
