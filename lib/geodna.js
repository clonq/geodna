// ---------------------------------------------------
// geodna.js - (C) KD 2012
// ---------------------------------------------------
// Converts between lat/lon and a "geodna" code,
// which is a single string representing a point
// on the earth's surface.   The string is basically
// an approximation to the lat/lon coordinate,
// and the longer the string, the more accurate it
// will be.   In general, coordinates that are
// close together will share a string prefix,
// making these codes very useful for providing
// very fast proximity searching using only
// text-based approaches (eg. SQL's "LIKE" operator)
// ---------------------------------------------------
// http://www.geodna.org
// ---------------------------------------------------

var VERSION = "0.4";
var RADIUS_OF_EARTH = 6378100;
var ALPHABET = [ "g", "a", "t", "c", ];
var DECODE_MAP = {
    g: 0,
    a: 1,
    t: 2,
    c: 3,
};

module.exports = {

  /**
  * Encodes a lat/lng point.
  *
  * @param {String} latitude  
  * @param {String} longitude  
  * @param {Object} options  
  * @return {String}
  * @api public
  */
  encode: encode,

  /**
  * Decodes a geodna encoded point into its lat/lng.
  *
  * @param {String} geodna  
  * @param {Object} options  
  * @return {Array} [lat, lng]
  * @api public
  */
  decode: decode,

  /**
  * Locates the min/max lat/lngs around the geodna
  *
  * @param {String} geodna  
  * @return {Array} [[lat, lng], [lat, lng]]
  * @api public
  */
  boundingBox: boundingBox,

  /**
  * Simple vector math
  *
  * @param {String} geodna  
  * @param {Number} dy  
  * @param {Number} dx  
  * @return {Array} [lat, lng]
  * @api public
  */
  addVector: addVector,

  /**
  * Calculates the distance between two geodna
  *
  * @param {String} geodna1  
  * @param {String} geodna2 
  * @return {Number} 
  * @api public
  */
  distanceInKm: distanceInKm,

  /**
  * Calculates the geodna of a point calculated from a given geodna, a bearing and a distance
  *
  * @param {String} geodna
  * @param {Number} bearing 
  * @param {Number} distance 
  * @param {Oject} options 
  * @return {String} 
  * @api public
  */
  pointFromPointBearingAndDistance: pointFromPointBearingAndDistance,

  /**
  * Returns the neighbours of a given geodna
  *
  * @param {String} geodna
  * @return {Aray} 
  * @api public
  */
  neighbours: neighbours,

  /**
  * Returns the neighbours within radius
  * This is experimental!!
  * Totally unoptimised - use at your peril!
  *
  * @param {String} geodna
  * @param {Number} radius
  * @param {Object} options
  * @return {Aray} 
  * @api public
  */
  neighboursWithinRadius: neighboursWithinRadius,

  /**
  * This takes an array of GeoDNA codes and reduces it to its
  * minimal set of codes covering the same area.
  * Needs a more optimal impl.
  *
  * @param {Array} geodna codes
  * @return {Aray} 
  * @api public
  */
  reduce: reduce

}

function encode ( latitude, longitude, options ) {
  latitude = Number(latitude);
  longitude = Number(longitude)
  options   = options || {};
  var precision = options['precision'] || 22;

  var geodna = '';
  var loni = [];
  var lati = [];

  if ( options['radians'] ) {
      latitude  = _rad2deg( latitude );
      longitude = _rad2deg( longitude );
  }

  var bits = normalise( latitude, longitude );
  latitude = bits[0];
  longitude = bits[1];

  if ( longitude < 0 ) {
      geodna = geodna + 'w';
      loni = [ -180.0, 0.0 ];
  } else {
      geodna = geodna + 'e';
      loni = [ 0.0, 180.0 ];
  }

  lati = [ -90.0, 90.0 ];

  while ( geodna.length < precision ) {
      var ch = 0;

      var mid = ( loni[0] + loni[1] ) / 2.0;
      if ( longitude > mid ) {
          ch = ch | 2;
          loni = [ mid, loni[1] ];
      } else {
          loni = [ loni[0], mid ];
      }

      mid = ( lati[0] + lati[1] ) / 2.0;
      if ( latitude > mid ) {
          ch = ch | 1;
          lati = [ mid, lati[1] ];
      } else {
          lati = [ lati[0], mid ];
      }

      geodna = geodna + ALPHABET[ch];
  }
  return geodna;
}

function decode ( geodna, options ) {
    options = options || {};

    var bits = boundingBox( geodna );
    var lati = bits[0];
    var loni = bits[1];

    var lat = ( lati[0] + lati[1] ) / 2.0;
    var lon = ( loni[0] + loni[1] ) / 2.0;

    if ( options['radians'] ) {
        return [ _deg2rad( lat ), _deg2rad( lon ) ];
    }
    return [ lat, lon ];
}

function boundingBox ( geodna ) {
    var chars = geodna.split(new RegExp(''));

    var loni;
    var lati = [ -90.0, 90.0 ];

    var first = chars[0];

    if ( first == 'w' ) {
        loni = [ -180.0, 0.0 ];
    } else if ( first == 'e' ) {
        loni = [ 0.0, 180.0 ];
    }

    for ( var i = 1; i < chars.length; i++ ) {
        var c  = chars[i];
        var cd = DECODE_MAP[c];
        if ( cd & 2 ) {
            loni = [ ( loni[0] + loni[1] ) / 2.0, loni[1] ];
        } else {
            loni = [ loni[0],  ( loni[0] + loni[1] ) / 2.0 ];
        }
        if ( cd & 1 ) {
            lati = [ ( lati[0] + lati[1] ) / 2.0, lati[1] ];
        } else {
            lati = [ lati[0],  ( lati[0] + lati[1] ) / 2.0 ];
        }
    }
    return [ lati, loni ];
}

