require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const nodemailer = require('nodemailer');

// Nodemailer transporter — replace with your Gmail credentials or use env vars
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER || 'your_gmail@gmail.com',
        pass: process.env.MAIL_PASS || 'your_app_password'
    }
});

function buildEmailTemplate(order, stage) {
    const itemRows = order.items.map(i => `
        <tr>
            <td style="padding:10px 16px;border-bottom:1px solid #fee2e2;color:#1f2937;font-size:14px;">${i.name}</td>
            <td style="padding:10px 16px;border-bottom:1px solid #fee2e2;color:#1f2937;font-size:14px;text-align:center;">×${i.qty}</td>
            <td style="padding:10px 16px;border-bottom:1px solid #fee2e2;color:#DC2626;font-weight:700;font-size:14px;text-align:right;">₹${i.price * i.qty}</td>
        </tr>`).join('');

    const stages = {
        Confirmed: {
            emoji: '✅', label: 'Order Confirmed!',
            subtext: 'Your order has been accepted and is being prepared.',
            bodyMsg: 'Show your <strong>Token Number</strong> at the counter. Please arrive within <strong>15 minutes</strong>.',
            subject: `✅ Order Confirmed – ${order.orderId} | SmartBite`
        },
        Ready: {
            emoji: '🔔', label: 'Your Food is Ready!',
            subtext: 'Your order is ready for pickup at the canteen counter.',
            bodyMsg: 'Please come to the <strong>canteen counter now</strong> and show your Token Number to collect your order.',
            subject: `🔔 Food Ready for Pickup – ${order.orderId} | SmartBite`
        },
        Completed: {
            emoji: '🎉', label: 'Order Completed!',
            subtext: 'Your order has been successfully picked up. Enjoy your meal!',
            bodyMsg: 'Thank you for ordering from <strong>SmartBite</strong>. We hope you enjoyed your meal. See you again! 😊',
            subject: `🎉 Thank You! Order Completed – ${order.orderId} | SmartBite`
        }
    };

    const s = stages[stage] || stages.Confirmed;

    return {
        subject: s.subject,
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background:#fff5f5;font-family:'Segoe UI',sans-serif;">
          <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(220,38,38,0.10);border:1px solid #fecaca;">
            <div style="background:#DC2626;padding:32px 32px 24px;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:26px;font-weight:900;">SmartBite 🍽️</h1>
              <p style="color:#fecaca;margin:6px 0 0;font-size:13px;">Campus Canteen Pre-Order Portal</p>
            </div>
            <div style="padding:28px 32px 8px;">
              <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin-bottom:20px;">
                <p style="margin:0;font-size:13px;color:#DC2626;font-weight:700;text-transform:uppercase;letter-spacing:1px;">${s.emoji} ${s.label}</p>
                <p style="margin:6px 0 0;font-size:22px;font-weight:900;color:#1f2937;">Hey ${order.student}!</p>
                <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${s.subtext}</p>
              </div>
              <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #fecaca;border-radius:12px;overflow:hidden;margin-bottom:20px;">
                <thead><tr style="background:#fff5f5;">
                  <th style="padding:10px 16px;text-align:left;font-size:11px;color:#DC2626;text-transform:uppercase;letter-spacing:1px;">Item</th>
                  <th style="padding:10px 16px;text-align:center;font-size:11px;color:#DC2626;text-transform:uppercase;letter-spacing:1px;">Qty</th>
                  <th style="padding:10px 16px;text-align:right;font-size:11px;color:#DC2626;text-transform:uppercase;letter-spacing:1px;">Price</th>
                </tr></thead>
                <tbody>${itemRows}</tbody>
                <tfoot><tr style="background:#fff5f5;">
                  <td colspan="2" style="padding:12px 16px;font-weight:700;color:#1f2937;font-size:14px;">Total</td>
                  <td style="padding:12px 16px;font-weight:900;color:#DC2626;font-size:18px;text-align:right;">₹${order.total}</td>
                </tr></tfoot>
              </table>
              <div style="display:flex;gap:12px;margin-bottom:20px;">
                <div style="flex:1;background:#fff5f5;border:1px solid #fecaca;border-radius:12px;padding:14px 16px;">
                  <p style="margin:0;font-size:11px;color:#DC2626;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Order ID</p>
                  <p style="margin:4px 0 0;font-size:16px;font-weight:900;color:#1f2937;">${order.orderId}</p>
                </div>
                <div style="flex:1;background:#fff5f5;border:1px solid #fecaca;border-radius:12px;padding:14px 16px;">
                  <p style="margin:0;font-size:11px;color:#DC2626;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Token</p>
                  <p style="margin:4px 0 0;font-size:22px;font-weight:900;color:#DC2626;letter-spacing:4px;">${order.token}</p>
                </div>
              </div>
              <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin-bottom:28px;">
                <p style="margin:0;font-size:13px;color:#374151;">${s.bodyMsg}</p>
              </div>
            </div>
            <div style="background:#fff5f5;border-top:1px solid #fecaca;padding:16px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">SmartBite Campus Canteen &bull; Do not reply to this email</p>
            </div>
          </div>
        </body></html>`
    };
}

const Student = require('./models/Student');
const Order = require('./models/Order');

const app = express();
const PORT = 3000;
const paymentConfigPath = path.join(__dirname, 'paymentConfig.json');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret'
});

function loadPaymentConfig() {
    try {
        if (!fs.existsSync(paymentConfigPath)) {
            const defaultConfig = {
                upiId: 'yourupi@bank',
                merchantName: 'SmartBite',
                merchantCity: 'Campus',
                note: 'SmartBite canteen order'
            };
            fs.writeFileSync(paymentConfigPath, JSON.stringify(defaultConfig, null, 2));
            return defaultConfig;
        }
        return JSON.parse(fs.readFileSync(paymentConfigPath, 'utf-8'));
    } catch (err) {
        console.error('Failed to load payment config:', err);
        return {
            upiId: 'yourupi@bank',
            merchantName: 'SmartBite',
            merchantCity: 'Campus',
            note: 'SmartBite canteen order'
        };
    }
}

function savePaymentConfig(config) {
    fs.writeFileSync(paymentConfigPath, JSON.stringify(config, null, 2));
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'smartbite_student_secret_key',
    resave: false,
    saveUninitialized: true
}));

// Express static middleware for views and images
app.use(express.static(path.join(__dirname, '../frontend/views')));
app.use('/images', express.static(path.join(__dirname, '../frontend/images')));

// Connect to MongoDB using environment variable with fallback to host.docker.internal for Docker
const mongoURI = process.env.MONGO_URI || 'mongodb://host.docker.internal:27017/canteenDB';

mongoose.connect(mongoURI)
    .then(() => console.log('✅ Connected to MongoDB Successfully!'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));
// ==================== IN-MEMORY MENU DATA (For Out of Stock feature) ====================
let specialItems = [
    { id: 101, name: 'Chef Special Thali', price: 120, category: 'South Indian', rating: 4.9, isVeg: true, image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=500&q=80', badge: '🏆 Chef Pick', inStock: true },
    { id: 102, name: 'Loaded Masala Maggi', price: 45, category: 'Snacks', rating: 4.8, isVeg: true, image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=500&q=80', badge: '🔥 Today Only', inStock: true }
];

let foodItems = [
    { id: 1, name: 'Paneer Cheese Frankie', price: 70, category: 'Snacks', rating: 4.6, isVeg: true, image: './images/frankie.jpg', inStock: true },
    { id: 2, name: 'Masala Dosa', price: 50, category: 'South Indian', rating: 4.7, isVeg: true, image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=500&q=80', inStock: true },
    { id: 3, name: 'Steam Idli Sambhar (4 Pcs)', price: 40, category: 'South Indian', rating: 4.8, isVeg: true, image: './images/idli.jpg', inStock: true },
    { id: 4, name: 'Crispy Medu Vada (4 Pcs)', price: 45, category: 'South Indian', rating: 4.9, isVeg: true, image: './images/meduwada.jpg', inStock: true },
    { id: 5, name: 'Veg Cheese Grill Sandwich', price: 70, category: 'Snacks', rating: 4.6, isVeg: true, image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=500&q=80', inStock: true },
    { id: 6, name: 'Mumbai Vadapav (1 Pcs)', price: 20, category: 'Quick Bites', rating: 4.9, isVeg: true, image: './images/vadapav.jpg', inStock: true },
    { id: 7, name: 'Veg Schezwan Hakka Noodles', price: 80, category: 'Quick Bites', rating: 4.5, isVeg: true, image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=500&q=80', inStock: true },
    { id: 8, name: 'Special Veg Dum Biryani', price: 90, category: 'South Indian', rating: 4.8, isVeg: true, image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=500&q=80', inStock: true },
    { id: 9, name: 'Hot Indori Poha', price: 25, category: 'Snacks', rating: 4.8, isVeg: true, image: './images/poha.jpg', inStock: true },
    { id: 10, name: 'Samosa Pav (1 Pcs)', price: 20, category: 'Quick Bites', rating: 4.7, isVeg: true, image: './images/samosapav.jpg', inStock: true },
    { id: 11, name: 'Cold Coffee with Ice Cream', price: 40, category: 'Beverages', rating: 4.9, isVeg: true, image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=500&q=80', inStock: true },
    { id: 12, name: 'Coca Cola (500ml)', price: 40, category: 'Beverages', rating: 4.8, isVeg: true, image: './images/cocacola.jpg', inStock: true },
    { id: 13, name: 'Sprite (500ml)', price: 40, category: 'Beverages', rating: 4.5, isVeg: true, image: './images/sprite.jpg', inStock: true },
    { id: 14, name: 'Cutting Chai / Coffee', price: 15, category: 'Beverages', rating: 4.6, isVeg: true, image: './images/teaandcoffee.jpg', inStock: true },
    { id: 15, name: 'Crispy Veg Burger', price: 55, category: 'Quick Bites', rating: 4.6, isVeg: true, image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=500&q=80', inStock: true },
    { id: 16, name: 'Cheese Garlic Bread', price: 65, category: 'Snacks', rating: 4.7, isVeg: true, image: './images/cheesegarlicbread.jpg', inStock: true },   
    { id: 17, name: 'Peri Peri French Fries', price: 60, category: 'Quick Bites', rating: 4.8, isVeg: true, image: './images/frenchfries.jpg', inStock: true },
    { id: 18, name: 'Mysore Masala Dosa', price: 65, category: 'South Indian', rating: 4.9, isVeg: true, image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=500&q=80', inStock: true },
    { id: 19, name: 'Oreo Thick Shake', price: 50, category: 'Beverages', rating: 4.9, isVeg: true, image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=500&q=80', inStock: true },
    { id: 20, name: 'Manchurian', price: 25, category: 'Quick Bites', rating: 4.6, isVeg: true, image: './images/manchurian.jpg', inStock: true },
    { id: 21, name: 'Aloo Tikki Chaat', price: 35, category: 'Snacks', rating: 4.7, isVeg: true, image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=500&q=80', inStock: true },
    { id: 22, name: 'Bread Pakora (2 Pcs)', price: 30, category: 'Snacks', rating: 4.5, isVeg: true, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=500&q=80', inStock: true }
];

// ================= CANTEEN STATUS LOGIC =================
let canteenManualOverride = null; // null = auto time, true = force open, false = force close
let canteenReopenMessage = "";

app.get('/api/canteen-status', (req, res) => {
    let isOpen = true;
    if (canteenManualOverride !== null) {
        isOpen = canteenManualOverride;
    } else {
        // Auto check time: Closed after 17:30 (5:30 PM) or before 08:00 AM (IST Timezone)
        const now = new Date();
        const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
        const timeInMins = istTime.getHours() * 60 + istTime.getMinutes();
        if (timeInMins >= 1050 || timeInMins < 480) isOpen = false; 
    }
    res.json({ success: true, isOpen, override: canteenManualOverride, reopenMessage: canteenReopenMessage });
});

app.post('/api/canteen-status', (req, res) => {
    const { state, message } = req.body;
    if (state === 'auto') { canteenManualOverride = null; canteenReopenMessage = ''; }
    else if (state === 'open') { canteenManualOverride = true; canteenReopenMessage = ''; }
    else if (state === 'close') { canteenManualOverride = false; canteenReopenMessage = message || ''; }
    res.json({ success: true });
});

// Fetch full menu
app.get('/api/menu', (req, res) => {
    res.json({ success: true, specialItems, foodItems });
});

// Toggle In-Stock / Out-of-Stock
app.patch('/api/menu/toggle-stock', (req, res) => {
    const { id, type } = req.body;
    let targetArray = type === 'special' ? specialItems : foodItems;
    
    let itemIndex = targetArray.findIndex(i => i.id === id);
    if (itemIndex === -1) return res.status(404).json({ success: false, message: 'Item not found' });

    targetArray[itemIndex].inStock = !targetArray[itemIndex].inStock;
    res.json({ success: true, message: `Status updated for ${targetArray[itemIndex].name}`, item: targetArray[itemIndex] });
});
// ========================================================================================


// --- API ENDPOINTS ---

// Temporary in-memory store for OTPs
const otpStore = {};

// 1. Send OTP to Email
app.post('/api/student/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email required' });

        // Check if student already registered
        const existingStudent = await Student.findOne({ email });
        if (existingStudent) {
            return res.status(400).json({ success: false, message: 'Student Email already registered!' });
        }

        // Generate 6-digit random OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save OTP with 5 mins expiry
        otpStore[email] = { otp, expires: Date.now() + 5 * 60000 };

        const htmlTemplate = `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #fecaca; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #dc2626; padding: 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0;">SmartBite</h1>
                </div>
                <div style="padding: 30px; background-color: #ffffff; color: #333333; text-align: center;">
                    <h2 style="color: #b91c1c;">Your Registration OTP</h2>
                    <p>Use the following 6-digit code to verify your email and complete registration:</p>
                    <div style="font-size: 36px; font-weight: 900; color: #dc2626; letter-spacing: 8px; margin: 25px 0;">${otp}</div>
                    <p style="font-size: 12px; color: #666666;">This OTP is valid for 5 minutes. Do not share it with anyone.</p>
                </div>
            </div>
        `;

        await transporter.sendMail({
            from: `"SmartBite Canteen" <${process.env.MAIL_USER}>`,
            to: email,
            subject: 'SmartBite - Email Verification OTP',
            html: htmlTemplate
        });

        res.json({ success: true, message: 'OTP sent to your email!' });
    } catch (err) {
        console.error('OTP Send Error:', err);
        res.status(500).json({ success: false, message: 'Failed to send OTP.' });
    }
});

// 2. Student Registration (With OTP verification)
app.post('/api/student/register', async (req, res) => {
    try {
        const { name, email, password, otp } = req.body;

        // Verify OTP logic
        const storedData = otpStore[email];
        if (!storedData) return res.status(400).json({ success: false, message: 'Please request an OTP first.' });
        if (Date.now() > storedData.expires) return res.status(400).json({ success: false, message: 'OTP expired. Request a new one.' });
        if (storedData.otp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP entered.' });

        const existingStudent = await Student.findOne({ email });
        if (existingStudent) {
            return res.status(400).json({ success: false, message: 'Student Email already registered!' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newStudent = new Student({ name, email, password: hashedPassword });
        await newStudent.save();

        // Clear OTP after successful registration
        delete otpStore[email];

        res.json({ success: true, message: 'Registration Successful! Please login.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
});

// 3. Student Login
app.post('/api/student/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const student = await Student.findOne({ email });
        if (!student) {
            return res.status(400).json({ success: false, message: 'Invalid Email or Password!' });
        }

        const isMatch = await bcrypt.compare(password, student.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid Email or Password!' });
        }

        req.session.student = { id: student._id, name: student.name, email: student.email };
        res.json({ success: true, message: `Welcome, ${student.name}!`, studentName: student.name });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

// 4. Create a new order (accepts pending payments). If txn id provided, mark Paid; otherwise Pending.
app.post('/api/orders', async (req, res) => {
    try {
        const { student, items, total, pickupSlot, paymentMethod, upiTransactionId } = req.body;
        if (!student || !Array.isArray(items) || items.length === 0 || !total) {
            return res.status(400).json({ success: false, message: 'Invalid order payload.' });
        }

        const paymentStatus = (upiTransactionId && upiTransactionId.trim() !== '') ? 'Paid' : 'Pending';
        
        // Generate token if payment is Paid
        const token = paymentStatus === 'Paid' ? String(Math.floor(100000 + Math.random() * 900000)) : '';

        const newOrder = new Order({
            orderId: 'SB' + Date.now().toString().slice(-5),
            student,
            items,
            total,
            status: 'New',
            paymentStatus,
            upiTransactionId: upiTransactionId || '',
            pickupSlot: pickupSlot || '',
            paymentMethod: paymentMethod || 'UPI',
            token: token
        });

        await newOrder.save();
        res.json({ success: true, message: 'Order placed successfully.', order: newOrder });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error while placing order.' });
    }
});

// 4a. Create Razorpay order
app.post('/api/create-razorpay-order', async (req, res) => {
    try {
        const { amount, orderData } = req.body;
        const amountInPaise = Math.round(Number(amount || orderData?.total || 0) * 100);

        if (!amountInPaise || amountInPaise <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount for Razorpay order.' });
        }

        const rzOrder = await razorpay.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            receipt: `smartbite_${Date.now()}`,
            notes: {
                student: orderData?.student || 'student',
                total: String(orderData?.total || amount || 0)
            }
        });

        res.json({
            success: true,
            keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy',
            order: rzOrder
        });
    } catch (err) {
        console.error('Razorpay order creation error:', err);
        res.status(500).json({ success: false, message: 'Unable to create Razorpay order.' });
    }
});

// 4b. Verify Razorpay signature and create order
app.post('/api/verify-razorpay-payment', async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            orderData
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Missing Razorpay payment verification data.' });
        }

        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'dummy_secret')
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Invalid Razorpay payment signature.' });
        }

        const paymentOrderData = orderData || {};
        const newOrder = new Order({
            orderId: 'SB' + Date.now().toString().slice(-5),
            student: paymentOrderData.student || 'Student',
            items: paymentOrderData.items || [],
            total: Number(paymentOrderData.total || 0),
            status: 'New',
            paymentStatus: 'Paid',
            upiTransactionId: razorpay_payment_id || '',
            pickupSlot: paymentOrderData.pickupSlot || '',
            paymentMethod: 'Razorpay',
            token: String(Math.floor(100000 + Math.random() * 900000))
        });

        await newOrder.save();

        res.json({ success: true, message: 'Payment verified successfully.', order: newOrder });
    } catch (err) {
        console.error('Razorpay verification error:', err);
        res.status(500).json({ success: false, message: 'Unable to verify Razorpay payment.' });
    }
});

// 5. Get all orders for canteen/admin
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error while fetching orders.' });
    }
});

// 5b. Get orders by student name
app.get('/api/orders/student/:name', async (req, res) => {
    try {
        const orders = await Order.find({ student: req.params.name }).sort({ createdAt: -1 });
        res.json({ success: true, orders });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error while fetching student orders.' });
    }
});

// 5a. Get single order by ID
app.get('/api/orders/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
        res.json({ success: true, order });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error while fetching order.' });
    }
});

// 6. Mark payment as verified (canteen staff manual verification)
app.patch('/api/orders/:id/verify-payment', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }
        
        if (order.paymentStatus === 'Paid') {
            return res.status(400).json({ success: false, message: 'Order already paid.' });
        }
        
        order.paymentStatus = 'Paid';
        if (!order.token) {
            order.token = String(Math.floor(100000 + Math.random() * 900000));
        }
        await order.save();
        res.json({ success: true, order });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error while verifying payment.' });
    }
});

// 7. Get current UPI payment info
app.get('/api/payment-info', (req, res) => {
    const config = loadPaymentConfig();
    res.json({ success: true, paymentInfo: config });
});

// 8. Update current UPI payment info
app.post('/api/payment-info', (req, res) => {
    try {
        const { upiId, merchantName, merchantCity, note } = req.body;
        if (!upiId || !merchantName) {
            return res.status(400).json({ success: false, message: 'UPI ID and merchant name are required.' });
        }
        const config = { upiId, merchantName, merchantCity: merchantCity || 'Campus', note: note || 'SmartBite canteen order' };
        savePaymentConfig(config);
        res.json({ success: true, paymentInfo: config });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error while saving payment info.' });
    }
});

// 9. Unified status update + email notify (Admin lifecycle actions)
app.post('/api/orders/update-status-and-notify', async (req, res) => {
    try {
        const { orderId, status } = req.body;
        const allowedStatuses = ['Confirmed', 'Ready', 'Completed'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status.' });
        }

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
        if (order.paymentStatus !== 'Paid') return res.status(400).json({ success: false, message: 'Cannot update status before payment is verified.' });

        order.status = status;
        await order.save();

        const student = await Student.findOne({ name: order.student });
        let emailSent = false;
        if (student && student.email) {
            try {
                const { subject, html } = buildEmailTemplate(order, status);
                await transporter.sendMail({
                    from: `"SmartBite Canteen" <${process.env.MAIL_USER || 'your_gmail@gmail.com'}>`,
                    to: student.email,
                    subject,
                    html
                });
                emailSent = true;
            } catch (mailErr) {
                console.error('Email send failed:', mailErr.message);
            }
        }

        res.json({ success: true, order, emailSent });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error while updating order status.' });
    }
});

// 10. Update order status & AUTOMATICALLY SEND EMAIL
app.patch('/api/orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const allowedStatuses = ['New', 'Confirmed', 'Ready', 'Completed'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status.' });
        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        // Prevent confirming an order until payment is verified
        if (status === 'Confirmed' && order.paymentStatus !== 'Paid') {
            return res.status(400).json({ success: false, message: 'Cannot confirm order before payment is received.' });
        }

        // 1. Update order status in DB
        order.status = status;
        await order.save();

        // 2. FETCH STUDENT EMAIL & SEND EMAIL IN BACKGROUND
        let emailSent = false;
        if (['Confirmed', 'Ready', 'Completed'].includes(status)) {
            // Find student from DB to get their exact email automatically
            const student = await Student.findOne({ name: order.student });
            
            if (student && student.email) {
                try {
                    const { subject, html } = buildEmailTemplate(order, status);
                    await transporter.sendMail({
                        from: `"SmartBite Canteen" <${process.env.MAIL_USER}>`,
                        to: student.email,
                        subject,
                        html
                    });
                    console.log(`✅ Email automatically sent to ${student.email} for status: ${status}`);
                    emailSent = true;
                } catch (mailErr) {
                    console.error('❌ Email sending failed:', mailErr.message);
                }
            } else {
                console.log(`⚠️ Email skipped: No email found in DB for student '${order.student}'`);
            }
        }

        res.json({ success: true, order, emailSent });
    } catch (err) {
        console.error('Status Update Error:', err);
        res.status(500).json({ success: false, message: 'Server error while updating order.' });
    }
});

// 11. Submit Order Rating & Feedback (Naya Feature)
app.post('/api/orders/:id/rate', async (req, res) => {
    try {
        const { rating, feedback } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        
        order.rating = rating;
        order.feedback = feedback || '';
        await order.save();
        
        res.json({ success: true, message: 'Thank you for your feedback!' });
    } catch (err) {
        console.error('Rating Error:', err);
        res.status(500).json({ success: false, message: 'Failed to submit review.' });
    }
});

// 12. Broadcast Promo Email to all students
app.post('/api/admin/broadcast-promo', async (req, res) => {
    try {
        const promos = [
            {
                subject: "We need to talk... 😔",
                heading: "About your lunch plans.",
                body: "You've been eating sad desk lunches again, haven't you? Come to the canteen. We won't judge. We'll just feed you. 🍱"
            },
            {
                subject: "Your stomach called. It's angry. 😤",
                heading: "Don't make your stomach wait.",
                body: "It said you skipped canteen AGAIN. We've been asked to intervene. Today's menu is too good to miss — come before it's gone! 🔥"
            },
            {
                subject: "Productivity hack nobody talks about 🧠",
                heading: "Eat. Focus. Repeat.",
                body: "Studies show that people who eat a proper lunch are 100% less hangry. We made that stat up, but the food is real. Come get some! 😄"
            },
            {
                subject: "This is not a drill 🚨",
                heading: "The canteen is open RIGHT NOW.",
                body: "Hot food. Cold drinks. Zero excuses. Your order is literally one tap away on SmartBite. Don't let your classmates eat it all first! 😤"
            },
            {
                subject: "A love letter 💌",
                heading: "Dear Hungry Student,",
                body: "We think about you every day. We prepare for you. We wait for you. Please come to the canteen. We miss you. Yours truly, SmartBite 🍽️"
            }
        ];

        const promo = promos[Math.floor(Math.random() * promos.length)];
        const students = await Student.find({}, 'email');
        const emails = students.map(s => s.email).filter(Boolean);

        if (emails.length === 0) return res.status(400).json({ success: false, message: 'No registered students found.' });

        await transporter.sendMail({
            from: `"SmartBite Canteen" <${process.env.MAIL_USER}>`,
            to: process.env.MAIL_USER,
            bcc: emails,
            subject: promo.subject,
            html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
            <body style="margin:0;padding:0;background:#faf5ff;font-family:'Segoe UI',sans-serif;">
              <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(139,92,246,0.10);border:1px solid #e9d5ff;">
                <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:32px 32px 24px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:26px;font-weight:900;">SmartBite 🍽️</h1>
                  <p style="color:#e9d5ff;margin:6px 0 0;font-size:13px;">Campus Canteen Pre-Order Portal</p>
                </div>
                <div style="padding:32px;">
                  <h2 style="margin:0 0 12px;font-size:22px;font-weight:900;color:#1f2937;">${promo.heading}</h2>
                  <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.7;">${promo.body}</p>
                  <a href="http://localhost:3000" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-weight:900;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;">Order Now on SmartBite 🚀</a>
                </div>
                <div style="background:#faf5ff;border-top:1px solid #e9d5ff;padding:16px 32px;text-align:center;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;">SmartBite Campus Canteen &bull; Do not reply to this email</p>
                </div>
              </div>
            </body></html>`
        });

        res.json({ success: true, message: `Promo sent to ${emails.length} students!`, subject: promo.subject });
    } catch (err) {
        console.error('Promo broadcast error:', err);
        res.status(500).json({ success: false, message: 'Failed to send promo email.' });
    }
});

