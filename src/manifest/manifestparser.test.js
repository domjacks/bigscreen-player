import ManifestParser from './manifestparser'
import DashManifests from './stubData/dashmanifests'
import HlsManifests from './stubData/hlsmanifests'

describe('ManifestParser', () => {
  let dashManifests
  let hlsManifests

  beforeEach(() => {
    dashManifests = new DashManifests()
    hlsManifests = new HlsManifests()
  })

  describe('DASH mpd', () => {
    it('returns correct data for sliding window dash manifest', () => {
      const manifest = dashManifests.slidingWindow()
      const liveWindowData = ManifestParser.parse(manifest, 'mpd', new Date('2018-12-13T11:00:00.000000Z'))

      expect(liveWindowData).toEqual({
        windowStartTime: 1544691536160,
        windowEndTime: 1544698736160, // time provided....  - 60000 (one minute in millis) - (1000 * 184320 /48000) (One segment of video content in the example mpd)
        correction: 1544691536.16
      })
    })

    it('returns correct data for growing window manifest', () => {
      const manifest = dashManifests.growingWindow()
      const liveWindowData = ManifestParser.parse(manifest, 'mpd', new Date('2018-12-13T11:00:00.000000Z'))

      expect(liveWindowData).toEqual({
        windowStartTime: 1544695200000, // availabilityStartTime (because there is no timeShiftBufferDepth)
        windowEndTime: 1544698796160, // time provided....  - (1000 * 3.84) (One segment of video content in the example mpd)
        correction: 0
      })
    })

    it('returns an error if manifest data has bad data in the attributes', () => {
      const manifest = dashManifests.badAttributes()
      const liveWindowData = ManifestParser.parse(manifest, 'mpd', new Date('2018-12-13T11:00:00.000000Z'))

      expect(liveWindowData).toEqual({error: 'Error parsing DASH manifest attributes'})
    })

    it('returns an error if manifest data is malformed', () => {
      const manifest = 'not an MPD'
      const liveWindowData = ManifestParser.parse(manifest, 'mpd', new Date('2018-12-13T11:00:00.000000Z'))

      expect(liveWindowData).toEqual({error: 'Error parsing DASH manifest'})
    })
  })

  describe('HLS m3u8', () => {
    it('returns correct data for sliding window hls manifest', () => {
      const manifest = hlsManifests.slidingWindow
      const liveWindowData = ManifestParser.parse(manifest, 'm3u8')

      expect(liveWindowData).toEqual({
        windowStartTime: 1436259310000,
        windowEndTime: 1436259342000
      })
    })

    it('returns and error if manifest has an invalid start date', () => {
      const manifest = hlsManifests.invalidDate
      const liveWindowData = ManifestParser.parse(manifest, 'm3u8')

      expect(liveWindowData).toEqual({error: 'Error parsing HLS manifest'})
    })

    it('returns an error if hls manifest data is malformed', () => {
      const manifest = 'not an valid manifest'
      const liveWindowData = ManifestParser.parse(manifest, 'm3u8')

      expect(liveWindowData).toEqual({error: 'Error parsing HLS manifest'})
    })
  })
})
