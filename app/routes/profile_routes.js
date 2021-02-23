const express = require('express')

const passport = require('passport')

// pull in Mongoose model for profiles
const Profile = require('../models/profile')

const customErrors = require('../../lib/custom_errors')

const handle404 = customErrors.handle404

const requireOwnership = customErrors.requireOwnership

const removeBlanks = require('../../lib/remove_blank_fields')

const requireToken = passport.authenticate('bearer', { session: false })

const router = express.Router()

// INDEX
// GET /
router.get('/profiles', requireToken, (req, res, next) => {
  console.log('owner is', req.user._id)
  Profile.find({ owner: req.user._id })
    .then(profiles => {
      // `profiles` will be an array of Mongoose documents
      // we want to convert each one to a POJO, so we use `.map` to
      // apply `.toObject` to each one
      return profiles.map(profile => profile.toObject())
    })
    // respond with status 200 and JSON of the profiles
    .then(profiles => res.status(200).json({ profiles: profiles }))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// // INDEX
// // GET /
// router.get('/profiles/user', requireToken, (req, res, next) => {
//   console.log('owner is', req.user._id)
//   Profile.find({ owner: req.user._id })
//     .then(profiles => {
//       // `profiles` will be an array of Mongoose documents
//       // we want to convert each one to a POJO, so we use `.map` to
//       // apply `.toObject` to each one
//       return profiles.map(profile => profile.toObject())
//     })
//     // respond with status 200 and JSON of the profiles
//     .then(profile => res.status(200).json({ profile: profile }))
//     // if an error occurs, pass it to the handler
//     .catch(next)
// })

// SHOW
// GET /profiles/5a7db6c74d55bc51bdf39793
router.get('/profiles/:id', requireToken, (req, res, next) => {
  // req.params.id will be set based on the `:id` in the route
  console.log('owner is', req.user._id)
  console.log('id is', req.params._id)

  Profile.findOne({ id: req.params._id, owner: req.user._id })
    .then(handle404)
    // if `findById` is succesful, respond with 200 and "profile" JSON
    .then(profile => res.status(200).json({ profile: profile.toObject() }))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// CREATE
// POST /profiles
router.post('/profiles', requireToken, (req, res, next) => {
  // set owner of new profile to be current user
  req.body.profile.owner = req.user.id

  Profile.create(req.body.profile)
    // respond to succesful `create` with status 201 and JSON of new "profile"
    .then(profile => {
      res.status(201).json({ profile: profile.toObject() })
    })
    // if an error occurs, pass it off to our error handler
    // the error handler needs the error message and the `res` object so that it
    // can send an error message back to the client
    .catch(next)
})

// UPDATE
// PATCH /profiles/5a7db6c74d55bc51bdf39793
router.patch('/profiles/:id', requireToken, removeBlanks, (req, res, next) => {
  // if the client attempts to change the `owner` property by including a new
  // owner, prevent that by deleting that key/value pair
  delete req.body.profile.owner

  Profile.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, req.body.profile)
    .then(handle404)
    .then(profile => {
      // pass the `req` object and the Mongoose record to `requireOwnership`
      // it will throw an error if the current user isn't the owner
      requireOwnership(req, profile)

      // pass the result of Mongoose's `.update` to the next `.then`
      return profile.updateOne(req.body.profile)
    })
    // if that succeeded, return 204 and no JSON
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// DESTROY
// DELETE /profiles/5a7db6c74d55bc51bdf39793
router.delete('/profiles/:id', requireToken, (req, res, next) => {
  Profile.findOneAndDelete({ id: req.params.id, owner: req.user._id })
    .then(handle404)
    .then(profile => {
      // throw an error if current user doesn't own `profile`
      requireOwnership(req, profile)
      // delete the profile ONLY IF the above didn't throw
      profile.deleteOne()
    })
    // send back 204 and no content if the deletion succeeded
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

module.exports = router
