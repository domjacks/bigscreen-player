import AllowedMediaTransitions from '../allowedmediatransitions'
import MediaState from '../models/mediastate'
import WindowTypes from '../models/windowtypes'
import DebugTool from '../debugger/debugtool'
import LiveGlitchCurtain from './liveglitchcurtain'

function LegacyPlayerAdapter (mediaSources, windowType, playbackElement, isUHD, player) {
  const EVENT_HISTORY_LENGTH = 2

  const setSourceOpts = {
    disableSentinels: !!isUHD && windowType !== WindowTypes.STATIC && window.bigscreenPlayer.overrides && window.bigscreenPlayer.overrides.liveUhdDisableSentinels,
    disableSeekSentinel: window.bigscreenPlayer.overrides && window.bigscreenPlayer.overrides.disableSeekSentinel
  }

  const timeCorrection = mediaSources.time() && mediaSources.time().correction || 0
  const mediaPlayer = player
  const eventHistory = []

  const transitions = new AllowedMediaTransitions(mediaPlayer)

  let isEnded = false
  let duration = 0

  let eventCallback
  let errorCallback
  let timeUpdateCallback
  let currentTime
  let isPaused
  let hasStartTime

  let handleErrorOnExitingSeek
  let delayPauseOnExitSeek

  let pauseOnExitSeek
  let exitingSeek
  let targetSeekToTime

  let liveGlitchCurtain

  let strategy = window.bigscreenPlayer && window.bigscreenPlayer.playbackStrategy

  mediaPlayer.addEventCallback(this, eventHandler)

  strategy = strategy.match(/.+(?=strategy)/g)[0]

  function eventHandler (event) {
    const handleEvent = {
      'playing': onPlaying,
      'paused': onPaused,
      'buffering': onBuffering,
      'seek-attempted': onSeekAttempted,
      'seek-finished': onSeekFinished,
      'status': onTimeUpdate,
      'complete': onEnded,
      'error': onError
    }

    if (handleEvent.hasOwnProperty(event.type)) {
      handleEvent[event.type].call(this, event)
    } else {
      DebugTool.info(getSelection() + ' Event:' + event.type)
    }

    if (event.type !== 'status') {
      if (eventHistory.length >= EVENT_HISTORY_LENGTH) {
        eventHistory.pop()
      }

      eventHistory.unshift({type: event.type, time: new Date().getTime()})
    }
  }

  function onPlaying (event) {
    currentTime = event.currentTime - timeCorrection
    isPaused = false
    isEnded = false
    duration = duration || event.duration
    publishMediaState(MediaState.PLAYING)
  }

  function onPaused (_event) {
    isPaused = true
    publishMediaState(MediaState.PAUSED)
  }

  function onBuffering (_event) {
    isEnded = false
    publishMediaState(MediaState.WAITING)
  }

  function onTimeUpdate (event) {
    isPaused = false

    // Note: Multiple consecutive CDN failover logic
    // A newly loaded video element will always report a 0 time update
    // This is slightly unhelpful if we want to continue from a later point but consult currentTime as the source of truth.
    if (parseInt(event.currentTime) !== 0) {
      currentTime = event.currentTime - timeCorrection
    }

    // Must publish this time update before checkSeekSucceded - which could cause a pause event
    // This is a device specific event ordering issue.
    publishTimeUpdate()
    if ((handleErrorOnExitingSeek || delayPauseOnExitSeek) && exitingSeek) {
      checkSeekSucceeded(event.seekableRange.start, event.currentTime)
    }
  }

  function onEnded () {
    isPaused = true
    isEnded = true
    publishMediaState(MediaState.ENDED)
  }

  function onError () {
    if (handleErrorOnExitingSeek && exitingSeek) {
      restartMediaPlayer()
    } else {
      publishError()
    }
  }

  function onSeekAttempted () {
    if (requiresLiveCurtain()) {
      const doNotForceBeginPlaybackToEndOfWindow = {
        forceBeginPlaybackToEndOfWindow: false
      }

      const streaming = window.bigscreenPlayer || {
        overrides: doNotForceBeginPlaybackToEndOfWindow
      }

      const overrides = streaming.overrides || doNotForceBeginPlaybackToEndOfWindow
      const shouldShowCurtain = windowType !== WindowTypes.STATIC && (hasStartTime || overrides.forceBeginPlaybackToEndOfWindow)

      if (shouldShowCurtain) {
        liveGlitchCurtain = new LiveGlitchCurtain(playbackElement)
        liveGlitchCurtain.showCurtain()
      }
    }
  }

  function onSeekFinished (event) {
    if (requiresLiveCurtain()) {
      if (liveGlitchCurtain) {
        liveGlitchCurtain.hideCurtain()
      }
    }
  }

  function publishMediaState (mediaState) {
    if (eventCallback) {
      eventCallback(mediaState)
    }
  }

  function publishError () {
    if (errorCallback) {
      errorCallback()
    }
  }

  function publishTimeUpdate () {
    if (timeUpdateCallback) {
      timeUpdateCallback()
    }
  }

  function getStrategy () {
    return strategy.toUpperCase()
  }

  function setupExitSeekWorkarounds (mimeType) {
    handleErrorOnExitingSeek = windowType !== WindowTypes.STATIC && mimeType === 'application/dash+xml'

    const deviceFailsPlayAfterPauseOnExitSeek = window.bigscreenPlayer.overrides && window.bigscreenPlayer.overrides.pauseOnExitSeek
    delayPauseOnExitSeek = handleErrorOnExitingSeek || deviceFailsPlayAfterPauseOnExitSeek
  }

  function checkSeekSucceeded (seekableRangeStart, currentTime) {
    const SEEK_TOLERANCE = 30

    const clampedSeekToTime = Math.max(seekableRangeStart, targetSeekToTime)
    const successfullySeeked = Math.abs(currentTime - clampedSeekToTime) < SEEK_TOLERANCE

    if (successfullySeeked) {
      if (pauseOnExitSeek) {
      // Delay call to pause until seek has completed
      // successfully for scenarios which can error upon exiting seek.
        mediaPlayer.pause()
        pauseOnExitSeek = false
      }

      exitingSeek = false
    }
  }

  // Dash live streams can error on exiting seek when the start of the
  // seekable range has overtaken the point where the stream was paused
  // Workaround - reset the media player then do a fresh beginPlaybackFrom()
  function restartMediaPlayer () {
    exitingSeek = false
    pauseOnExitSeek = false

    const source = mediaPlayer.getSource()
    const mimeType = mediaPlayer.getMimeType()

    reset()
    mediaPlayer.initialiseMedia('video', source, mimeType, playbackElement, setSourceOpts)
    mediaPlayer.beginPlaybackFrom(currentTime + timeCorrection || 0)
  }

  function requiresLiveCurtain () {
    return !!window.bigscreenPlayer.overrides && !!window.bigscreenPlayer.overrides.showLiveCurtain
  }

  function reset () {
    if (transitions.canBeStopped()) {
      mediaPlayer.stop()
    }

    mediaPlayer.reset()
  }

  return {
    transitions: transitions,
    addEventCallback: (thisArg, newCallback) => {
      eventCallback = (event) => newCallback.call(thisArg, event)
    },
    addErrorCallback: (thisArg, newErrorCallback) => {
      errorCallback = (event) => newErrorCallback.call(thisArg, event)
    },
    addTimeUpdateCallback: (thisArg, newTimeUpdateCallback) => {
      timeUpdateCallback = () => newTimeUpdateCallback.call(thisArg)
    },
    load: (mimeType, startTime) => {
      setupExitSeekWorkarounds(mimeType)
      isPaused = false

      hasStartTime = startTime || startTime === 0
      const isPlaybackFromLivePoint = windowType !== WindowTypes.STATIC && !hasStartTime

      mediaPlayer.initialiseMedia('video', mediaSources.currentSource(), mimeType, playbackElement, setSourceOpts)
      if (mediaPlayer.beginPlaybackFrom && !isPlaybackFromLivePoint) {
        currentTime = startTime
        DebugTool.keyValue({key: 'initial-playback-time', value: startTime + timeCorrection})
        mediaPlayer.beginPlaybackFrom(startTime + timeCorrection || 0)
      } else {
        mediaPlayer.beginPlayback()
      }

      DebugTool.keyValue({key: 'strategy', value: getStrategy()})
    },
    play: () => {
      isPaused = false
      if (delayPauseOnExitSeek && exitingSeek) {
        pauseOnExitSeek = false
      } else {
        if (isEnded) {
          mediaPlayer.playFrom && mediaPlayer.playFrom(0)
        } else if (transitions.canResume()) {
          mediaPlayer.resume()
        } else {
          mediaPlayer.playFrom && mediaPlayer.playFrom(currentTime + timeCorrection)
        }
      }
    },
    pause: (options) => {
      // TODO - transitions is checked in playerComponent. The check can be removed here.
      if (delayPauseOnExitSeek && exitingSeek && transitions.canBePaused()) {
        pauseOnExitSeek = true
      } else {
        mediaPlayer.pause(options)
      }
    },
    isPaused: () => isPaused,
    isEnded: () => isEnded,
    getDuration: () => duration,
    getPlayerElement: () => mediaPlayer.getPlayerElement && mediaPlayer.getPlayerElement(),
    getSeekableRange: () => {
      if (windowType === WindowTypes.STATIC) {
        return {
          start: 0,
          end: duration
        }
      } else {
        const seekableRange = mediaPlayer.getSeekableRange && mediaPlayer.getSeekableRange() || {}
        if (seekableRange.hasOwnProperty('start')) {
          seekableRange.start = seekableRange.start - timeCorrection
        }
        if (seekableRange.hasOwnProperty('end')) {
          seekableRange.end = seekableRange.end - timeCorrection
        }
        return seekableRange
      }
    },
    setPlaybackRate: (rate) => {
      if (typeof mediaPlayer.setPlaybackRate === 'function') {
        mediaPlayer.setPlaybackRate(rate)
      }
    },
    getPlaybackRate: () => {
      if (typeof mediaPlayer.getPlaybackRate === 'function') {
        return mediaPlayer.getPlaybackRate()
      }
      return 1.0
    },
    getCurrentTime: () => {
      return currentTime
    },
    setCurrentTime: (seekToTime) => {
      isEnded = false
      currentTime = seekToTime
      seekToTime += timeCorrection

      if (handleErrorOnExitingSeek || delayPauseOnExitSeek) {
        targetSeekToTime = seekToTime
        exitingSeek = true
        pauseOnExitSeek = isPaused
      }

      mediaPlayer.playFrom && mediaPlayer.playFrom(seekToTime)
      if (isPaused && !delayPauseOnExitSeek) {
        mediaPlayer.pause()
      }
    },
    getStrategy: getStrategy(),
    reset: reset,
    tearDown: () => {
      mediaPlayer.removeAllEventCallbacks()
      pauseOnExitSeek = false
      exitingSeek = false
      pauseOnExitSeek = false
      delayPauseOnExitSeek = false
      isPaused = true
      isEnded = false
      if (liveGlitchCurtain) {
        liveGlitchCurtain.tearDown()
        liveGlitchCurtain = undefined
      }
      eventCallback = undefined
      errorCallback = undefined
      timeUpdateCallback = undefined
    }
  }
}

export default LegacyPlayerAdapter
