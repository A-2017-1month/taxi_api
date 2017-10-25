var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', (req, res, next) => {
  res.render('index', { title: 'Express' });
});
router.get('/teapot/', (req, res, next) => {
  res.json(req.query);
});
router.get('/teapot/:id', (req, res, next) => {
  res.json([req.query, req.params]);
});
module.exports = router;
