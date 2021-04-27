import ManifestParser from 'bigscreenplayer/manifest/manifestparser';
import DashManifests from 'testdata/dashmanifests';
import HlsManifests from 'testdata/hlsmanifests';
    describe('ManifestParser', () => {
      var dashManifests;
      var hlsManifests;

      beforeEach(() => {
        dashManifests = new DashManifests();
        hlsManifests = new HlsManifests();
      });

      afterEach(() => {
      });

      describe('DASH mpd', () => {
        it('returns correct data for sliding window dash manifest', () => {
          var manifest = dashManifests.slidingWindow();
          var liveWindowData = ManifestParser.parse(manifest, 'mpd', new Date('2018-12-13T11:00:00.000000Z'));

          expect(liveWindowData).toEqual({
            windowStartTime: 1544691536160,
            windowEndTime: 1544698736160, // time provided....  - 60000 (one minute in millis) - (1000 * 184320 /48000) (One segment of video content in the example mpd)
            correction: 1544691536.16
          });
        });

        it('returns correct data for growing window manifest', () => {
          var manifest = dashManifests.growingWindow();
          var liveWindowData = ManifestParser.parse(manifest, 'mpd', new Date('2018-12-13T11:00:00.000000Z'));

          expect(liveWindowData).toEqual({
            windowStartTime: 1544695200000, // availabilityStartTime (because there is no timeShiftBufferDepth)
            windowEndTime: 1544698796160, // time provided....  - (1000 * 3.84) (One segment of video content in the example mpd)
            correction: 0
          });
        });

        it('returns an error if manifest data has bad data in the attributes', () => {
          var manifest = dashManifests.badAttributes();
          var liveWindowData = ManifestParser.parse(manifest, 'mpd', new Date('2018-12-13T11:00:00.000000Z'));

          expect(liveWindowData).toEqual({error: 'Error parsing DASH manifest attributes'});
        });

        it('returns an error if manifest data is malformed', () => {
          var manifest = 'not an MPD';
          var liveWindowData = ManifestParser.parse(manifest, 'mpd', new Date('2018-12-13T11:00:00.000000Z'));

          expect(liveWindowData).toEqual({error: 'Error parsing DASH manifest'});
        });
      });

      describe('HLS m3u8', () => {
        it('returns correct data for sliding window hls manifest', () => {
          var manifest = hlsManifests.slidingWindow;
          var liveWindowData = ManifestParser.parse(manifest, 'm3u8');

          expect(liveWindowData).toEqual({
            windowStartTime: 1436259310000,
            windowEndTime: 1436259342000
          });
        });

        it('returns and error if manifest has an invalid start date', () => {
          var manifest = hlsManifests.invalidDate;
          var liveWindowData = ManifestParser.parse(manifest, 'm3u8');

          expect(liveWindowData).toEqual({error: 'Error parsing HLS manifest'});
        });

        it('returns an error if hls manifest data is malformed', () => {
          var manifest = 'not an valid manifest';
          var liveWindowData = ManifestParser.parse(manifest, 'm3u8');

          expect(liveWindowData).toEqual({error: 'Error parsing HLS manifest'});
        });
      });
    });
  
