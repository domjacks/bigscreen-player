import Squire from 'squire';
import WindowTypes from 'bigscreenplayer/models/windowtypes';
import MediaKinds from 'bigscreenplayer/models/mediakinds';
import MediaState from 'bigscreenplayer/models/mediastate';
import MediaSources from 'bigscreenplayer/mediasources';
import LiveSupport from 'bigscreenplayer/models/livesupport';
    var injector = new Squire();
    var BasicStrategy;
    var basicStrategy;
    var cdnArray;
    var playbackElement;
    var mockMediaSources;
    var eventCallbacks;
    var eventHandlers = {};
    var testTimeCorrection;

    var mockAudioElement;
    var mockVideoElement;

    var mockDynamicWindowUtils = jasmine.createSpyObj('mockDynamicWindowUtils', ['autoResumeAtStartOfRange']);

    function setUpStrategy (windowType, mediaKind) {
      var defaultWindowType = windowType || WindowTypes.STATIC;
      var defaultMediaKind = mediaKind || MediaKinds.VIDEO;

      basicStrategy = BasicStrategy(mockMediaSources, defaultWindowType, defaultMediaKind, playbackElement);
    }

    describe('HTML5 Strategy', () => {
      beforeEach(done => {
        mockAudioElement = document.createElement('audio');
        mockVideoElement = document.createElement('video');
        playbackElement = document.createElement('div');
        playbackElement.id = 'app';
        document.body.appendChild(playbackElement);

        cdnArray = [
          { url: 'http://testcdn1/test/', cdn: 'http://testcdn1/test/' },
          { url: 'http://testcdn2/test/', cdn: 'http://testcdn2/test/' },
          { url: 'http://testcdn3/test/', cdn: 'http://testcdn3/test/' }
        ];

        mockMediaSources = {
          time: function () {
            return {correction: testTimeCorrection};
          },
          currentSource: function () {
            return cdnArray[0].url;
          }
        };

        injector.mock({
          'bigscreenplayer/dynamicwindowutils': mockDynamicWindowUtils
        });

        injector.require(['bigscreenplayer/playbackstrategy/basicstrategy'], function (SquiredBasicStrategy) {
          BasicStrategy = SquiredBasicStrategy;

          spyOn(document, 'createElement').and.callFake(function (elementType) {
            if (elementType === 'audio') {
              return mockAudioElement;
            } else if (elementType === 'video') {
              return mockVideoElement;
            }
          });

          spyOn(mockVideoElement, 'load');
          spyOn(mockVideoElement, 'play');
          spyOn(mockVideoElement, 'pause');
          spyOn(mockVideoElement, 'addEventListener');
          spyOn(mockVideoElement, 'removeEventListener');

          mockVideoElement.addEventListener.and.callFake(function (eventType, handler) {
            eventHandlers[eventType] = handler;

            eventCallbacks = function (event) {
              eventHandlers[event].call(event);
            };
          });

          done();
        });
      });

      afterEach(() => {
        mockDynamicWindowUtils.autoResumeAtStartOfRange.calls.reset();
        testTimeCorrection = 0;
        basicStrategy.tearDown();
        mockVideoElement = undefined;
        mockAudioElement = undefined;
      });

      describe('transitions', () => {
        it('canBePaused() and canBeginSeek transitions are true', () => {
          setUpStrategy();

          expect(basicStrategy.transitions.canBePaused()).toBe(true);
          expect(basicStrategy.transitions.canBeginSeek()).toBe(true);
        });
      });

      describe('load', () => {
        it('should create a video element and add it to the playback element', () => {
          setUpStrategy(null, MediaKinds.VIDEO);

          expect(playbackElement.childElementCount).toBe(0);

          basicStrategy.load(null, 0);

          expect(playbackElement.firstChild).toBe(mockVideoElement);
          expect(playbackElement.childElementCount).toBe(1);
        });

        it('should create an audio element and add it to the playback element', () => {
          setUpStrategy(null, MediaKinds.AUDIO);

          expect(playbackElement.childElementCount).toBe(0);

          basicStrategy.load(null, 0);

          expect(playbackElement.firstChild).toBe(mockAudioElement);
          expect(playbackElement.childElementCount).toBe(1);
        });

        it('should set the style properties correctly on the media element', () => {
          setUpStrategy(null, MediaKinds.VIDEO);
          basicStrategy.load(null, 0);

          expect(mockVideoElement.style.position).toBe('absolute');
          expect(mockVideoElement.style.width).toBe('100%');
          expect(mockVideoElement.style.height).toBe('100%');
        });

        it('should set the autoplay and preload properties correctly on the media element', () => {
          setUpStrategy(null, MediaKinds.VIDEO);
          basicStrategy.load(null, 0);

          expect(mockVideoElement.autoplay).toBe(true);
          expect(mockVideoElement.preload).toBe('auto');
        });

        it('should set the source url correctly on the media element', () => {
          setUpStrategy(null, MediaKinds.VIDEO);
          basicStrategy.load(null, 0);

          expect(mockVideoElement.src).toBe('http://testcdn1/test/');
        });

        it('should set the currentTime to start time if one is provided', () => {
          setUpStrategy(null, MediaKinds.VIDEO);
          basicStrategy.load(null, 25);

          expect(mockVideoElement.currentTime).toEqual(25);
        });

        it('should not set the currentTime to start time if one is not provided', () => {
          setUpStrategy(null, MediaKinds.VIDEO);
          basicStrategy.load(null, undefined);

          expect(mockVideoElement.currentTime).toEqual(0);
        });

        it('should call load on the media element', () => {
          setUpStrategy();
          basicStrategy.load(null, undefined);

          expect(mockVideoElement.load).toHaveBeenCalled();
        });

        it('should update the media element source if load is when media element already exists', () => {
          setUpStrategy();
          basicStrategy.load(null, undefined);

          expect(mockVideoElement.src).toBe('http://testcdn1/test/');

          mockMediaSources.currentSource = function () {
            return cdnArray[1].url;
          };

          basicStrategy.load(null, undefined);

          expect(mockVideoElement.src).toBe('http://testcdn2/test/');
        });

        it('should update the media element currentTime if load is called with a start time when media element already exists', () => {
          setUpStrategy();
          basicStrategy.load(null, 25);

          expect(mockVideoElement.currentTime).toEqual(25);

          basicStrategy.load(null, 35);

          expect(mockVideoElement.currentTime).toEqual(35);
        });

        it('should not update the media element currentTime if load is called without a start time when media element already exists', () => {
          setUpStrategy();
          basicStrategy.load(null, 25);

          expect(mockVideoElement.currentTime).toEqual(25);

          basicStrategy.load(null, undefined);

          expect(mockVideoElement.currentTime).toEqual(25);
        });

        it('should set up bindings to media element events correctly', () => {
          setUpStrategy();
          basicStrategy.load(null, undefined);

          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('timeupdate', jasmine.any(Function));
          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('playing', jasmine.any(Function));
          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('pause', jasmine.any(Function));
          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('waiting', jasmine.any(Function));
          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('seeking', jasmine.any(Function));
          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('seeked', jasmine.any(Function));
          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('ended', jasmine.any(Function));
          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('error', jasmine.any(Function));
          expect(mockVideoElement.addEventListener).toHaveBeenCalledWith('loadedmetadata', jasmine.any(Function));
        });
      });

      describe('play', () => {
        it('should call through to the media elements play function', () => {
          setUpStrategy();
          basicStrategy.load(null, 0);
          basicStrategy.play();

          expect(mockVideoElement.play).toHaveBeenCalled();
        });
      });

      describe('pause', () => {
        it('should call through to the media elements pause function', () => {
          setUpStrategy();
          basicStrategy.load(null, 0);
          basicStrategy.pause();

          expect(mockVideoElement.pause).toHaveBeenCalled();
        });

        it('should start autoresume timeout if sliding window', () => {
          setUpStrategy(WindowTypes.SLIDING, MediaKinds.VIDEO);
          basicStrategy.load(null, 0);
          basicStrategy.pause();

          expect(mockDynamicWindowUtils.autoResumeAtStartOfRange).toHaveBeenCalledTimes(1);
          expect(mockDynamicWindowUtils.autoResumeAtStartOfRange).toHaveBeenCalledWith(
            0,
            { start: 0, end: 0 },
            jasmine.any(Function),
            jasmine.any(Function),
            jasmine.any(Function),
            basicStrategy.play
          );
        });

        it('should not start autoresume timeout if sliding window but disableAutoResume is set', () => {
          var opts = {
            disableAutoResume: true
          };

          setUpStrategy(WindowTypes.SLIDING, MediaKinds.VIDEO);
          basicStrategy.load(null, 0);
          basicStrategy.pause(opts);

          expect(mockDynamicWindowUtils.autoResumeAtStartOfRange).not.toHaveBeenCalled();
        });
      });

      describe('getSeekableRange', () => {
        beforeEach(() => {
          spyOnProperty(mockVideoElement, 'seekable').and.returnValue(
            {
              start: function (index) {
                if (index === 0) {
                  return 25;
                } else {
                  return undefined;
                }
              },
              end: function (index) {
                if (index === 0) {
                  return 100;
                } else {
                  return undefined;
                }
              },
              length: 2
            });
        });

        it('returns the correct start and end time before load has been called', () => {
          setUpStrategy();

          expect(basicStrategy.getSeekableRange()).toEqual({ start: 0, end: 0 });
        });

        it('returns the correct start and end time before meta data has loaded', () => {
          setUpStrategy();
          basicStrategy.load(null, undefined);

          expect(basicStrategy.getSeekableRange()).toEqual({ start: 0, end: 0 });
        });

        it('returns the correct start and end time once meta data has loaded', () => {
          setUpStrategy();
          basicStrategy.load(null, undefined);
          eventCallbacks('loadedmetadata');

          expect(basicStrategy.getSeekableRange()).toEqual({ start: 25, end: 100 });
        });

        it('returns the correct start and end time minus any time correction', () => {
          testTimeCorrection = 20;
          setUpStrategy();
          basicStrategy.load(null, undefined);
          eventCallbacks('loadedmetadata');

          expect(basicStrategy.getSeekableRange()).toEqual({ start: 5, end: 80 });
        });
      });

      describe('getDuration', () => {
        beforeEach(() => {
          spyOnProperty(mockVideoElement, 'duration').and.returnValue(100);
        });

        it('returns duration of zero before load has been called', () => {
          setUpStrategy();

          expect(basicStrategy.getDuration()).toEqual(0);
        });

        it('returns duration of zero before meta data has loaded', () => {
          setUpStrategy();
          basicStrategy.load(null, undefined);

          expect(basicStrategy.getDuration()).toEqual(0);
        });

        it('returns the correct duration once meta data has loaded', () => {
          setUpStrategy();
          basicStrategy.load(null, undefined);
          eventCallbacks('loadedmetadata');

          expect(basicStrategy.getDuration()).toEqual(100);
        });
      });

      describe('getCurrentTime', () => {
        beforeEach(() => {
          mockVideoElement.currentTime = 5;
        });

        it('returns currentTime of zero before load has been called', () => {
          setUpStrategy();

          expect(basicStrategy.getCurrentTime()).toEqual(0);
        });

        it('returns the correct currentTime once load has been called', () => {
          setUpStrategy();
          basicStrategy.load(null, undefined);

          expect(basicStrategy.getCurrentTime()).toEqual(5);

          mockVideoElement.currentTime = 10;

          expect(basicStrategy.getCurrentTime()).toEqual(10);
        });

        it('subtracts any time correction from the media elements current time', () => {
          testTimeCorrection = 20;
          setUpStrategy();
          basicStrategy.load(null, undefined);

          mockVideoElement.currentTime = 50;

          expect(basicStrategy.getCurrentTime()).toEqual(30);
        });
      });

      describe('setCurrentTime', () => {
        var seekableRange = {
          start: 0,
          end: 100
        };
        var clampOffset = 1.1;

        beforeEach(() => {
          spyOnProperty(mockVideoElement, 'seekable').and.returnValue(
            {
              start: function () {
                return seekableRange.start;
              },
              end: function () {
                return seekableRange.end;
              },
              length: 2
            });

          mockVideoElement.currentTime = 5;
        });

        it('sets the current time on the media element to that passed in', () => {
          setUpStrategy();
          basicStrategy.load(null, undefined);

          basicStrategy.setCurrentTime(10);

          expect(basicStrategy.getCurrentTime()).toEqual(10);
        });

        it('adds time correction from the media source onto the passed in seek time', () => {
          testTimeCorrection = 20;
          setUpStrategy();
          basicStrategy.load(null, undefined);

          basicStrategy.setCurrentTime(50);

          expect(mockVideoElement.currentTime).toEqual(70);
        });

        it('does not attempt to clamp time if meta data is not loaded', () => {
          setUpStrategy();
          basicStrategy.load(null, undefined);

          basicStrategy.setCurrentTime(110); // this is greater than expected seekable range. although range does not exist until meta data loaded

          expect(mockVideoElement.currentTime).toEqual(110);
        });

        it('clamps to 1.1 seconds before seekable range end when seeking to end', () => {
          setUpStrategy();
          basicStrategy.load(null, undefined);
          eventCallbacks('loadedmetadata');

          basicStrategy.setCurrentTime(seekableRange.end);

          expect(mockVideoElement.currentTime).toEqual(seekableRange.end - clampOffset);
        });

        it('clamps to 1.1 seconds before seekable range end when seeking past end', () => {
          setUpStrategy();
          basicStrategy.load(null, undefined);
          eventCallbacks('loadedmetadata');

          basicStrategy.setCurrentTime(seekableRange.end + 10);

          expect(mockVideoElement.currentTime).toEqual(seekableRange.end - clampOffset);
        });

        it('clamps to 1.1 seconds before seekable range end when seeking prior to end', () => {
          setUpStrategy();
          basicStrategy.load(null, undefined);
          eventCallbacks('loadedmetadata');

          basicStrategy.setCurrentTime(seekableRange.end - 1);

          expect(mockVideoElement.currentTime).toEqual(seekableRange.end - clampOffset);
        });

        it('clamps to the start of seekable range when seeking before start of range', () => {
          setUpStrategy();
          basicStrategy.load(null, undefined);
          eventCallbacks('loadedmetadata');

          basicStrategy.setCurrentTime(seekableRange.start - 10);

          expect(mockVideoElement.currentTime).toEqual(seekableRange.start);
        });
      });

      describe('isPaused', () => {
        it('should return false when the media element is not paused', () => {
          setUpStrategy();
          basicStrategy.load(null, 0);
          spyOnProperty(mockVideoElement, 'paused').and.returnValue(false);

          expect(basicStrategy.isPaused()).toBe(false);
        });

        it('should return true when the media element is paused', () => {
          setUpStrategy();
          basicStrategy.load(null, 0);
          spyOnProperty(mockVideoElement, 'paused').and.returnValue(true);

          expect(basicStrategy.isPaused()).toBe(true);
        });
      });

      describe('isEnded', () => {
        it('should return false when the media element is not ended', () => {
          setUpStrategy();
          basicStrategy.load(null, 0);
          spyOnProperty(mockVideoElement, 'ended').and.returnValue(false);

          expect(basicStrategy.isEnded()).toBe(false);
        });

        it('should return true when the media element is ended', () => {
          setUpStrategy();
          basicStrategy.load(null, 0);
          spyOnProperty(mockVideoElement, 'ended').and.returnValue(true);

          expect(basicStrategy.isEnded()).toBe(true);
        });
      });

      describe('tearDown', () => {
        it('should remove all event listener bindings', () => {
          setUpStrategy();
          basicStrategy.load(null, 0);
          basicStrategy.tearDown();

          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('timeupdate', jasmine.any(Function));
          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('playing', jasmine.any(Function));
          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('pause', jasmine.any(Function));
          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('waiting', jasmine.any(Function));
          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('seeking', jasmine.any(Function));
          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('seeked', jasmine.any(Function));
          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('ended', jasmine.any(Function));
          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('error', jasmine.any(Function));
          expect(mockVideoElement.removeEventListener).toHaveBeenCalledWith('loadedmetadata', jasmine.any(Function));
        });

        it('should remove the video element', () => {
          setUpStrategy();
          basicStrategy.load(null, 0);

          expect(playbackElement.childElementCount).toBe(1);

          basicStrategy.tearDown();

          expect(playbackElement.childElementCount).toBe(0);
        });

        it('should empty the eventCallbacks ', () => {
          setUpStrategy();

          function tearDownAndError () {
            basicStrategy.addEventCallback(function () {}); // add event callback to prove array is emptied in tearDown
            basicStrategy.load(null, 0);
            basicStrategy.tearDown();
            eventCallbacks('pause');
          }

          expect(tearDownAndError).not.toThrowError();
        });

        it('should undefine the error callback', () => {
          var errorCallbackSpy = jasmine.createSpy('errorSpy');

          setUpStrategy();
          basicStrategy.addErrorCallback(this, errorCallbackSpy);
          basicStrategy.load(null, 0);
          basicStrategy.tearDown();
          eventCallbacks('error');

          expect(errorCallbackSpy).not.toHaveBeenCalled();
        });

        it('should undefine the timeupdate callback', () => {
          var timeUpdateCallbackSpy = jasmine.createSpy('timeUpdateSpy');

          setUpStrategy();
          basicStrategy.addTimeUpdateCallback(this, timeUpdateCallbackSpy);
          basicStrategy.load(null, 0);
          basicStrategy.tearDown();
          eventCallbacks('timeupdate');

          expect(timeUpdateCallbackSpy).not.toHaveBeenCalled();
        });

        it('should undefine the mediaPlayer element', () => {
          setUpStrategy();
          basicStrategy.load(null, 0);
          basicStrategy.tearDown();

          expect(basicStrategy.getPlayerElement()).toBe(undefined);
        });
      });

      describe('getPlayerElement', () => {
        it('should return the mediaPlayer element', () => {
          setUpStrategy();
          basicStrategy.load(null, 0);

          expect(basicStrategy.getPlayerElement()).toEqual(mockVideoElement);
        });
      });

      describe('events', () => {
        var eventCallbackSpy;
        var timeUpdateCallbackSpy;
        var errorCallbackSpy;

        beforeEach(() => {
          setUpStrategy(WindowTypes.SLIDING, MediaKinds.VIDEO);
          basicStrategy.load(null, 25);

          eventCallbackSpy = jasmine.createSpy('eventSpy');
          basicStrategy.addEventCallback(this, eventCallbackSpy);

          timeUpdateCallbackSpy = jasmine.createSpy('timeUpdateSpy');
          basicStrategy.addTimeUpdateCallback(this, timeUpdateCallbackSpy);

          errorCallbackSpy = jasmine.createSpy('errorSpy');
          basicStrategy.addErrorCallback(this, errorCallbackSpy);
        });

        afterEach(() => {
          eventCallbackSpy.calls.reset();
          timeUpdateCallbackSpy.calls.reset();
          errorCallbackSpy.calls.reset();
        });

        it('should publish a state change to PLAYING on playing event', () => {
          eventCallbacks('playing');

          expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.PLAYING);
          expect(eventCallbackSpy).toHaveBeenCalledTimes(1);
        });

        it('should publish a state change to PAUSED on pause event', () => {
          eventCallbacks('pause');

          expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.PAUSED);
          expect(eventCallbackSpy).toHaveBeenCalledTimes(1);
        });

        it('should publish a state change to WAITING on seeking event', () => {
          eventCallbacks('seeking');

          expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.WAITING);
          expect(eventCallbackSpy).toHaveBeenCalledTimes(1);
        });

        it('should publish a state change to WAITING on waiting event', () => {
          eventCallbacks('waiting');

          expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.WAITING);
          expect(eventCallbackSpy).toHaveBeenCalledTimes(1);
        });

        it('should publish a state change to ENDED on ended event', () => {
          eventCallbacks('ended');

          expect(eventCallbackSpy).toHaveBeenCalledWith(MediaState.ENDED);
          expect(eventCallbackSpy).toHaveBeenCalledTimes(1);
        });

        it('should start auto-resume timeout on seeked event if media element is paused and SLIDING window', () => {
          spyOnProperty(mockVideoElement, 'paused').and.returnValue(true);
          eventCallbacks('seeked');

          expect(mockDynamicWindowUtils.autoResumeAtStartOfRange).toHaveBeenCalledTimes(1);
        });

        it('should publish a time update event on time update', () => {
          eventCallbacks('timeupdate');

          expect(timeUpdateCallbackSpy).toHaveBeenCalled();
          expect(timeUpdateCallbackSpy).toHaveBeenCalledTimes(1);
        });

        it('should publish a error event on error', () => {
          eventCallbacks('error');

          expect(errorCallbackSpy).toHaveBeenCalled();
          expect(errorCallbackSpy).toHaveBeenCalledTimes(1);
        });
      });
    });
  
