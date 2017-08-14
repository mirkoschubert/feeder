'use strict';

const Promise = require('promise'),
      request = require('request'),
      cheerio = require('cheerio');

var tagsupport = {
  meta: ['description', 'keywords', 'date', 'last_modified', 'robots', 'charset'], // name:content
  opengraph: ['og:title', 'og:description','og:type', 'og:image', 'og:url' ], // property:content
  article: ['article:author', 'article:publisher', 'article:section', 'article:tag', 'article:published', 'article:modified'] // property:content
}

function translateTags(metatags) {
  var rs = [];

  for (var i = 0; i < metatags.length; i++) {
    if (tagsupport.meta.indexOf(metatags[i]) != -1) {
      rs.push('meta[name="' + metatags[i] + '"]');
    }
    if (tagsupport.opengraph.indexOf(metatags[i]) != -1) {
      rs.push('meta[property="' + metatags[i] + '"]');
    }
    if (tagsupport.article.indexOf(metatags[i]) != -1) {
      rs.push('meta[property="' + metatags[i] + '"]');
    }
  }
  return rs;
}


function getMetas(url, metatags) {
  return new Promise(function(resolve, reject) {

    var metas = [];
    var rs = {};

    request(url, function(err, res, body) {
      if (err) {
        return reject(err);
      } else if (res.statusCode !== 200) {
        err = new Error('Bad Status Code: ', res.statusCode);
        err.res = res;
        return reject(err);
      }
      var $ = cheerio.load(body);
      metas = translateTags(metatags);
      for (var i = 0; i < metas.length; i++) {
        rs[metatags[i]] = $(metas[i]).attr('content');
      }
      resolve(rs);
    });
  });
}

module.exports = getMetas;
