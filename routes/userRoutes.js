const express = require('express')
const router = express.Router()
const {authenticateUser, authorizePermissions} = require('../middleware/authentication')

const {
  getAllUsers,
  getSingleUser,
  deleteUser,
  updateUser,
  uploadUserAvatar,
  manageFavorite,
  getUserRate,
  setBookmark,
  getBookmark
} = require('../controllers/userController')

router.route('/getall').get(getAllUsers)
router.route('/uploadavatar').post(authenticateUser, uploadUserAvatar)
router.route('/bookmark').post(authenticateUser, setBookmark).get(authenticateUser, getBookmark)
router.route('/favorites/:bookId').post(authenticateUser, manageFavorite)

router.route('/rate/:bookId').get(authenticateUser, getUserRate)

router.route('/:id').get(getSingleUser).patch(authenticateUser, updateUser).delete(authenticateUser, deleteUser)

module.exports = router