import MediaState from 'bigscreenplayer/models/mediastate';
import WindowTypes from 'bigscreenplayer/models/windowtypes';
import MediaKinds from 'bigscreenplayer/models/mediakinds';
import MockStrategy from 'bigscreenplayer/playbackstrategy/mockstrategy';
import LiveSupport from 'bigscreenplayer/models/livesupport';
import PluginEnums from 'bigscreenplayer/pluginenums';
import TransferFormats from 'bigscreenplayer/models/transferformats';
import Squire from 'squire';
    

    describe('Player Component', () => {
      var injector;
      var playerComponent;
      var playbackElement;
      var mockStrategy;
      var mockPlugins;
      var mockPluginsInterface;
      var PlayerComponentWithMocks;
      var mockStateUpdateCallback;
      var corePlaybackData;
      var liveSupport;
      var forceMediaSourcesError;
      var mockMediaSources;
      var testTime;
      var updateTestTime = false;

      beforeAll(() => {
        mockStateUpdateCallback = jasmine.createSpy('mockStateUpdateCallback');
      });

      // opts = streamType, playbackType, mediaType, disableUi
      function setUpPlayerComponent (opts) {
        opts = opts || {};

        playbackElement = document.createElement('div');
        playbackElement.id = 'app';

        corePlaybackData = {
          media: {
            kind: opts.mediaKind || MediaKinds.VIDEO,
            codec: undefined,
            urls: [{url: 'a.mpd', cdn: 'cdn-a'}, {url: 'b.mpd', cdn: 'cdn-b'}, {url: 'c.mpd', cdn: 'cdn-c'}],
            type: opts.type || 'application/dash+xml',
            transferFormat: opts.transferFormat || TransferFormats.DASH,
            bitrate: undefined
          },
          time: testTime
        };

        mockMediaSources = {
          failover: function (successCallback, errorCallback, failoverParams) {
            if (forceMediaSourcesError) {
              errorCallback();
            } else {
              if (updateTestTime) {
                testTime = {
                  windowStartTime: 744000,
                  windowEndTime: 4344000,
                  correction: 0
                };
              }
              successCallback();
            }
          },
          time: function () {
            return testTime;
          },
          refresh: function (successCallback, errorCallback) {
            if (updateTestTime) {
              testTime = {
                windowStartTime: 744000,
                windowEndTime: 4344000,
                correction: 0
              };
            }
            successCallback();
          }
        };

        var windowType = opts.windowType || WindowTypes.STATIC;

        playerComponent = new PlayerComponentWithMocks(
          playbackElement,
          corePlaybackData,
          mockMediaSources,
          windowType,
          mockStateUpdateCallback,
          null
        );
      }

      beforeEach(done => {
        injector = new Squire();
        mockPluginsInterface = jasmine.createSpyObj('interface', ['onErrorCleared', 'onBuffering', 'onBufferingCleared', 'onError', 'onFatalError', 'onErrorHandled']);

        mockPlugins = {
          interface: mockPluginsInterface
        };

        mockStrategy = MockStrategy();

        function mockStrategyConstructor () {
          return mockStrategy;
        }

        liveSupport = LiveSupport.SEEKABLE;
        mockStrategyConstructor.getLiveSupport = function () {
          return liveSupport;
        };

        injector.mock({
          'bigscreenplayer/playbackstrategy/mockstrategy': mockStrategyConstructor,
          'bigscreenplayer/plugins': mockPlugins
        });
        injector.require(['bigscreenplayer/playercomponent'], function (PlayerComponent) {
          PlayerComponentWithMocks = PlayerComponent;
          done();
        });

        forceMediaSourcesError = false;
        testTime = {
          windowStartTime: 724000,
          windowEndTime: 4324000,
          correction: 0
        };
        updateTestTime = false;
      });

      describe('Construction', () => {
        it('should fire error cleared on the plugins', () => {
          var pluginData = {
            status: PluginEnums.STATUS.DISMISSED,
            stateType: PluginEnums.TYPE.ERROR,
            isBufferingTimeoutError: false,
            cdn: undefined,
            isInitialPlay: undefined,
            timeStamp: jasmine.any(Object)
          };

          setUpPlayerComponent();

          expect(mockPluginsInterface.onErrorCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
        });
      });

      describe('Pause', () => {
        it('should disable auto resume when playing a video webcast', () => {
          setUpPlayerComponent({windowType: WindowTypes.GROWING});

          spyOn(mockStrategy, 'pause');

          playerComponent.pause();

          expect(mockStrategy.pause).toHaveBeenCalledWith({disableAutoResume: true});
        });

        it('should use options for disable auto resume when playing audio', () => {
          setUpPlayerComponent({windowType: WindowTypes.SLIDING, mediaKind: 'audio'});

          spyOn(mockStrategy, 'pause');

          playerComponent.pause();

          expect(mockStrategy.pause).toHaveBeenCalledWith({disableAutoResume: undefined});

          playerComponent.pause({disableAutoResume: false});

          expect(mockStrategy.pause).toHaveBeenCalledWith({disableAutoResume: false});

          playerComponent.pause({disableAutoResume: true});

          expect(mockStrategy.pause).toHaveBeenCalledWith({disableAutoResume: true});
        });

        it('should use options for disable auto resume when not playing a webcast', () => {
          setUpPlayerComponent();

          spyOn(mockStrategy, 'pause');

          playerComponent.pause();

          expect(mockStrategy.pause).toHaveBeenCalledWith({disableAutoResume: undefined});

          playerComponent.pause({disableAutoResume: false});

          expect(mockStrategy.pause).toHaveBeenCalledWith({disableAutoResume: false});

          playerComponent.pause({disableAutoResume: true});

          expect(mockStrategy.pause).toHaveBeenCalledWith({disableAutoResume: true});
        });
      });

      describe('getPlayerElement', () => {
        // This is used within the TALStatsAPI
        it('should return the element from the strategy', () => {
          setUpPlayerComponent();

          var playerElement = document.createElement('video');
          spyOn(mockStrategy, 'getPlayerElement').and.returnValue(playerElement);

          expect(playerComponent.getPlayerElement()).toEqual(playerElement);
        });

        it('should return null if it does not exist on the strategy', () => {
          setUpPlayerComponent();

          var getPlayerElementFunction = mockStrategy.getPlayerElement;

          mockStrategy.getPlayerElement = undefined;

          expect(playerComponent.getPlayerElement()).toEqual(null);

          // Other tests require this to still work and mock strategy is a singleton
          mockStrategy.getPlayerElement = getPlayerElementFunction;
        });
      });

      describe('setCurrentTime', () => {
        var currentStrategy;
        beforeEach(() => {
          currentStrategy = window.bigscreenPlayer.playbackStrategy;

          spyOn(mockStrategy, 'setCurrentTime');
          spyOn(mockStrategy, 'load');
        });

        afterEach(() => {
          window.bigscreenPlayer.playbackStrategy = currentStrategy;

          mockStrategy.setCurrentTime.calls.reset();
          mockStrategy.load.calls.reset();
          mockStrategy.getSeekableRange.calls.reset();
        });

        it('should setCurrentTime on the strategy when in a seekable state', () => {
          spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});
          setUpPlayerComponent();

          mockStrategy.load.calls.reset();
          playerComponent.setCurrentTime(10);

          expect(mockStrategy.setCurrentTime).toHaveBeenCalledWith(10);
          expect(mockStrategy.load).not.toHaveBeenCalled();
        });

        it('should reload the element if restartable', () => {
          spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});
          window.bigscreenPlayer.playbackStrategy = 'nativestrategy';
          liveSupport = LiveSupport.RESTARTABLE;
          setUpPlayerComponent({ windowType: WindowTypes.SLIDING, transferFormat: TransferFormats.HLS, type: 'applesomething' });

          updateTestTime = true;
          playerComponent.setCurrentTime(50);

          expect(mockStrategy.load).toHaveBeenCalledTimes(2);
          expect(mockStrategy.load).toHaveBeenCalledWith('applesomething', 30);
        });

        it('should reload the element with no time if the new time is within 30 seconds of the end of the window', () => {
          spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 70});
          window.bigscreenPlayer.playbackStrategy = 'nativestrategy';
          liveSupport = LiveSupport.RESTARTABLE;
          setUpPlayerComponent({ windowType: WindowTypes.SLIDING, transferFormat: TransferFormats.HLS, type: 'applesomething' });

          // this will move the window forward by 20 seconds from it's original position
          testTime = {
            windowStartTime: 744000,
            windowEndTime: 4344000,
            correction: 0
          };

          playerComponent.setCurrentTime(50);

          expect(mockStrategy.load).toHaveBeenCalledTimes(2);
          expect(mockStrategy.load).toHaveBeenCalledWith('applesomething', undefined);
        });
      });

      describe('events', () => {
        describe('on playing', () => {
          it('should fire error cleared on the plugins', () => {
            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.ERROR,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: undefined,
              timeStamp: jasmine.any(Object)
            };

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING);

            expect(mockPluginsInterface.onErrorCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });

          it('should clear error timeout', () => {
            jasmine.clock().install();
            setUpPlayerComponent();

            // trigger a buffering event to start the error timeout,
            // after 30 seconds it should fire a media state update of FATAL
            // it is exptected to be cleared
            mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

            mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING);

            jasmine.clock().tick(30000);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);

            jasmine.clock().uninstall();
          });

          it('should clear fatal error timeout', () => {
            jasmine.clock().install();

            setUpPlayerComponent();

            // trigger a error event to start the fatal error timeout,
            // after 5 seconds it should fire a media state update of FATAL
            // it is exptected to be cleared
            mockStrategy.mockingHooks.fireErrorEvent();

            mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING);

            jasmine.clock().tick(5000);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);

            jasmine.clock().uninstall();
          });

          it('should fire buffering cleared on the plugins', () => {
            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.BUFFERING,
              isBufferingTimeoutError: false,
              cdn: undefined,
              newCdn: undefined,
              isInitialPlay: true,
              timeStamp: jasmine.any(Object)
            };

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING);

            expect(mockPluginsInterface.onBufferingCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });

          it('should publish a media state update of playing', () => {
            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).toEqual(MediaState.PLAYING);
          });
        });

        describe('on paused', () => {
          it('should publish a media state update event of paused', () => {
            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).toEqual(MediaState.PAUSED);
          });

          it('should clear error timeout', () => {
            jasmine.clock().install();

            setUpPlayerComponent();

            // trigger a buffering event to start the error timeout,
            // after 30 seconds it should fire a media state update of FATAL
            // it is exptected to be cleared
            mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

            mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED);

            jasmine.clock().tick(30000);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);

            jasmine.clock().uninstall();
          });

          it('should clear fatal error timeout', () => {
            jasmine.clock().install();

            setUpPlayerComponent();

            // trigger a error event to start the fatal error timeout,
            // after 5 seconds it should fire a media state update of FATAL
            // it is exptected to be cleared
            mockStrategy.mockingHooks.fireErrorEvent();

            mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED);

            jasmine.clock().tick(5000);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);

            jasmine.clock().uninstall();
          });

          it('should fire error cleared on the plugins', () => {
            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.ERROR,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: undefined,
              timeStamp: jasmine.any(Object)
            };

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED);

            expect(mockPluginsInterface.onErrorCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });

          it('should fire buffering cleared on the plugins', () => {
            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.BUFFERING,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: true,
              timeStamp: jasmine.any(Object)
            };

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.PAUSED);

            expect(mockPluginsInterface.onBufferingCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });
        });

        describe('on buffering', () => {
          it('should publish a media state update of waiting', () => {
            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).toEqual(MediaState.WAITING);
          });

          it('should start the error timeout', () => {
            jasmine.clock().install();

            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.BUFFERING,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: true,
              timeStamp: jasmine.any(Object)
            };

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

            jasmine.clock().tick(30000);
            // error timeout when reached will fire a buffering cleared on the plugins.
            expect(mockPluginsInterface.onBufferingCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));

            jasmine.clock().uninstall();
          });

          it('should fire error cleared on the plugins', () => {
            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.ERROR,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: undefined,
              timeStamp: jasmine.any(Object)
            };

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

            expect(mockPluginsInterface.onErrorCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });

          it('should fire on buffering on the plugins', () => {
            var pluginData = {
              status: PluginEnums.STATUS.STARTED,
              stateType: PluginEnums.TYPE.BUFFERING,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: undefined,
              timeStamp: jasmine.any(Object)
            };

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

            expect(mockPluginsInterface.onBuffering).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });
        });

        describe('on ended', () => {
          it('should clear error timeout', () => {
            jasmine.clock().install();

            setUpPlayerComponent();

            // trigger a buffering event to start the error timeout,
            // after 30 seconds it should fire a media state update of FATAL
            // it is exptected to be cleared
            mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

            mockStrategy.mockingHooks.fireEvent(MediaState.ENDED);

            jasmine.clock().tick(30000);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);

            jasmine.clock().uninstall();
          });

          it('should clear fatal error timeout', () => {
            jasmine.clock().install();

            setUpPlayerComponent();

            // trigger a error event to start the fatal error timeout,
            // after 5 seconds it should fire a media state update of FATAL
            // it is exptected to be cleared
            mockStrategy.mockingHooks.fireErrorEvent();

            mockStrategy.mockingHooks.fireEvent(MediaState.ENDED);

            jasmine.clock().tick(5000);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);

            jasmine.clock().uninstall();
          });

          it('should fire error cleared on the plugins', () => {
            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.ERROR,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: undefined,
              timeStamp: jasmine.any(Object)
            };

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.ENDED);

            expect(mockPluginsInterface.onErrorCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });

          it('should fire buffering cleared on the plugins', () => {
            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.BUFFERING,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: true,
              timeStamp: jasmine.any(Object)
            };

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.ENDED);

            expect(mockPluginsInterface.onBufferingCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });

          it('should publish a media state update event of ended', () => {
            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireEvent(MediaState.ENDED);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).toEqual(MediaState.ENDED);
          });
        });

        describe('on timeUpdate', () => {
          it('should publish a media state update event', () => {
            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireTimeUpdate();

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].timeUpdate).toEqual(true);
          });
        });

        describe('on error', () => {
          it('should fire buffering cleared on the plugins', () => {
            var pluginData = {
              status: PluginEnums.STATUS.DISMISSED,
              stateType: PluginEnums.TYPE.BUFFERING,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: true,
              timeStamp: jasmine.any(Object)
            };

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireErrorEvent();

            expect(mockPluginsInterface.onBufferingCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });

          // raise error
          it('should clear error timeout', () => {
            jasmine.clock().install();

            setUpPlayerComponent();

            // trigger a buffering event to start the error timeout,
            // after 30 seconds it should fire a media state update of FATAL
            // it is exptected to be cleared
            mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

            jasmine.clock().tick(29999);

            mockStrategy.mockingHooks.fireErrorEvent();

            jasmine.clock().tick(1);

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);

            jasmine.clock().uninstall();
          });

          // raise error
          it('should publish a media state update of waiting', () => {
            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireErrorEvent();

            expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).toEqual(MediaState.WAITING);
          });

          // raise error
          it('should fire on error on the plugins', () => {
            var pluginData = {
              status: PluginEnums.STATUS.STARTED,
              stateType: PluginEnums.TYPE.ERROR,
              isBufferingTimeoutError: false,
              cdn: undefined,
              isInitialPlay: undefined,
              timeStamp: jasmine.any(Object)
            };

            setUpPlayerComponent();

            mockStrategy.mockingHooks.fireErrorEvent();

            expect(mockPluginsInterface.onError).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
          });
        });
      });

      describe('cdn failover', () => {
        var fatalErrorPluginData;
        var currentTime;
        var type;
        var currentTimeSpy;
        var currentStrategy;

        beforeEach(() => {
          jasmine.clock().install();

          fatalErrorPluginData = {
            status: PluginEnums.STATUS.FATAL,
            stateType: PluginEnums.TYPE.ERROR,
            isBufferingTimeoutError: false,
            cdn: undefined,
            newCdn: undefined,
            isInitialPlay: undefined,
            timeStamp: jasmine.any(Object)
          };

          currentTime = 50;
          type = 'application/dash+xml';

          spyOn(mockStrategy, 'load');
          spyOn(mockStrategy, 'reset');
          spyOn(mockStrategy, 'getDuration').and.returnValue(100);
          spyOn(mockStrategy, 'getSeekableRange').and.returnValue({start: 0, end: 100});
          currentTimeSpy = spyOn(mockStrategy, 'getCurrentTime');
          currentTimeSpy.and.returnValue(currentTime);
          currentStrategy = window.bigscreenPlayer.playbackStrategy;
        });

        afterEach(() => {
          window.bigscreenPlayer.playbackStrategy = currentStrategy;
          jasmine.clock().uninstall();
        });

        it('should failover after buffering for 30 seconds on initial playback', () => {
          setUpPlayerComponent();
          mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

          jasmine.clock().tick(29999);

          expect(mockStrategy.load).toHaveBeenCalledTimes(1);

          jasmine.clock().tick(1);

          expect(mockStrategy.load).toHaveBeenCalledTimes(2);
          expect(mockStrategy.load).toHaveBeenCalledWith(type, currentTime);
        });

        it('should failover after buffering for 20 seconds on normal playback', () => {
          setUpPlayerComponent();
          mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING); // Set playback cause to normal
          mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

          jasmine.clock().tick(19999);

          expect(mockStrategy.load).toHaveBeenCalledTimes(1);

          jasmine.clock().tick(1);

          expect(mockStrategy.load).toHaveBeenCalledTimes(2);
          expect(mockStrategy.load).toHaveBeenCalledWith(type, currentTime);
        });

        it('should failover after 5 seconds if we have not cleared an error from the device', () => {
          setUpPlayerComponent();
          mockStrategy.mockingHooks.fireErrorEvent();

          jasmine.clock().tick(4999);

          expect(mockStrategy.load).toHaveBeenCalledTimes(1);

          jasmine.clock().tick(1);

          expect(mockStrategy.load).toHaveBeenCalledTimes(2);
          expect(mockStrategy.load).toHaveBeenCalledWith(type, currentTime);
          expect(mockStrategy.reset).toHaveBeenCalledWith();
        });

        it('should fire a fatal error on the plugins if failover is not possible', () => {
          setUpPlayerComponent();
          forceMediaSourcesError = true;

          mockStrategy.mockingHooks.fireErrorEvent();

          jasmine.clock().tick(5000);

          expect(mockStrategy.load).toHaveBeenCalledTimes(1);

          expect(mockPluginsInterface.onFatalError).toHaveBeenCalledWith(jasmine.objectContaining(fatalErrorPluginData));
        });

        it('should publish a media state update of fatal if failover is not possible', () => {
          setUpPlayerComponent();
          forceMediaSourcesError = true;

          mockStrategy.mockingHooks.fireErrorEvent();

          jasmine.clock().tick(5000);

          expect(mockStrategy.load).toHaveBeenCalledTimes(1);

          expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).toEqual(MediaState.FATAL_ERROR);
        });

        it('should failover for with updated failover time when window time data has changed', () => {
          setUpPlayerComponent({ windowType: WindowTypes.SLIDING, transferFormat: TransferFormats.HLS });
          updateTestTime = true;

          // Set playback cause to normal
          mockStrategy.mockingHooks.fireEvent(MediaState.PLAYING);
          mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

          jasmine.clock().tick(19999);

          expect(mockStrategy.load).toHaveBeenCalledTimes(1);

          jasmine.clock().tick(1);

          expect(mockStrategy.load).toHaveBeenCalledTimes(2);
          expect(mockStrategy.load).toHaveBeenCalledWith(type, currentTime - 20);
        });

        it('should clear buffering timeout error timeout', () => {
          setUpPlayerComponent();
          forceMediaSourcesError = true;

          // trigger a buffering event to start the error timeout,
          // after 30 seconds it should fire a media state update of FATAL
          // it is exptected to be cleared
          mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);
          mockStrategy.mockingHooks.fireErrorEvent();

          jasmine.clock().tick(30000);

          expect(mockStateUpdateCallback.calls.mostRecent().args[0].isBufferingTimeoutError).toBe(false);
        });

        it('should clear fatal error timeout', () => {
          setUpPlayerComponent();

          // trigger a error event to start the fatal error timeout,
          // after 5 seconds it should fire a media state update of FATAL
          // it is exptected to be cleared
          mockStrategy.mockingHooks.fireErrorEvent();

          jasmine.clock().tick(5000);

          expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);
        });

        it('should fire error cleared on the plugins', () => {
          var pluginData = {
            status: PluginEnums.STATUS.DISMISSED,
            stateType: PluginEnums.TYPE.ERROR,
            isBufferingTimeoutError: false,
            cdn: undefined,
            isInitialPlay: undefined,
            timeStamp: jasmine.any(Object)
          };

          setUpPlayerComponent({multiCdn: true});

          mockStrategy.mockingHooks.fireErrorEvent();

          jasmine.clock().tick(5000);

          expect(mockPluginsInterface.onErrorCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
        });

        it('should fire buffering cleared on the plugins', () => {
          var pluginData = {
            status: PluginEnums.STATUS.DISMISSED,
            stateType: PluginEnums.TYPE.BUFFERING,
            isBufferingTimeoutError: false,
            cdn: undefined,
            isInitialPlay: true,
            timeStamp: jasmine.any(Object)
          };

          setUpPlayerComponent({multiCdn: true});

          mockStrategy.mockingHooks.fireErrorEvent();

          jasmine.clock().tick(5000);

          expect(mockPluginsInterface.onBufferingCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
        });
      });

      describe('teardown', () => {
        it('should reset the strategy', () => {
          setUpPlayerComponent();

          spyOn(mockStrategy, 'reset');

          playerComponent.tearDown();

          expect(mockStrategy.reset).toHaveBeenCalledWith();
        });

        it('should clear error timeout', () => {
          jasmine.clock().install();

          setUpPlayerComponent();

          // trigger a buffering event to start the error timeout,
          // after 30 seconds it should fire a media state update of FATAL
          // it is exptected to be cleared
          mockStrategy.mockingHooks.fireEvent(MediaState.WAITING);

          playerComponent.tearDown();

          jasmine.clock().tick(30000);

          expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);

          jasmine.clock().uninstall();
        });

        it('should clear fatal error timeout', () => {
          jasmine.clock().install();

          setUpPlayerComponent();

          // trigger a error event to start the fatal error timeout,
          // after 5 seconds it should fire a media state update of FATAL
          // it is exptected to be cleared
          mockStrategy.mockingHooks.fireErrorEvent();

          playerComponent.tearDown();

          jasmine.clock().tick(5000);

          expect(mockStateUpdateCallback.calls.mostRecent().args[0].data.state).not.toEqual(MediaState.FATAL_ERROR);

          jasmine.clock().uninstall();
        });

        it('should fire error cleared on the plugins', () => {
          var pluginData = {
            status: PluginEnums.STATUS.DISMISSED,
            stateType: PluginEnums.TYPE.ERROR,
            isBufferingTimeoutError: false,
            cdn: undefined,
            isInitialPlay: undefined,
            timeStamp: jasmine.any(Object)
          };

          setUpPlayerComponent();

          playerComponent.tearDown();

          expect(mockPluginsInterface.onErrorCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
        });

        it('should fire buffering cleared on the plugins', () => {
          var pluginData = {
            status: PluginEnums.STATUS.DISMISSED,
            stateType: PluginEnums.TYPE.BUFFERING,
            isBufferingTimeoutError: false,
            cdn: undefined,
            isInitialPlay: true,
            timeStamp: jasmine.any(Object)
          };

          setUpPlayerComponent();

          playerComponent.tearDown();

          expect(mockPluginsInterface.onBufferingCleared).toHaveBeenCalledWith(jasmine.objectContaining(pluginData));
        });

        it('should tear down the strategy', () => {
          setUpPlayerComponent();

          spyOn(mockStrategy, 'tearDown');

          playerComponent.tearDown();

          expect(mockStrategy.tearDown).toHaveBeenCalledWith();
        });
      });
    });
  
