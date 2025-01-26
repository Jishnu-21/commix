const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const puppeteer = require('puppeteer');

// Get all users for admin
const getAllUsersForAdmin = async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: 'admin' } }).select('-password');
        res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error('Error in getAllUsersForAdmin:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching users',
            error: error.message 
        });
    }
};

// Get all orders for admin
const getAllOrdersForAdmin = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('user', 'first_name last_name email')
            .populate('items.product_id', 'title image price sku')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            orders
        });
    } catch (error) {
        console.error('Error in getAllOrdersForAdmin:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching orders',
            error: error.message
        });
    }
};

// Get specific order details for admin
const getOrderDetailsForAdmin = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'first_name last_name email')
            .populate('items.product_id', 'title image price sku')
            .lean();

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Calculate totals
        if (order.items) {
            order.items = order.items.map(item => ({
                ...item,
                total: (item.quantity * item.price) || 0
            }));
        }

        res.json({
            success: true,
            order
        });
    } catch (error) {
        console.error('Error in getOrderDetailsForAdmin:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching order details',
            error: error.message
        });
    }
};

// Update order status
const updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const orderId = req.params.id;

        if (!['pending', 'processing', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order status'
            });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        order.order_status = status;
        await order.save();

        res.json({
            success: true,
            message: 'Order status updated successfully',
            order
        });
    } catch (error) {
        console.error('Error in updateOrderStatus:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating order status',
            error: error.message
        });
    }
};

// Get user details by ID
const getUserDetailsById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }
        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Error in getUserDetailsById:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching user details',
            error: error.message 
        });
    }
};

