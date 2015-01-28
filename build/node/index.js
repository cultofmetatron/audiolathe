"use strict";
var path = require('path');
var express = require('express');
var app = express();
app.set('view engine', 'jade');
app.set('views', [path.join(__dirname, '..', '..', 'views')]);
app.use('/web', express.static(path.join(__dirname, '..', 'web')));
app.get('/', function(req, res, next) {
  res.render('app', {});
});
module.exports = app;
app.listen(3000);
//# sourceURL=node/index.js
//# sourceMappingURL=../node/index.js.map