const User = require('../models/User')

const { StatusCodes } = require('http-status-codes')
const CustomError = require('../errors')
const {createTokenUser, attachCookiesToResponse, checkPermissions, deleteFiles } = require('../utils')

const path = require('path')

const { default: mongoose } = require('mongoose')
const Rating = require('../models/Rating')


const getAllUsers = async(req,res) => {
 let pipeline = []
 pipeline.push({$project: {'username': 1, 'email':1, 'role':1}})
 
  const users = await User.aggregate(pipeline)

  res.status(StatusCodes.OK).json({users})
}

const getSingleUser = async(req,res) => {
  const {id} = req.params

  const user = await User.aggregate([
    {$match: {_id: mongoose.Types.ObjectId(id)}},
    {$lookup: {
      from : 'books',
      let : {'id' : '$_id', 'favorites' :'$favorites'},
      pipeline: [
        {$match: {$expr: {$eq: ['$userId', '$$id']}}},
        {$match : {isPublished: true}},
        {$addFields: {favorite: {$in: [{$toString: '$_id'}, '$$favorites']}}},
        {$lookup : {
          from: 'ratings',
          let: {'bookId': '$_id'},
          pipeline: [
            {$group: { _id:'$bookId',avg: {$avg : '$rate'}}},
            {$match: {$expr: {$eq : ['$_id', '$$bookId']}}},
            {$project: {avg: 1, _id:0}},
          ],
          as: 'avgRate'
        }},
        {$set: {avgRate : '$avgRate.avg'}},
        {$project: {category:1, coverPath: 1, favorite: 1, title: 1, avgRate: 1, slug: 1}},
      ],
      as: 'books',
    }},
    {$project: {books : 1, description: 1, email: 1, imgPath: 1, username: 1, facebook:1, twitter:1}}
  ])
  console.log(user);
  if(user.length <= 0){
    throw new CustomError.NotFoundError(`Pas d'utilisateur avec cet identifiant`)
  }
  res.status(StatusCodes.OK).json({user : user[0]})
}


const updateUser = async (req, res) => {
  const {username, email, twitter, facebook, description, newPassword, password} = req.body
  const id = req.user.userId
  
  if(!password){
    throw new CustomError.UnauthorizedError('Veuillez entrer votre mot de passe pour valider les modifications')
  }
  const user = await User.findOne({_id: id})
  
  const isPasswordCorrect = await user.comparePassword(password)
  
  if (!isPasswordCorrect) {
    throw new CustomError.UnauthenticatedError('Le mot de passe est invalide')
  }

  if(email) user.email = email
  if(username) user.username = username
  if(twitter) user.twitter = twitter
  if(facebook) user.facebook = facebook
  if(description) user.description = description
  if(newPassword) user.password = newPassword
  await user.save()

  const tokenUser = createTokenUser(user)
  attachCookiesToResponse({ user: tokenUser, res })
  
  res.status(StatusCodes.OK).json({msg: 'Modifications enregistrés'})
}

const deleteUser = async(req,res) => {
  const {id} = req.params

   checkPermissions(req.user, id)
  

  let user = await User.findOne({_id: id})
    console.log(user);
  if(!user){
    throw new CustomError.BadRequestError('Aucun utilisateur avec cet identifiant')
  }

  await user.remove()
  const imgPath = path.join(__dirname,`../public/uploads/`)

  deleteFiles(imgPath,id)

  res.status(StatusCodes.OK).json({msg: `Utilisateur supprimé : ${id}`})
}


const uploadUserAvatar = async(req,res) => {

  if(!req.files){
    throw new CustomError.BadRequestError('Rien a uploader')
  }

  const userAvatar = req.files.image
  const id = req.user.userId
  console.log(userAvatar)
  if(!userAvatar.mimetype.startsWith('image')){
    throw new CustomError.BadRequestError('Veuillez choisir une image')
  }

  
  const maxSize = 1024*1024
  
  if(!userAvatar.size > maxSize){ 
    throw new CustomError.BadRequestError('Choisissez une image inférieur à 1mb')
  }
  
  const extension = userAvatar.mimetype.split('/')[1]
  const filename = id + '-'+ userAvatar.md5 +'-avatar.' + extension

  const imgPathDel = path.join(__dirname,`../public/uploads/`)

  console.log(id)
  deleteFiles(imgPathDel,id.toString())
  

  const imagePath = path.join(__dirname,'../public/uploads/' + `${filename}`)
  console.log(imagePath);
  await userAvatar.mv(imagePath)

  let user = await User.findOne({_id:id})

  user.imgPath = `/uploads/${filename}`

  user = await user.save()

  res.status(StatusCodes.OK).json({image:`/uploads/${filename}`})
}


const manageFavorite = async (req,res) => {
  const { bookId } = req.params
  const {userId} = req.user
  const user = await User.findOne({_id: userId})
  console.log(user.favorites);
  let msg

  if(!user){
    throw new CustomError.NotFoundError(`L'utilisateur n'existe pas ou n'est pas connecté`)
  }
  if(user.favorites.includes(bookId)){
    const newFavorites = user.favorites.filter(favorite => favorite !== bookId)
    user.favorites = newFavorites
    msg = 'Supprimé des favoris'
  }else{
    const newFavorites = user.favorites
    newFavorites.push(bookId)
    user.favorites= newFavorites
    msg= 'Ajouté aux favoris'
  }

  await user.save()

  res.status(StatusCodes.OK).json({msg})
}

const getUserRate = async (req, res) =>{
  const {userId} = req.user
  const {bookId} = req.params
  console.log(userId, bookId);
  const rate = await Rating.findOne({userId, bookId})
  console.log(rate);
  if(!rate){
    throw new CustomError.NotFoundError('pas encore de note donnée pour ce livre')
  }

  res.status(StatusCodes.OK).json({rate : rate.rate})
}

const setBookmark = async (req, res) => {
  const {userId} = req.user
  const {chapterId} = req.body

  const user = await User.findOne({_id: userId})
  if(!user){
    throw new CustomError.CustomAPIError(`Vous devez être authentifié pour marquer votre progression`)
  }

  const exisitingBm = user.bookmarks
  const newBookmarkArray = exisitingBm.filter(bookmark => bookmark.chapterId !== chapterId)
  newBookmarkArray.push(req.body)

  user.bookmarks = newBookmarkArray
  user.save()

  res.status(StatusCodes.CREATED).json({msg:'Marque-page enregistré', user})
}

const getBookmark = async (req,res) => {
  const {userId} = req.user
  const {chapterId} = req.query

  const user = await User.findOne({_id: userId})
  if(!user){
    throw new CustomError.UnauthenticatedError(`Vous devez être authentifié pour retrouver votre progression`)
  }

  const exisitingBm = user.bookmarks
  const bookmark = exisitingBm.filter(bookmark => bookmark.chapterId === chapterId)

  console.log(bookmark);
  if(bookmark.length <= 0){
    return
    // throw new CustomError.NotFoundError(`Pas de marque-page enregistré pour ce chapitre`)
  }
  
  res.status(StatusCodes.OK).json({bookmark : bookmark[0]})

}

module.exports = {
  getAllUsers,
  getSingleUser,
  deleteUser,
  updateUser,
  uploadUserAvatar,
  manageFavorite,
  getUserRate, 
  setBookmark,
  getBookmark
}