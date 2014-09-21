//var React = require('react')
//


//console.log('fuuu')
//var React = require('react');

/** @jsx React.DOM */ /*
React.renderComponent(
  React.DOM.h1(null, 'Hello, world! I am God'),
  document.getElementById('example')
);

*/

var Engine = require('famous/core/Engine');
var Surface = require('famous/core/Surface');

var mainContext = Engine.createContext();

var firstSurface = new Surface({
  content: 'hello world',
  size: [200, 400],
  properties: {
    color: 'blue',
    textAlign: 'center',
    backgroundColor: '#FA5C4F'
  }
});

firstSurface.setContent('<h1>HELLO WORLD, I am thine god on earth</h1>');

mainContext.add(firstSurface);

