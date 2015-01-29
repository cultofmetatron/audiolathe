var path = require('path');
var express = require('express');

var app = express();

app.set('view engine', 'jade');
app.set('views', [path.join(__dirname, '..', '..', 'views')]);


app.use('/web', express.static(path.join(__dirname, '..', 'web')))
app.use('/styles', express.static(path.join(__dirname, '..', 'styles')));

app.get('/', function(req, res, next) {
  res.render('app', {});
});

module.exports = app;

var port = process.env.PORT || 3000;
console.log('now listening on ', port)
app.listen(port);






