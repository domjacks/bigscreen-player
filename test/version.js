import Version from 'bigscreenplayer/version';
    
    describe('Version ', () => {
      it('should return a semver string', () => {
        expect(Version).toMatch(/^[0-9]+\.[0-9]+\.[0-9]+$/);
      });
    });
  
