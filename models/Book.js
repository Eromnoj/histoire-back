const mongoose = require('mongoose')
const slugify = require('slugify')
const { uid } = require('uid')

const BookSchema = mongoose.Schema({
  userId: {
    type: mongoose.Types.ObjectId,
    required:true
  },
  title: {
    type:String,
    required:[true, 'Veuillez fournir un titre'],
  },
  slug : {
    type: String, 
    unique: true
  },
  description: {
    type:String,
    required:[true, 'Veuillez remplir le résumé']
  },
  category:{
    type: String,
    required:[true, 'Choisissez une catégorie'],
    enum: ['novel','short_story','poetry']
  },
  tags:{
    type: []
  },
  coverPath:{
    type:String,
    default:'/uploads/bookcover.jpg'
  },
  isPublished: {
    type:Boolean,
    default: false
  }

},{timestamps: true})


BookSchema.pre('save', async function () {

    let slug = slugify(this.title,{
      lower:true
    })
    slug += '-'+uid(6)
    this.slug = slug
  
  })


module.exports = mongoose.model('Book', BookSchema)