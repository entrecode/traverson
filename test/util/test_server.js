'use strict';

/*
 * Starts a http server for testing purposes.
 */
var http = require('http')
var log = require('minilog')('test_server');
var url = require('url')

/* jshint -W074 */
function TraversonTestServer() {

  var server
  var port
  var bindAddress

  this.start = function() {
    createServer()
    printWelcomeMessage()
  }

  this.stop = function() {
    server.close(function() {
      log.info('Traverson test server stopped')
    })
  }

  function createServer() {
    function onRequest(request, response) {
      serve(request, response)
    }
    port = 2808
    bindAddress = '127.0.0.1'
    server = http.createServer(onRequest)
    server.listen(port, bindAddress)
  }

  function printWelcomeMessage(startTime) {
    log.info('Traverson test server started')
    log.info('Listening on port: ' + port)
    log.info('Bind address: ' +  bindAddress)
  }

  function serve(request, response) {
    log.debug('serving request: ')
    log.debug(request.method + ' ' + request.url)
    log.debug('headers: ')
    log.debug(request.headers)
    var accept = request.headers.accept
    if (!accept || accept.indexOf('application/json') === 0) {
      return serverJson(request, response)
    } else if (accept && accept.indexOf('application/hal+json') === 0) {
      return serverHalJson(request, response)
    } else {
      return serve406(request, response)
    }
  }

  function serverJson(request, response) {
    var path = url.parse(request.url).path
    switch (request.method) {
    case 'GET':
      return handleJsonGet(request, response, path)
    case 'POST':
      return handleJsonPost(request, response, path)
    case 'PUT':
      return handleJsonPut(request, response, path)
    case 'PATCH':
      return handleJsonPatch(request, response, path)
    case 'DELETE':
      return handleJsonDelete(request, response, path)
    default:
      return serve501(request, response, request.method)
    }
  }

  function handleJsonGet(request, response, path) {
    var host = request.headers.host
    var baseUrl = 'http://' + host
    switch (path) {
    case '/':
      return serveRoot(request, response, baseUrl)
    case '/first':
      return serveFirst(request, response)
    case '/second':
      return serveSecond(request, response, baseUrl)
    case '/second/document':
      return serveSecondDoc(request, response)
    case '/third':
      return serveThird(request, response)
    case '/junk':
      return serveJunk(request, response)
    }

    if (path.indexOf('/fixed/') >= 0) {
      return serveForUriTemplate(request, response, path)
    } else {
      return serve404(request, response)
    }
  }

  function handleJsonPost(request, response, path) {
    readBody(request, function(err, body) {
      switch (path) {
      case '/postings':
        return servePostings(request, response, body)
      default:
        return serve404(request, response)
      }
    })
  }

  function handleJsonPut(request, response, path) {
    readBody(request, function(err, body) {
      switch (path) {
      case '/puttings/42':
        return servePuttings(request, response, body)
      default:
        return serve404(request, response)
      }
    })
  }

  function handleJsonPatch(request, response, path) {
    readBody(request, function(err, body) {
      switch (path) {
      case '/patch/me':
        return servePatchMe(request, response, body)
      default:
        return serve404(request, response)
      }
    })
  }

  function handleJsonDelete(request, response, path) {
    switch (path) {
    case '/delete/me':
      return serveDeleteMe(request, response)
    default:
      return serve404(request, response)
    }
  }

  function readBody(request, callback) {

    var bodyChunks = []

    request.on('data', function(chunk) {
      bodyChunks.push(chunk)
    })

    request.on('end', function() {
      callback(null, bodyChunks.join())
    })
  }

  function serveRoot(request, response, baseUrl) {
    response.writeHead(200)
    var content = {
      'first': baseUrl + '/first',
      'second': baseUrl + '/second',
      'jsonpath': {
        'nested': { 'key': baseUrl + '/third' }
      },
      'uri_template': baseUrl + '/{param}/fixed{/id}',
      'post_link': baseUrl + '/postings',
      'put_link': baseUrl + '/puttings/42',
      'patch_link': baseUrl + '/patch/me',
      'delete_link': baseUrl + '/delete/me',
      'blind_alley': baseUrl + '/does/not/exist',
      'garbage': baseUrl + '/junk'
    }
    endResponse(content, request, response)
  }

  function serveFirst(request, response) {
    response.writeHead(200)
    endResponse({'first': 'document'}, request, response)
  }
  function serveSecond(request, response, baseUrl) {
    response.writeHead(200)
    endResponse({ 'doc': baseUrl + '/second/document' }, request, response)
  }

  function serveSecondDoc(request, response) {
    response.writeHead(200)
    endResponse({ 'second': 'document' }, request, response)
  }

  function serveThird(request, response) {
    response.writeHead(200)
    endResponse({ 'third': 'document' }, request, response)
  }

  function servePostings(request, response, body) {
    var parsedBody = JSON.parse(body)
    response.writeHead(201)
    endResponse({ 'document': 'created', 'received': parsedBody }, request,
        response)
  }

  function servePuttings(request, response, body) {
    var parsedBody = JSON.parse(body)
    response.writeHead(200)
    endResponse({ 'document': 'updated', 'received': parsedBody }, request,
        response)
  }

  function servePatchMe(request, response, body) {
    var parsedBody = JSON.parse(body)
    response.writeHead(200)
    endResponse({ 'document': 'patched', 'received': parsedBody }, request,
        response)
  }

  function serveDeleteMe(request, response) {
    response.writeHead(204)
    endResponse({}, request, response)
  }

  function serveForUriTemplate(request, response, path) {
    var tokens = path.split('/')
    response.writeHead(200)
    endResponse({ 'some': 'document', 'param': tokens[1], 'id': tokens[3] },
        request, response)
  }

  function serveJunk(request, response) {
    // server syntacically incorrect JSON
    response.writeHead(200)
    response.write('{ this will :: not parse')
    endResponse(null, request, response)
  }

  function serverHalJson(request, response) {
    var path = url.parse(request.url).path
    switch (request.method) {
    case 'GET':
      return handleHalJsonGet(request, response, path)
    default:
      return serve501(request, response, request.method)
    }
  }

  function handleHalJsonGet(request, response, path) {
    var host = request.headers.host
    var baseUrl = 'http://' + host
    switch (path) {
    case '/':
      return serveRootHal(request, response, baseUrl)
    case '/first':
      return serveFirstHal(request, response)
    case '/second':
      return serveSecondHal(request, response, baseUrl)
    default:
      return serve404(request, response)
    }
  }

  function serveRootHal(request, response, baseUrl) {
    response.writeHead(200)
    var content = {
      '_links': {
        'self': { 'href': '/' },
        'first': { 'href': '/first' }
      },
      'data': 'much'
    }
    endResponse(content, request, response)
  }

  function serveFirstHal(request, response) {
    response.writeHead(200)
    endResponse({
      '_links': {
        'self': { 'href': '/first' },
        'second': { 'href': '/second' }
      },
      '_embedded': {
        'contained_resource': {
          '_links' : {
            'self': { 'href': '/first/contained' },
            'embedded_link_to_second': { 'href': '/second' }
          },
          'things': 'a lot of'
        }
      },
      'first': 'document'
    }, request, response)
  }

  function serveSecondHal(request, response, baseUrl) {
    response.writeHead(200)
    endResponse({
      '_embedded': {
        'inside_second': { 'more': 'data' }
      },
      'second': 'document'
    }, request, response)
  }

  function serve404(request, response) {
    response.writeHead(404)
    endResponse({'message': 'document not found'}, request, response)
  }

  function serve406(request, response) {
    response.writeHead(406)
    endResponse({'message': 'can not serve media type ' +
        request.headers.accept}, request, response)
  }

  function serve501(request, response, verb) {
    response.writeHead(501)
    endResponse({'message': 'http method verb ' + verb + ' not supported'},
        request, response)
  }

  function endResponse(content, request, response) {
    if (content) {
      content.requestHeaders = request.headers
      response.write(JSON.stringify(content))
    }
    response.end()
  }
}

/* jshint +W074 */

module.exports = TraversonTestServer
