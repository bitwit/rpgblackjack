
###
 * GET home page.
###

exports.index = (req, res) ->
  res.render 'index', { title: 'RPG Blackjack' }

exports.template = (req, res) ->
  res.render "ng-view-#{req.params.template}"

