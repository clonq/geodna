var should = require('chai').should()
var geodna = require('../index')

var WELLINGTON_COORDINATES = [-41.28889560699463, 174.7772455215454];
var NEW_WELLINGTON_COORDINATES = [-31.288889, -175.222777];
var WELLINGTON_GEODNA = 'etctttagatagtgacagtcta';
var WELLINGTON_SHORT_GEODNA = 'etctttagatag';
var WELLINGTON_BB = [[-41.28893852233887, -41.28885269165039 ],[174.77720260620117,174.77728843688965]];
var NELSON_COORDINATES = [-41.283333, 173.283333];
var NELSON_GEODNA = 'etcttgctagcttagt';
var MON_COORDINATES = [7.0625, -95.677068];
var MON_GEODNA = 'watttatcttttgctacgaagt';

describe('encode', function(){
	it('should return Wellington\'s corect DNA', function(){
		var wellington = geodna.encode( WELLINGTON_COORDINATES[0], WELLINGTON_COORDINATES[1], { precision: 22 } );
		should.exist(wellington);
		wellington.should.eql(WELLINGTON_GEODNA);
	});
	it('should return Nelson\'s corect DNA', function(){
		var nelson = geodna.encode( NELSON_COORDINATES[0], NELSON_COORDINATES[1], { precision: 16 } );
		should.exist(nelson);
		nelson.should.eql(NELSON_GEODNA);
	});
	it('should return Middle of Nowhere\'s corect DNA', function(){
		var mon = geodna.encode( MON_COORDINATES[0], MON_COORDINATES[1] );
		should.exist(mon);
		mon.should.eql(MON_GEODNA);
	});
});

describe('decode', function(){
	it('should convert Wellington\'s coordinates back correctly', function(){
		var bits = geodna.decode( WELLINGTON_GEODNA );
		should.exist(bits)
		bits.length.should.eql(2);
		bits[0].should.eql(WELLINGTON_COORDINATES[0])
		bits[1].should.eql(WELLINGTON_COORDINATES[1])
	});
	it('should convert Nelson\'s coordinates back correctly', function(){
		var bits = geodna.decode( NELSON_GEODNA );
		should.exist(bits)
		bits.length.should.eql(2);
		bits[0].should.be.closeTo(NELSON_COORDINATES[0], 0.5)
		bits[1].should.be.closeTo(NELSON_COORDINATES[1], 0.5)
	});
});

describe('boundingBox', function(){
	it('should return the min/max lat/lngs around the geodna', function(){
		var bb = geodna.boundingBox( WELLINGTON_GEODNA );
		should.exist(bb)
		bb.should.eql(WELLINGTON_BB);
	});
});

describe('addVector', function(){
	it('should return the new lat/lng', function(){
		var bits = geodna.addVector( WELLINGTON_GEODNA, 10.0, 10.0 );
		should.exist(bits)
		bits.length.should.eql(2);
		bits[0].should.be.closeTo(NEW_WELLINGTON_COORDINATES[0], 0.5)
		bits[1].should.be.closeTo(NEW_WELLINGTON_COORDINATES[1], 0.5)
	});
});

describe('neighbours', function(){
	it('should return the correct set of neighbours', function(){
		var neighbours = geodna.neighbours( WELLINGTON_SHORT_GEODNA );
		should.exist(neighbours)
		neighbours.length.should.eql(8);
	});
});

describe('reduce', function(){
	it('should find Wellington in proximity to Nelson', function(){
		var neighbours = geodna.reduce( geodna.neighboursWithinRadius( NELSON_GEODNA, 140.0, { precision: 11 } ) );
		should.exist(neighbours);
		var found = false;
		for ( var i = 0; i < neighbours.length && !found; i++ ) {
		    var n = neighbours[i];
		    if ( WELLINGTON_GEODNA.indexOf( n ) == 0 ) {
		        found = true;
		    }
		}
		found.should.be.ok;
	});
});