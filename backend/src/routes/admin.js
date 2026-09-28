const express = require('express');
const { auth } = require('../middlewares/auth');

const router = express.Router();

router.get('/me', auth, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      role: req.user.role,
      type: req.user.type,
    },
  });
});

module.exports = router;
