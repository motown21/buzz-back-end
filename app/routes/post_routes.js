const express = require('express')

const passport = require('passport')

const Post = require('../models/post')
const customErrors = require('../../lib/custom_errors')

const handle404 = customErrors.handle404

const requireOwnership = customErrors.requireOwnership
const removeBlanks = require('../../lib/remove_blank_fields')

const requireToken = passport.authenticate('bearer', { session: false })
const router = express.Router()

// INDEX
// GET /posts
router.get('/posts', requireToken, (req, res, next) => {
  Post.find({ owner: req.user.id })
    .then(posts => {
      return posts.map(post => post.toObject())
    })
    .then(posts => res.status(200).json({ posts: posts }))
    .catch(next)
})

// SHOW
// GET /posts/5a7db6c74d55bc51bdf39793
router.get('/posts/:id', requireToken, (req, res, next) => {
  Post.findOne({ id: req.params._id, owner: req.user._id })
    .then(handle404)
    .then(post => res.status(200).json({ post: post.toObject() }))
    .catch(next)
})

// CREATE
// POST /posts
router.post('/posts', requireToken, (req, res, next) => {
  req.body.post.owner = req.user.id

  Post.create(req.body.post)

    .then(post => {
      res.status(201).json({ post: post.toObject() })
    })

    .catch(next)
})

// UPDATE
// PATCH /posts/5a7db6c74d55bc51bdf39793
router.patch('/posts/:id', requireToken, removeBlanks, (req, res, next) => {
  delete req.body.post.owner

  Post.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, req.body.post)
    .then(handle404)
    .then(post => {
      requireOwnership(req, post)
      return post.updateOne(req.body.post)
    })

    .then(() => res.sendStatus(204))

    .catch(next)
})

// DESTROY
// DELETE /posts/5a7db6c74d55bc51bdf39793
router.delete('/posts/:id', requireToken, (req, res, next) => {
  Post.findOneAndDelete({ id: req.params.id, owner: req.user._id })
    .then(handle404)
    .then(post => {
      requireOwnership(req, post)

      post.deleteOne()
    })

    .then(() => res.sendStatus(204))

    .catch(next)
})

module.exports = router