function addVector ( geodna, dy, dx ) {
    var bits = decode( geodna );
    var lat = bits[0];
    var lon = bits[1];
    return [
        _mod(( lat + 90.0 + dy ), 180.0 ) - 90.0,
        _mod(( lon + 180.0 + dx ), 360.0 ) - 180.0
    ];
}

function normalise( lat, lon ) {
    return [
        _mod(( lat + 90.0 ), 180.0 ) - 90.0,
        _mod(( lon + 180.0 ), 360.0 ) - 180.0,
    ];
}

function pointFromPointBearingAndDistance ( geodna, bearing, distance, options ) {
    options   = options || {};
    var distance = distance * 1000; // make it metres instead of kilometres
    var precision = options['precision'] || geodna.length;
    var bits = decode( geodna, { radians: true } );
    var lat1 = bits[0];
    var lon1 = bits[1];
    var lat2 = Math.asin( Math.sin( lat1 ) * Math.cos( distance / RADIUS_OF_EARTH ) +
                          Math.cos( lat1 ) * Math.sin( distance / RADIUS_OF_EARTH ) * Math.cos( bearing ) );
    var lon2 = lon1 + Math.atan2( Math.sin( bearing ) * Math.sin( distance / RADIUS_OF_EARTH ) * Math.cos( lat1 ),
                      Math.cos( distance / RADIUS_OF_EARTH ) - Math.sin( lat1 ) * Math.sin( lat2 ));
    return encode( lat2, lon2, { precision: precision, radians: true } );
}

function distanceInKm ( ga, gb ) {
    var a = decode( ga );
    var b = decode( gb );

    // if a[1] and b[1] have different signs, we need to translate
    // everything a bit in order for the formulae to work.
    if ( a[1] * b[1] < 0.0 && Math.abs( a[1] - b[1] ) > 180.0 ) {
        a = addVector( ga, 0.0, 180.0 );
        b = addVector( gb, 0.0, 180.0 );
    }
    var x = ( _deg2rad(b[1]) - _deg2rad(a[1]) ) * Math.cos( ( _deg2rad(a[0]) + _deg2rad(b[0])) / 2 );
    var y = ( _deg2rad(b[0]) - _deg2rad(a[0]) );
    var d = Math.sqrt( x*x + y*y ) * RADIUS_OF_EARTH;
    return d / 1000;
}

function neighbours ( geodna ) {
    var bits = boundingBox( geodna );
    var lati = bits[0];
    var loni = bits[1];
    var width  = Math.abs( loni[1] - loni[0] );
    var height = Math.abs( lati[1] - lati[0] );
    var neighbours = [];

    for (var i = -1; i <= 1; i++ ) {
        for ( var j = -1; j <= 1; j++ ) {
            if ( i || j ) {
                var bits = addVector ( geodna, height * i, width * j );
                neighbours[neighbours.length] = encode( bits[0], bits[1], { precision: geodna.length } );
            }
        }
    }
    return neighbours;
}

function neighboursWithinRadius ( geodna, radius, options) {
    options = options || {};
    options.precision = options['precision'] || 12;

    var neighbours = [];
    var rh = radius * Math.SQRT2;

    var start = pointFromPointBearingAndDistance( geodna, -( Math.PI / 4 ), rh, options );
    var   end = pointFromPointBearingAndDistance( geodna, Math.PI / 4, rh, options );
    var bbox = boundingBox( start );
    var bits = decode( start );
    var slon = bits[1];
    bits = decode( end );
    var elon = bits[1];
    var dheight = Math.abs( bbox[0][1] - bbox[0][0] );
    var dwidth  = Math.abs( bbox[1][1] - bbox[1][0] );
    var n = normalise( 0.0, Math.abs( elon - slon ) );
    var delta = Math.abs(n[1]);
    var tlat = 0.0;
    var tlon = 0.0;
    var current = start;

    while ( tlat <= delta ) {
        while ( tlon <= delta ) {
            var cbits = addVector( current, 0.0, dwidth );
            current = encode( cbits[0], cbits[1], options );
            var d = distanceInKm( current, geodna );
            if ( d <= radius ) {
                neighbours[neighbours.length] = current;
            }
            tlon = tlon + dwidth;
        }

        tlat = tlat + dheight;
        var bits = addVector( start, -tlat , 0.0 );
        current = encode( bits[0], bits[1], options );
        tlon = 0.0;
    }
    return neighbours;
}

function reduce ( geodna_codes ) {
    // hash all the codes
    var codes = {};
    for (var i = 0; i < geodna_codes.length; i++ ) {
        codes[ geodna_codes[i] ] = 1;
    }

    var reduced = [];
    var code;
    for (var i = 0; i < geodna_codes.length; i++ ) {
        code = geodna_codes[i];
        if ( codes[ code ] ) {
            var parent = code.substr( 0, code.length - 1 );

            if ( codes [ parent + 'a' ]
              && codes [ parent + 't' ]
              && codes [ parent + 'g' ]
              && codes [ parent + 'c' ]) {
                  codes[ parent + 'a' ] = null;
                  codes[ parent + 't' ] = null;
                  codes[ parent + 'g' ] = null;
                  codes[ parent + 'c' ] = null;
                  reduced.push( parent );
            } else {
                reduced.push( code );
            }
        }
    }
    if ( geodna_codes.length == reduced.length ) {
        return reduced;
    }
    return reduce( reduced );
}

// Helper functions used by GeoDNA functions
function _deg2rad ( degrees ) {
    return degrees * ( Math.PI / 180 );
}

function _rad2deg ( radians ) {
    return radians * ( 180 / Math.PI );
}

function _mod ( x, m) {
    return ( x % m + m ) % m;
}