// Block/unblock user
const blockUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.isBlocked = !user.isBlocked;
        await user.save();

        res.json({
            success: true,
            message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`,
            user
        });
    } catch (error) {
        console.error('Error in blockUser:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user status',
            error: error.message
        });
    }
};

// Get dashboard data
const getDashboardData = async (req, res) => {
    try {
        // Get total users count (excluding admins)
        const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });

        // Get orders statistics
        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({ order_status: 'pending' });
        const completedOrders = await Order.countDocuments({ order_status: 'completed' });

        // Get total revenue (from completed orders)
        const revenueData = await Order.aggregate([
            { $match: { order_status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$total_amount' } } }
        ]);
        const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

        // Get recent orders
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('user', 'first_name last_name email');

        res.json({
            success: true,
            data: {
                totalUsers,
                totalOrders,
                pendingOrders,
                completedOrders,
                totalRevenue,
                recentOrders
            }
        });
    } catch (error) {
        console.error('Error in getDashboardData:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard data',
            error: error.message
        });
    }
};

// Get sales data
const getSalesData = async (req, res) => {
    try {
        const { period = 'weekly' } = req.query;
        let dateFilter = {};
        const now = new Date();

        switch (period) {
            case 'daily':
                dateFilter = {
                    createdAt: {
                        $gte: new Date(now.setHours(0, 0, 0, 0)),
                        $lt: new Date(now.setHours(23, 59, 59, 999))
                    }
                };
                break;
            case 'weekly':
                const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
                dateFilter = {
                    createdAt: {
                        $gte: new Date(startOfWeek.setHours(0, 0, 0, 0)),
                        $lt: new Date(now.setDate(startOfWeek.getDate() + 7))
                    }
                };
                break;
            case 'monthly':
                dateFilter = {
                    createdAt: {
                        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
                        $lt: new Date(now.getFullYear(), now.getMonth() + 1, 0)
                    }
                };
                break;
            default:
                dateFilter = {};
        }

        const salesData = await Order.aggregate([
            { $match: { ...dateFilter, order_status: 'completed' } },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$createdAt'
                        }
                    },
                    totalSales: { $sum: '$total_amount' },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: salesData
        });
    } catch (error) {
        console.error('Error in getSalesData:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching sales data',
            error: error.message
        });
    }
};

// Get all products for admin
const getAllProductsForAdmin = async (req, res) => {
    try {
        const products = await Product.find();
        res.json({
            success: true,
            products
        });
    } catch (error) {
        console.error('Error in getAllProductsForAdmin:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching products',
            error: error.message
        });
    }
};

// Download order invoice
const downloadOrderInvoice = async (req, res) => {
    let browser = null;
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'first_name last_name email')
            .populate('items.product_id');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Helper function to format currency
        const formatCurrency = (amount) => {
            return (amount || 0).toFixed(2);
        };

        // Helper function to get safe string value
        const safeStr = (value) => value || '';

        // Generate invoice HTML
        const invoiceHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Invoice #${order._id}</title>
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                        margin: 0;
                        padding: 40px;
                        font-size: 14px;
                        line-height: 1.4;
                    }
                    .invoice-header {
                        text-align: center;
                        margin-bottom: 40px;
                        padding-bottom: 20px;
                        border-bottom: 2px solid #eee;
                    }
                    .invoice-header h1 {
                        color: #333;
                        margin: 0 0 10px;
                    }
                    .invoice-details, .customer-details {
                        margin-bottom: 30px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 30px 0;
                    }
                    th {
                        background: #f8f9fa;
                        padding: 12px;
                        text-align: left;
                        font-weight: 600;
                        color: #333;
                        border-bottom: 2px solid #ddd;
                    }
                    td {
                        padding: 12px;
                        text-align: left;
                        border-bottom: 1px solid #eee;
                    }
                    .total {
                        font-weight: bold;
                        text-align: right;
                        background: #f8f9fa;
                    }
                    .amount {
                        font-family: monospace;
                    }
                    .status {
                        display: inline-block;
                        padding: 6px 12px;
                        border-radius: 4px;
                        background: #e9ecef;
                        font-size: 12px;
                    }
                </style>
            </head>
            <body>
                <div class="invoice-header">
                    <h1>Invoice</h1>
                    <p>Order #${order._id}</p>
                    <p>Date: ${new Date(order.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}</p>
                </div>
                
                <div class="customer-details">
                    <h3>Customer Details</h3>
                    ${order.user ? `
                        <p><strong>Name:</strong> ${safeStr(order.user.first_name)} ${safeStr(order.user.last_name)}</p>
                        <p><strong>Email:</strong> ${safeStr(order.user.email)}</p>
                    ` : `
                        <p><strong>Name:</strong> ${safeStr(order.guest_info?.firstName)} ${safeStr(order.guest_info?.lastName)} (Guest)</p>
                        <p><strong>Email:</strong> ${safeStr(order.guest_info?.email)}</p>
                    `}
                    ${order.shipping_address ? `
                        <p><strong>Shipping Address:</strong><br>
                            ${safeStr(order.shipping_address.street)}<br>
                            ${safeStr(order.shipping_address.city)}, ${safeStr(order.shipping_address.state)}<br>
                            ${safeStr(order.shipping_address.country)} - ${safeStr(order.shipping_address.pincode)}
                        </p>
                    ` : ''}
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => {
                            const price = item.price || 0;
                            const quantity = item.quantity || 0;
                            return `
                                <tr>
                                    <td>${safeStr(item.product_id?.title)}</td>
                                    <td>${quantity}</td>
                                    <td class="amount">₹${formatCurrency(price)}</td>
                                    <td class="amount">₹${formatCurrency(quantity * price)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3" class="total">Subtotal:</td>
                            <td class="amount">₹${formatCurrency(order.subtotal)}</td>
                        </tr>
                        <tr>
                            <td colspan="3" class="total">Shipping:</td>
                            <td class="amount">₹${formatCurrency(order.shipping_fee)}</td>
                        </tr>
                        <tr>
                            <td colspan="3" class="total">Tax:</td>
                            <td class="amount">₹${formatCurrency(order.tax)}</td>
                        </tr>
                        <tr>
                            <td colspan="3" class="total">Total:</td>
                            <td class="amount">₹${formatCurrency(order.total_amount)}</td>
                        </tr>
                    </tfoot>
                </table>
                
                <div class="invoice-footer">
                    <p><strong>Payment Status:</strong> <span class="status">${safeStr(order.payment_status)}</span></p>
                    <p><strong>Order Status:</strong> <span class="status">${safeStr(order.order_status)}</span></p>
                </div>
            </body>
            </html>
        `;

        // Launch browser with specific settings
        browser = await puppeteer.launch({
            headless: 'new',  // Use new headless mode
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        
        // Set viewport for consistent rendering
        await page.setViewport({
            width: 1200,
            height: 1600,
            deviceScaleFactor: 1
        });

        // Wait for network idle to ensure all content is loaded
        await page.setContent(invoiceHtml, {
            waitUntil: ['domcontentloaded', 'networkidle0']
        });

        // Generate PDF with specific settings
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '30px',
                right: '30px',
                bottom: '30px',
                left: '30px'
            },
            preferCSSPageSize: true,
            displayHeaderFooter: false
        });

        // Close browser
        if (browser) {
            await browser.close();
            browser = null;
        }

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', pdf.length);
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${order._id}.pdf"`);
        
        // Send PDF
        res.send(pdf);

    } catch (error) {
        console.error('Error generating invoice:', error);
        
        // Always close browser in case of error
        if (browser) {
            await browser.close();
        }

        res.status(500).json({
            success: false,
            message: 'Error generating invoice',
            error: error.message
        });
    }
};

module.exports = {
    getAllUsersForAdmin,
    getUserDetailsById,
    blockUser,
    getDashboardData,
    getAllProductsForAdmin,
    getAllOrdersForAdmin,
    getOrderDetailsForAdmin,
    updateOrderStatus,
    downloadOrderInvoice,
    getSalesData
};