export default function (mediaPlayer, autoStart, playbackElement, defaultStyleOpts, mediaSources) {
  var subtitlesEnabled = autoStart
  var liveSubtitles = !!mediaSources.currentSubtitlesSegmentLength()
  var subtitlesContainer

  var useLegacySubs = window.bigscreenPlayer && window.bigscreenPlayer.overrides && window.bigscreenPlayer.overrides.legacySubtitles || false

  if (useLegacySubs) {
    import('./legacysubtitles.js').then(({default: LegacySubtitles}) => {
      subtitlesContainer = LegacySubtitles(mediaPlayer, autoStart, playbackElement, mediaSources, defaultStyleOpts)
    })
  } else {
    import('./imscsubtitles.js').then(({default: IMSCSubtitles}) => {
      subtitlesContainer = IMSCSubtitles(mediaPlayer, autoStart, playbackElement, mediaSources, defaultStyleOpts)
    })
  }

  function enable () {
    subtitlesEnabled = true
  }

  function disable () {
    subtitlesEnabled = false
  }

  function show () {
    if (available() && enabled()) {
      subtitlesContainer.start()
    }
  }

  function hide () {
    if (available()) {
      subtitlesContainer.stop()
    }
  }

  function enabled () {
    return subtitlesEnabled
  }

  function available () {
    if (liveSubtitles && (window.bigscreenPlayer.overrides && window.bigscreenPlayer.overrides.legacySubtitles)) {
      return false
    } else {
      return !!mediaSources.currentSubtitlesSource()
    }
  }

  function setPosition (position) {
    subtitlesContainer.updatePosition(position)
  }

  function customise (styleOpts) {
    subtitlesContainer.customise(styleOpts, subtitlesEnabled)
  }

  function renderExample (exampleXmlString, styleOpts, safePosition) {
    subtitlesContainer.renderExample(exampleXmlString, styleOpts, safePosition)
  }

  function clearExample () {
    subtitlesContainer.clearExample()
  }

  function tearDown () {
    subtitlesContainer.tearDown()
  }

  return {
    enable: enable,
    disable: disable,
    show: show,
    hide: hide,
    enabled: enabled,
    available: available,
    setPosition: setPosition,
    customise: customise,
    renderExample: renderExample,
    clearExample: clearExample,
    tearDown: tearDown
  }
}
