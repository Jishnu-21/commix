const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const moment = require('moment');


const getDashboardData = async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const orders = await Order.find();
    const orderCount = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);

    console.log('User Count:', userCount);
    console.log('Order Count:', orderCount);
    console.log('Total Revenue:', totalRevenue);

    // Generate sample sales data (replace this with actual data from your database)
    const generateSalesData = (days) => {
      return Array.from({ length: days }, (_, i) => ({
        date: new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: Math.floor(Math.random() * 10000)
      }));
    };

    const salesData = {
      daily: generateSalesData(30),
      weekly: generateSalesData(12).map(item => ({
        ...item,
        date: `Week ${item.date.split('-')[1]}`
      })),
      monthly: generateSalesData(12).map(item => ({
        ...item,
        date: item.date.split('-')[1]
      }))
    };

    // Fetch top 3 products
    const topProducts = await Order.aggregate([
      { $unwind: "$items" },
      { $group: {
          _id: "$items.product_id",
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 3 },
      { $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" },
      { $project: {
          name: "$productDetails.name",
          totalQuantity: 1,
          totalRevenue: 1,
          image_url: { $arrayElemAt: ["$productDetails.image_urls", 0] } // Get the first image URL
        }
      }
    ]);

    console.log('Dashboard Data:', {
      userCount,
      orderCount,
      totalRevenue,
      salesData,
      topProducts
    });

    res.status(200).json({
      success: true,
      data: {
        userCount,
        orderCount,
        totalRevenue,
        salesData,
        topProducts
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ success: false, message: 'Error fetching dashboard data', error: error.message });
  }
};

const getAllUsersForAdmin = async (req, res) => {
  try {
    const users = await User.find().select('-password'); // Exclude password from the response
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error('Error fetching all users for admin:', error);
    res.status(500).json({ success: false, message: 'Error fetching all users for admin', error: error.message });
  }
};

const getUserDetailsById = async (req, res) => {
  try {
    const { id } = req.params; // Get the user ID from the request parameters
    const user = await User.findById(id).select('-password'); // Exclude password from the response

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
const blockUser = async (req, res) => {
    try {
      const { id } = req.params;
      let { isBlocked } = req.body;
  
      // If isBlocked is not provided, toggle the current status
      if (typeof isBlocked !== 'boolean') {
        const user = await User.findById(id);
        if (!user) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }
        isBlocked = !user.isBlocked;
      }
  
      const user = await User.findByIdAndUpdate(
        id,
        { isBlocked },
        { new: true, runValidators: true }
      ).select('-password');
  
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
  
      const action = isBlocked ? 'blocked' : 'unblocked';
      res.status(200).json({ 
        success: true, 
        message: `User successfully ${action}`,
        user 
      });
    } catch (error) {
      console.error('Error blocking/unblocking user:', error);
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  };


const getSalesData = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to last 30 days if no date range is provided
    const start = startDate ? new Date(startDate) : moment().subtract(30, 'days').toDate();
    const end = endDate ? new Date(endDate) : new Date();

    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end },
      order_status: 'Completed' // Only consider completed orders
    });

    // Initialize data structures
    const dailySales = {};
    const weeklySales = {};
    const monthlySales = {};

    // Process orders
    orders.forEach(order => {
      const date = moment(order.createdAt);
      const day = date.format('YYYY-MM-DD');
      const week = date.format('YYYY-[W]WW');
      const month = date.format('YYYY-MM');

      // Daily sales
      dailySales[day] = (dailySales[day] || 0) + order.total_amount;

      // Weekly sales
      weeklySales[week] = (weeklySales[week] || 0) + order.total_amount;

      // Monthly sales
      monthlySales[month] = (monthlySales[month] || 0) + order.total_amount;
    });

    // Convert to arrays and sort
    const dailyData = Object.entries(dailySales).map(([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date));
    const weeklyData = Object.entries(weeklySales).map(([week, amount]) => ({ week, amount })).sort((a, b) => a.week.localeCompare(b.week));
    const monthlyData = Object.entries(monthlySales).map(([month, amount]) => ({ month, amount })).sort((a, b) => a.month.localeCompare(b.month));

    // Calculate totals
    const totalSales = orders.reduce((sum, order) => sum + order.total_amount, 0);
    const orderCount = orders.length;

    res.json({
      success: true,
      data: {
        daily: dailyData,
        weekly: weeklyData,
        monthly: monthlyData,
        totalSales,
        orderCount,
        dateRange: { start, end }
      }
    });

  } catch (error) {
    console.error('Error fetching sales data:', error);
    res.status(500).json({ success: false, message: 'Error fetching sales data', error: error.message });
  }
};


module.exports = {
  getAllUsersForAdmin,
  getUserDetailsById,
  blockUser, // Add this new function to the exports
  getDashboardData,
  getSalesData
};
