const { handle } = require('../lib/server.js');
module.exports = (req, res) => handle(req, res, '/api/geo');