// 13. Broadcast Offer Email to all students
app.post('/api/admin/broadcast-offer', async (req, res) => {
    try {
        const students = await Student.find({}, 'email');
        const emails = students.map(s => s.email).filter(Boolean);
        if (emails.length === 0) return res.status(400).json({ success: false, message: 'No registered students found.' });

        await transporter.sendMail({
            from: `"SmartBite Canteen" <${process.env.MAIL_USER}>`,
            to: process.env.MAIL_USER,
            bcc: emails,
            subject: '🎁 FLASH OFFER: Get up to ₹20 OFF!',
            html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
            <body style="margin:0;padding:0;background:#f0fdf4;font-family:'Segoe UI',sans-serif;">
              <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(22,163,74,0.10);border:1px solid #bbf7d0;">
                <div style="background:linear-gradient(135deg,#16a34a,#22c55e);padding:32px 32px 24px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:26px;font-weight:900;">SmartBite 🍽️</h1>
                  <p style="color:#dcfce7;margin:6px 0 0;font-size:13px;">Campus Canteen Pre-Order Portal</p>
                </div>
                <div style="padding:32px;">
                  <div style="background:#f0fdf4;border:2px dashed #86efac;border-radius:16px;padding:20px 24px;text-align:center;margin-bottom:24px;">
                    <p style="margin:0;font-size:13px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:1px;">🎁 Flash Offer — Limited Time!</p>
                    <h2 style="margin:8px 0 0;font-size:32px;font-weight:900;color:#15803d;">Get up to ₹20 OFF!</h2>
                  </div>
                  <p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.7;">Hungry? We've got a surprise for you! Order anything above <strong>₹149</strong> on SmartBite and click the <strong>'Apply Lucky Offer'</strong> button at checkout to get a random discount between <strong>₹10 and ₹20</strong>. Hurry, grab your meal now! 🚀</p>
                  <div style="text-align:center;">
                    <a href="http://localhost:3000" style="display:inline-block;background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff;font-weight:900;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;">Grab the Offer Now 🎉</a>
                  </div>
                </div>
                <div style="background:#f0fdf4;border-top:1px solid #bbf7d0;padding:16px 32px;text-align:center;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;">SmartBite Campus Canteen &bull; Do not reply to this email</p>
                </div>
              </div>
            </body></html>`
        });

        res.json({ success: true, message: `Offer blast sent to ${emails.length} students!` });
    } catch (err) {
        console.error('Offer broadcast error:', err);
        res.status(500).json({ success: false, message: 'Failed to send offer email.' });
    }
});

// Main Route (Serve views/index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/views', 'index.html'));
});

// Start Express Server
app.listen(PORT, () => {
    console.log(`🚀 SmartBite active at: http://localhost:${PORT}`);
}); 