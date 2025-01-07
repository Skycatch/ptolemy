'use strict';

const BaseAdapter = require('./base');

const Errors = require('../errors');
const UnknownCRSError = Errors.UnknownCRSError;
const UnknownCRSFormatError = Errors.UnknownCRSFormatError;
const InvalidResponseError = Errors.InvalidResponseError;

class MapTilerAdapter extends BaseAdapter {

  constructor(config, logger) {
    super(config, logger);
  }

  static getBaseUrl(epsgCode) {
    return `https://api.maptiler.com/coordinates/search/code:${epsgCode}.json?exports=true&key=${process.env.MAPTILER_API_KEY}`
  }

  get(crs, format) {
    format = format.toLowerCase();
    crs = crs.toString().toLowerCase();

    if (!this.isValidCRS(crs)) {
      return Promise.reject(new UnknownCRSError(crs));
    }

    if (!this.isValidCRSFormat(format)) {
      return Promise.reject(new UnknownCRSFormatError(format));
    }

    return Promise.all([
      this._getName(crs),
      this._getProjection(crs, format)
    ])
      .then((res) => {
        const obj = {};

        obj.source = 'maptiler';
        obj.crs = crs;
        obj.name = res[0];
        obj[format] = res[1].trim();

        return obj;
      });
  }

  _getEPSGCode(crs) {
    return crs.toString().toLowerCase().replace('epsg:', '');
  }

  _getName(crs) {
    const code = this._getEPSGCode(crs);
    const url = MapTilerAdapter.getBaseUrl(code);
    const options = { timeout: 4000 };

    return this.makeRequest('GET', url, null, options)
      .then((body) => {
        const { results, total } = body;
        if (total === 0) {

          throw new InvalidResponseError(404, body, {
            url: url,
            adapter: 'maptiler',
            method: 'GET'
          })
        }
        const { name } = results[0];

        if (!name) {
          throw new Error('Cannot extract name from CRS definition');
        }

        return name;
      });
  }

  _getProjection(crs, format) {
    const code = this._getEPSGCode(crs);
    const url = MapTilerAdapter.getBaseUrl(code);
    const options = { timeout: 4000 };

    return this.makeRequest('GET', url, null, options)
      .then((body) => {
        const { results } = body;
        return results[0].exports[format]
      });
  }
}

module.exports = MapTilerAdapter;
