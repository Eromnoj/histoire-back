const { StatusCodes } = require('http-status-codes')
const { isValidObjectId } = require('mongoose')
const CustomError = require('../errors')
const Book = require('../models/Book')
const Chapter = require('../models/Chapter')
const { checkPermissions } = require('../utils')
const { parse } = require('node-html-parser')

// const getChapters = async (req,res) => {
//   res.send('Get Chapter')
// }

const getSingleChapter = async (req, res) => {
  const {id} = req.params

  const chapter = await Chapter.findOne({_id: id})

  if(!chapter) {
    throw new CustomError.NotFoundError(`Ce chapitre n'existe pas`)
  }
  res.status(StatusCodes.OK).json({chapter})
}

const getSingleChapterBySlug = async (req, res) => {
  const {slug} = req.params
  const chapter = await Chapter.aggregate([
    {$match: {slug: slug}},
    {$project: {title: 1, content:1, chapterOrder:1, isPublished:1}}
  ])

  if(!chapter || !chapter[0].isPublished) {
    throw new CustomError.NotFoundError(`Ce chapitre n'existe pas`)
  }

  const chapToSend = chapter[0]
  res.status(StatusCodes.OK).json({chapter: chapToSend})
}

const createChapter = async (req, res) => {
  const { bookId, title, content, chapterOrder } = req.body
  const { userId } = req.user

  if (isValidObjectId(bookId)) {
    const book = await Book.findOne({ _id: bookId })
    if (!book) {
      throw new CustomError.NotFoundError(`Ce livre n'existe pas, impossible d'y ajouter des chapitres`)
    }

    if (String(book.userId) !== userId) {
      throw new CustomError.UnauthorizedError(`Vous n'êtes pas l'auteur de ce livre, vous ne pouvez pas y ajouter de chapitres`)
    }
  } else {
    throw new CustomError.NotFoundError(`Ce livre n'existe pas, impossible d'y ajouter des chapitres`)
  }
  const chapter = await Chapter.create({ bookId, title, content, chapterOrder, userId })

  res.status(StatusCodes.CREATED).json({ msg: 'Nouveau chapitre créé', chapter })
}

const updateChapter = async (req, res) => {
  const { togglePublish, title, content, chapterOrder } = req.body
  const { id } = req.params
  const chapter = await Chapter.findOne({ _id: id })
  if(!chapter){
    throw new CustomError.NotFoundError(`Ce chapitre n'existe pas`)
  }

  checkPermissions(req.user, chapter.userId)

  if(togglePublish) chapter.isPublished = !chapter.isPublished
  if(title) chapter.title = title
  if(content) chapter.content = content.replace(/&lt;/g, '<')
  if(chapterOrder) chapter.chapterOrder = Number(chapterOrder)

  chapter.update()
  chapter.save()
  res.status(StatusCodes.OK).json({ msg: 'Chapitre modifié', chapter })
}

const deleteChapter = async (req, res) => {
  const {id} = req.params
  
  const chapter = await Chapter.findOne({_id: id})
  if(!chapter){
    throw new CustomError.NotFoundError(`Ce livre n'existe pas`)
  }

  checkPermissions(req.user, chapter.userId)

  const chapterToDel = await Chapter.deleteOne({_id: id})

  res.status(StatusCodes.OK).json({msg:'Le livre a été supprimé',chapter: chapterToDel})
}

module.exports = {
  // getChapters,
  getSingleChapter,
  getSingleChapterBySlug,
  createChapter,
  updateChapter,
  deleteChapter
}