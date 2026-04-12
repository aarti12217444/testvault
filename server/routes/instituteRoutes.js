const express = require('express');
const router = express.Router();
const { createInstitute, getInstitutes, getInstituteById } = require('../controllers/instituteController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/', protect, authorizeRoles('superadmin'), createInstitute);
router.get('/', protect, authorizeRoles('superadmin'), getInstitutes);
router.get('/:id', protect, getInstituteById);

module.exports = router;