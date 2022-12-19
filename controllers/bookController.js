const Book = require('../models/Book')
const Rating = require('../models/Rating')
const Chapter = require('../models/Chapter')

const { StatusCodes } = require('http-status-codes')
const CustomError = require('../errors')
const { checkPermissions, deleteFiles } = require('../utils')
const path = require('path')
const User = require('../models/User')
const { isValidObjectId, default: mongoose } = require('mongoose')


const getAllBooks = async (req, res) => {
  const { userId, tags, category, search, sorted, page } = req.query
  const limit = 6
  const skip = limit * (Number(page) - 1)
  let user
  let pipeline = []
  let matchObj = {}

  if (tags) matchObj.tags = { $in: tags.split(',') }
  if (category) matchObj.category = { $in: category.split(',') }
  if (search) matchObj.$text = { $search: search }


  let favorites = []
  if (userId && isValidObjectId(userId)) {
    user = await User.findOne({ _id: userId })
    if (user) {
      favorites = user.favorites
      pipeline.push({ $addFields: { favorite: { $in: [{ $toString: '$_id' }, favorites] } } })
    } else {
      throw new CustomError.NotFoundError(`Aucun livre ne correspond à vos filtres...`)
    }
  } else {
    pipeline.push({ $addFields: { favorite: false } })
  }

  pipeline.push({ $match: matchObj },{$match : {isPublished: true}})

  pipeline.push({
    $lookup: {
      from: 'users',
      let: { 'userId': '$userId' },
      pipeline: [
        { $match: { $expr: { $eq: ['$_id', '$$userId'] } } },
        { $project: { username: 1, description: 1 } }
      ],
      as: 'author',
    }
  })

  pipeline.push({
    $lookup: {
      from: 'ratings',
      let: { 'bookId': '$_id' },
      pipeline: [
        { $group: { _id: '$bookId', avg: { $avg: '$rate' } } },
        { $match: { $expr: { $eq: ['$_id', '$$bookId'] } } },
        { $project: { avg: 1, _id: 0 } },
      ],
      as: 'avgRate'
    }
  },
    { $set: { avgRate: { $sum: '$avgRate.avg' } } },
  )

  if (sorted === 'popularity') pipeline.push({ $sort: { avgRate: -1 } })
  if (sorted === 'favorite') pipeline.push({ $sort: { favorite: -1 } })

  pipeline.push({ $skip: skip })
  pipeline.push({ $limit: limit })
  const books = await Book.aggregate(pipeline)

  const total = await Book.count()

  if (books.length <= 0) {
    throw new CustomError.NotFoundError(`Aucun livre ne correspond à vos filtres...`)
  }
  res.status(StatusCodes.OK).json({ limit, total, books })
}


const getMyBooks = async (req, res) => {
  const { userId } = req.user
  const userToBjcId = mongoose.Types.ObjectId(userId)

  const books = await Book.aggregate([
    { $match: { userId: userToBjcId  } },
    {
      $lookup: {
        from: 'chapters',
        let: { 'bookId': '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$bookId', '$$bookId'] } } },
          { $group: { _id: 'groupTotal', total: { $count: {} } } },
          { $project: { total: 1, _id: 0 } }
        ],
        as: 'chaptersTotal'
      }
    },
    { $set: { chaptersTotal: { $sum: '$chaptersTotal.total' } } },
    {
      $lookup: {
        from: 'chapters',
        let: { 'bookId': '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$bookId', '$$bookId'] } } },
          { $match: { isPublished: true } },
          { $group: { _id: 'grouppub', total: { $count: {} } } },
          { $project: { total: 1, _id: 0 } }
        ],
        as: 'chaptersPublished'
      }
    },
    { $set: { chaptersPublished: { $sum: '$chaptersPublished.total' } } },
    {$project: {title: 1, chaptersPublished: 1, chaptersTotal: 1, category:1, isPublished: 1}},
    {$sort: {isPublished: -1}}
  ])

  if(books.length <= 0){
    throw new CustomError.NotFoundError(`Vous n'avez aucun livres`)
  }
  res.status(StatusCodes.OK).json({books})


}



const getSingleBook = async (req, res) => {
  const { id } = req.params

  const book = await Book.aggregate([
    { $match: { _id: mongoose.Types.ObjectId(id) } },
    {
      $lookup: {
        from: 'users',
        let: { 'userId': '$userId' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$userId'] } } },
          { $project: { username: 1, description: 1, imgPath: 1 } }
        ],
        as: 'author',
      }
    },
    {
      $lookup: {
        from: 'chapters',
        let: { 'bookId': '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$bookId', '$$bookId'] } } },
          { $project: { title: 1, chapterOrder: 1, isPublished: 1} }
        ],
        as: 'chapters'
      }
    }
  ])

  if (book.length <= 0) {
    throw new CustomError.NotFoundError(`Ce livre a été supprimé ou n'a jamais existé`)
  }

  res.status(StatusCodes.OK).json({ book: book[0] })

}

