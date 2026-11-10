const { handle } = require('../server.js');
module.exports = (req, res) => handle(req, res, '/api/geo');
