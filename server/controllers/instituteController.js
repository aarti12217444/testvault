const Institute = require('../models/Institute');
const User = require('../models/User');

// SuperAdmin - Create Institute
const createInstitute = async (req, res) => {
  try {
    const { name, type, email, phone, address } = req.body;
    const institute = await Institute.create({ name, type, email, phone, address });

    // Create institute admin user
    const adminUser = await User.create({
      name: `${name} Admin`,
      email,
      password: 'Admin@123', // default password
      role: 'institute',
      instituteId: institute._id
    });

    institute.adminId = adminUser._id;
    await institute.save();

    res.status(201).json({ institute, adminUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all institutes (superadmin)
const getInstitutes = async (req, res) => {
  try {
    const institutes = await Institute.find().populate('adminId', 'name email');
    res.json(institutes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get single institute
const getInstituteById = async (req, res) => {
  try {
    const institute = await Institute.findById(req.params.id);
    if (!institute) return res.status(404).json({ message: 'Institute not found' });
    res.json(institute);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createInstitute, getInstitutes, getInstituteById };