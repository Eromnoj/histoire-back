const express = require('express')
const router = express.Router()
const {authenticateUser, authorizePermissions} = require('../middleware/authentication')

const {
  getAllBooks,
  getSingleBook,
  getMyBooks,
  createBook,
  uploadBookCover,
  updateBook,
  deleteBook,
  getSingleBookBySlug,
  rateBook
} = require('../controllers/bookController')


router.route('/getall').get(getAllBooks)
router.route('/uploadcover').post(authenticateUser, uploadBookCover)
router.route('/createbook').post(authenticateUser, createBook)
router.route('/byslug/:slug').get(getSingleBookBySlug)
router.route('/ratebook').post(authenticateUser, rateBook)
router.route('/getmybooks').get(authenticateUser, getMyBooks)
router.route('/:id').get(authenticateUser,getSingleBook).patch(authenticateUser, updateBook).delete(authenticateUser, deleteBook)

module.exports = router