const getSingleBookBySlug = async (req, res) => {
  const { slug } = req.params
  const { userId } = req.query
  let user
  let pipeline = []

  console.log(userId);

  let favorites = []
  if (userId && isValidObjectId(userId)) {
    user = await User.findOne({ _id: userId })
    if (user) {
      favorites = user.favorites
      pipeline.push({ $addFields: { favorite: { $in: [{ $toString: '$_id' }, favorites] } } })
    } else {
      throw new CustomError.NotFoundError(`Il n'y a aucun livres...`)
    }
  } else {
    pipeline.push({ $addFields: { favorite: false } })
  }

  pipeline.push({ $match: { slug: slug, isPublished: true } })
  pipeline.push({
    $lookup: {
      from: 'users',
      let: { 'userId': '$userId' },
      pipeline: [
        { $match: { $expr: { $eq: ['$_id', '$$userId'] } } },
        { $project: { username: 1, description: 1, imgPath: 1 } }
      ],
      as: 'author',
    }
  })

  pipeline.push({
    $lookup: {
      from: 'ratings',
      let: { 'bookId': '$_id' },
      pipeline: [
        { $group: { _id: '$bookId', avg: { $avg: '$rate' } } },
        { $match: { $expr: { $eq: ['$_id', '$$bookId'] } } },
        { $project: { avg: 1, _id: 0 } },
      ],
      as: 'avgRate'
    }
  },
    { $set: { avgRate: { $sum: '$avgRate.avg' } } }
  )
  pipeline.push({
    $lookup: {
      from: 'chapters',
      let: { 'bookId': '$_id' },
      pipeline: [
        { $match: { $expr: { $eq: ['$bookId', '$$bookId'] } } },
        { $match: { isPublished: true } },
        { $project: { title: 1, content: 1, chapterOrder: 1, isPublished: 1, slug: 1 } }
      ],
      as: 'chapters'
    }
  })

  const book = await Book.aggregate(pipeline)


  if (book.length <= 0) {
    throw new CustomError.NotFoundError(`Ce livre a été supprimé ou n'a jamais existé`)
  }

  res.status(StatusCodes.OK).json({ book: book[0] })

}

const createBook = async (req, res) => {
  const { userId } = req.user
  if (!userId) {
    throw new CustomError.UnauthenticatedError('Vous devez être authentifié pour effectuer cette action')
  }

  const book = await Book.create({ ...req.body, userId })

  res.status(StatusCodes.CREATED).json({ msg: 'Le livre a été créé, commencez à écrire vos chapitres', book })

}

const uploadBookCover = async (req, res) => {
  if (!req.files) {
    throw new CustomError.BadRequestError('Rien a uploader')
  }

  const bookCover = req.files.image
  const id = req.body.bookId

  if (!bookCover.mimetype.startsWith('image')) {
    throw new CustomError.BadRequestError('Veuillez choisir une image')
  }


  const maxSize = 1024 * 1024

  if (!bookCover.size > maxSize) {
    throw new CustomError.BadRequestError('Choisissez une image inférieur à 1mb')
  }

  const extension = bookCover.mimetype.split('/')[1]
  const filename = id + '-' + bookCover.md5 + '-bookcover.' + extension

  const imgPathDel = path.join(__dirname, `../public/uploads/`)

  deleteFiles(imgPathDel, id.toString())


  const imagePath = path.join(__dirname, '../public/uploads/' + `${filename}`)

  await bookCover.mv(imagePath)

  let book = await Book.findOne({ _id: id })

  book.coverPath = `/uploads/${filename}`

  book = await book.save()

  res.status(StatusCodes.OK).json({ image: `/uploads/${filename}` })

}

const updateBook = async (req, res) => {
  const { id } = req.params
  const { title, description, category, tags, togglePublished } = req.body

  const book = await Book.findOne({ _id: id })
  if (!book) {
    throw new CustomError.NotFoundError(`Ce livre a été supprimé ou n'a jamais existé`)
  }

  if (togglePublished) book.isPublished = !book.isPublished
  if (title) book.title = title
  if (description) book.description = description
  if (category) book.category = category
  if (tags) book.tags = tags

  await book.save()

  res.status(StatusCodes.OK).json({ msg: 'Le livre a été modifié' })
}

const deleteBook = async (req, res) => {
  const { id } = req.params

  const book = await Book.findOne({ _id: id })
  if (!book) {
    throw new CustomError.NotFoundError(`Ce livre n'existe pas`)
  }

  checkPermissions(req.user, book.userId)

  const bookToDel = await Book.deleteOne({ _id: id })

  const chapterToDel = await Chapter.deleteMany({bookId: id})

  const imgPath = path.join(__dirname, `../public/uploads/`)

  deleteFiles(imgPath, id)

  res.status(StatusCodes.OK).json({ msg: 'Le livre a été supprimé', book: bookToDel })

}

const rateBook = async (req, res) => {
  const { userId } = req.user
  const { bookId, rate } = req.body

  const rating = await Rating.findOne({ bookId, userId })

  if (!rating) {
    await Rating.create({ userId, bookId, rate: Number(rate) })
  } else {
    rating.rate = Number(rate)
    rating.save()
  }

  res.status(StatusCodes.OK).json({ msg: `Merci pour votre soutien` })
}

module.exports = {
  getAllBooks,
  getSingleBook,
  getMyBooks,
  createBook,
  uploadBookCover,
  updateBook,
  deleteBook,
  getSingleBookBySlug,
  rateBook
}