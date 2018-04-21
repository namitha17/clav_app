var chai=require('chai');
var expect=chai.expect;
describe("syslogcontent api", function(){
  var syslogContent=require('./lib/syslogContent.js');

  describe('date checks',function(){
    it('check for VALID date',function(){
      expect(syslogContent().CheckDate('2018-01-01 01:01:01')).to.not.be.null;
    });

    it('check for INVALID date',function(){
      expect(syslogContent().CheckDate('2018-01-01 01:01')).to.be.null;
    });

    it('conversion to ISO check',function(){
      var confirmedDate=syslogContent().CheckDate('2018-01-01 01:01:01');
      expect(syslogContent().ConvertDate2ISO(confirmedDate)).to.equal('2018-01-01T01:01:01Z');
    });

  });



  describe('incoming log format checks',function(){
    it('VALID log basic format',function(){
      var log='<100>[abc] EFW: def: prio=1 id=234 rev=5 event=ghi';
      expect(syslogContent().EntireLogMatch(log)).to.not.be.null;
    });

    it('INVALID log basic format - 1',function(){
      var log='<100>[abc] EFW def: prio=1 id=234 rev=5 event=ghi';
      expect(syslogContent().EntireLogMatch(log)).to.be.null;
    });

    it('INVALID log basic format - 2',function(){
      var log='<100>[abc] EFW def: prio=1 id=234 rev=x event=ghi';
      expect(syslogContent().EntireLogMatch(log)).to.be.null;
    });

    it('VALID log with action only',function(){
      var log='<100>[abc] EFW: def: prio=1 id=234 rev=5 event=ghi someaction=klm';
      expect(syslogContent().EntireLogMatch(log)).to.not.be.null;
    });

    it('VALID log with message only',function(){
      var log='<100>[abc] EFW: def: prio=1 id=234 rev=5 event=ghi message=klm someother=nop blah blah';
      expect(syslogContent().EntireLogMatch(log)).to.not.be.null;
    });

    it('VALID log with action & message',function(){
      var log='<100>[abc] EFW: def: prio=1 id=234 rev=5 event=ghi someaction=klm message=klm someother=nop blah blah';
      expect(syslogContent().EntireLogMatch(log)).to.not.be.null;
    });
  });
});
