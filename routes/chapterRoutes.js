const express = require('express')
const router = express.Router()
const {authenticateUser, authorizePermissions} = require('../middleware/authentication')

const {
  // getChapters,
  getSingleChapter,
  getSingleChapterBySlug,
  createChapter,
  updateChapter,
  deleteChapter
} = require('../controllers/chapterController')

// router.route('/getall').get(authenticateUser, getChapters)
router.route('/create').post(authenticateUser, createChapter)
router.route('/getbyslug/:slug').get(getSingleChapterBySlug)
router.route('/:id').get(authenticateUser, getSingleChapter).patch(authenticateUser, updateChapter).delete(authenticateUser, deleteChapter)

module.exports = router