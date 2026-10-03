const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    id: { type: Number, required: true },
    name: { type: String, required: true },
    qty: { type: Number, required: true },
    price: { type: Number, required: true },
    total: { type: Number, required: true }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true },
    student: { type: String, required: true },
    items: { type: [orderItemSchema], required: true },
    total: { type: Number, required: true },
    status: { type: String, enum: ['New', 'Confirmed', 'Ready', 'Completed'], default: 'New' },
    paymentStatus: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
    upiTransactionId: { type: String, default: '' },
    pickupSlot: { type: String, default: '' },
    paymentMethod: { type: String, default: 'UPI' },
    token: { type: String, default: '' },
    rating: { type: Number, default: 0 },
    feedback: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);