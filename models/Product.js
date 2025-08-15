const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  smallDescription: { 
    type: String, 
    default: '' 
  },
  description: { 
    type: String, 
    required: true 
  },
  price: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  image: { 
    type: String 
  },
  additionalImages: { 
    type: [String], 
    default: [] 
  },
  stock: { 
    quantity: { 
      type: Number, 
      default: 0 
    },
    status: { 
      type: String, 
      enum: ['متاح', 'غير متاح'],
      default: 'متاح'
    }
  },
  display_home: { 
    type: Boolean, 
    default: false 
  },
  home_position: { 
    type: Number, 
    default: 0 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  }
});

// Update existing products to use the new stock structure
productSchema.pre('save', function(next) {
  if (this.isNew && typeof this.stock === 'number') {
    this.stock = {
      quantity: this.stock,
      status: this.stock > 0 ? 'متاح' : 'غير متاح'
    };
  }
  next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
