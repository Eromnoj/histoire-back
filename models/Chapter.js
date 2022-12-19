const mongoose = require('mongoose')
const slugify = require('slugify')
const { uid } = require('uid')

const ChapterSchema = mongoose.Schema({
  bookId : {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  userId : {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  title : {
    type: String,
    required: [true, 'Veuillez fournir un titre'],
    maxlength : [150, 'Veuillez respecter la limite de 150 caratères pour le titre']
  },
  slug : {
    type: String, 
    unique: true
  },
  chapterOrder : {
    type: Number,
    required: [true, 'Veuillez fournir un numéro de chapitre']
  },
  content : {
    type: String,
    required: [true, 'Vous devez fournir un contenu'],
  },
  isPublished : {
    type: Boolean,
    default: false
  }
},{timestamps: true})


ChapterSchema.pre('save', async function () {
    let slug = slugify(this.title,{
      lower:true
    })
    slug += '-'+uid(6)
    this.slug = slug
  })


module.exports = mongoose.model('Chapter', ChapterSchema)