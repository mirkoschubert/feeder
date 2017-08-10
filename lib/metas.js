const util = require('util'),
      request = require('request'),
      cheerio = require('cheerio'),
      events = require('events');

var Metas = function(options) {
  this.url = options.url;
  this.data = '';
  this.meta = {};
};

Metas.prototype = new events.EventEmitter();

Metas.prototype.getMetaDescription = function (url) {

  var self = this;
  var req = request({
    url: url,
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml'
    }
  });

  req.on('error', function(err) {
    console.error(err.message);
  });

  req.on('data', function(chunk) {
    self.data += chunk.toString('utf8');
  });

  req.on('end', function(err) {
    var $ = cheerio.load(self.data);
    var description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content');
    try {
      self.emit('found', description);
    } catch(err) {
      self.emit('error', err);
    }
  });
}

Metas.prototype.getMeta = function () {

  var req = request({
    url: this.url,
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36',
      'accept': 'text/html,application/xhtml+xml'
    }
  });
  var self = this;

  req.on('error', function(err) {
    console.log(err);
  });

  req.on('data', function(chunk) {
    self.data += chunk.toString('utf8');
  });

  req.on('end', function(err) {
    var $ = cheerio.load(self.data);
    var meta = {};

    $('meta').each(function(i, e) {
      var key = e.attribs.name || e.attribs.property;
      var value = e.attribs.content || e.attribs.value;
      if (key && value) {
        meta[key] = value;
      }
    });
    try {
      self.emit('loaded', meta);
    } catch(e) {
      self.emit('error', e);
    }
  });
}

module.exports = Metas;
