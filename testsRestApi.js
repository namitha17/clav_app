var chai=require('chai');
var expect=chai.expect;
describe("rest api", function(){
  var restapi=require('./lib/restapi.js');

  describe('ip checks',function(){
    it('valid ip success',function(){
      expect(restapi().CheckIP('127.1.1.1')).to.not.be.null;
    });

    it('first number invalid',function(){
      expect(restapi().CheckIP('257.1.1.1')).to.be.null;
    });

    it('second number invalid',function(){
      expect(restapi().CheckIP('1.258.1.1')).to.be.null;
    });

    it('third number invalid',function(){
      expect(restapi().CheckIP('1.1.259.1')).to.be.null;
    });

    it('fourth number invalid',function(){
      expect(restapi().CheckIP('1.1.1.260')).to.be.null;
    });
  });

  describe('query 2 filter checks',function(){
    it('no query-params should have 20 limit',function(){
      expect(restapi().QueryParse2Filter({

      })).to.deep.equal({
        limit: 20
      });
    });

    it('num query check',function(){
      expect(restapi().QueryParse2Filter({
        num: 150
      })).to.deep.equal({
        limit: 150
      });
    });

    it('valid startTime query',function(){
      expect(restapi().QueryParse2Filter({
        startTime: '2018-01-01T01:01:01Z'
      })).to.deep.equal({
        unixtime: {
          $gt: new Date('2018-01-01T01:01:01Z').getTime()/1000
        },
        limit: 20
      });
    });

    it('invalid startTime query should throw',function(){
      var func1 = function(){
        restapi().QueryParse2Filter({
          startTime: 'abcd'
        });
      };
      expect(func1).to.throw();
    });

    it('valid endTime query',function(){
      expect(restapi().QueryParse2Filter({
        endTime: '2018-01-01T01:01:01Z'
      })).to.deep.equal({
        unixtime: {
          $lt: new Date('2018-01-01T01:01:01Z').getTime()/1000
        },
        limit: 20
      });
    });

    it('invalid endTime query should throw',function(){
      var func1 = function(){
        restapi().QueryParse2Filter({
          endTime: 'abcd'
        });
      };
      expect(func1).to.throw();
    });

    it('assert big combination',function(){
      expect(restapi().QueryParse2Filter({
        num:100,
        startTime: '2018-01-01T01:01:01Z',
        endTime: '2019-12-31T23:59:59Z',
        cat: 'namitha',
        event: 'telkar',
        action: 'bangalore'
      })).to.deep.equal({
        unixtime: {
          $lt: new Date('2019-12-31T23:59:59Z').getTime()/1000,
          $gt: new Date('2018-01-01T01:01:01Z').getTime()/1000,
        },
        cat: 'namitha',
        event: 'telkar',
        action: 'bangalore',
        limit: 100
      });
    });
  });
});
