import Squire from 'squire';
    var originalBSPWindowConfig = window.bigscreenPlayer;
    var Subtitles;
    var subtitlesMock;
    var injector;
    var stubCaptions = {
      captionsUrl: 'http://captions.example.test'
    };

    describe('Subtitles', () => {
      beforeEach(() => {
        injector = new Squire();
      });

      afterEach(() => {
        window.bigscreenPlayer = originalBSPWindowConfig;
      });

      describe('strategy construction', () => {
        describe('legacy', () => {
          beforeEach(done => {
            window.bigscreenPlayer = {
              overrides: {
                legacySubtitles: true
              }
            };
            subtitlesMock = jasmine.createSpy();

            injector.mock({
              'bigscreenplayer/subtitles/legacysubtitles': subtitlesMock
            });

            injector.require(['bigscreenplayer/subtitles/subtitles'], function (Subs) {
              Subtitles = Subs;
              done();
            });
          });

          it('implementation is available when legacy subtitles override is true', () => {
            var mockMediaPlayer = {};
            var autoStart = true;
            var mockPlaybackElement = document.createElement('div');
            Subtitles(mockMediaPlayer, stubCaptions, autoStart, mockPlaybackElement);

            expect(subtitlesMock).toHaveBeenCalledTimes(1);
          });
        });

        describe('imscjs', () => {
          beforeEach(done => {
            subtitlesMock = jasmine.createSpy();

            injector.mock({
              'bigscreenplayer/subtitles/imscsubtitles': subtitlesMock
            });

            injector.require(['bigscreenplayer/subtitles/subtitles'], function (Subs) {
              Subtitles = Subs;
              done();
            });
          });

          it('implementation is available when legacy subtitles override is false', () => {
            var mockMediaPlayer = {};
            var autoStart = true;
            var mockPlaybackElement = document.createElement('div');

            Subtitles(mockMediaPlayer, stubCaptions, autoStart, mockPlaybackElement);

            expect(subtitlesMock).toHaveBeenCalledTimes(1);
          });
        });
      });

      describe('generic calls', () => {
        var subtitlesContainerSpies;
        var subtitlesContainer;

        beforeEach(done => {
          subtitlesContainerSpies = jasmine.createSpyObj('subtitlesContainer', ['start', 'stop', 'updatePosition', 'customise', 'renderExample', 'clearExample', 'tearDown']);
          subtitlesContainer = jasmine.createSpy();
          subtitlesContainer.and.callFake(function () {
            return subtitlesContainerSpies;
          });

          injector.mock({
            'bigscreenplayer/subtitles/imscsubtitles': subtitlesContainer
          });

          injector.require(['bigscreenplayer/subtitles/subtitles'], function (Subs) {
            Subtitles = Subs;
            done();
          });
        });

        afterEach(() => {
          subtitlesContainerSpies.start.calls.reset();
          subtitlesContainerSpies.stop.calls.reset();
          subtitlesContainerSpies.updatePosition.calls.reset();
          subtitlesContainerSpies.tearDown.calls.reset();
        });

        describe('construction', () => {
          it('calls subtitles strategy with the correct arguments', () => {
            var mockMediaPlayer = {};
            var autoStart = true;
            var mockPlaybackElement = document.createElement('div');
            var customDefaultStyle = {};
            var windowStartTime = '123456';

            Subtitles(mockMediaPlayer, stubCaptions, autoStart, mockPlaybackElement, customDefaultStyle, windowStartTime);

            expect(subtitlesContainer).toHaveBeenCalledWith(mockMediaPlayer, stubCaptions, autoStart, mockPlaybackElement, customDefaultStyle, windowStartTime);
          });
        });

        describe('show', () => {
          it('should start subtitles when enabled and available', () => {
            var subtitles = Subtitles(null, stubCaptions, null, null);
            subtitles.enable();
            subtitles.show();

            expect(subtitlesContainerSpies.start).toHaveBeenCalledTimes(1);
          });

          it('should not start subtitles when disabled and available', () => {
            var subtitles = Subtitles(null, stubCaptions, null, null);
            subtitles.disable();
            subtitles.show();

            expect(subtitlesContainerSpies.start).not.toHaveBeenCalled();
          });

          it('should not start subtitles when enabled and unavailable', () => {
            var subtitles = Subtitles(null, {captionsUrl: undefined}, null, null);
            subtitles.enable();
            subtitles.show();

            expect(subtitlesContainerSpies.start).not.toHaveBeenCalled();
          });

          it('should not start subtitles when disabled and unavailable', () => {
            var subtitles = Subtitles(null, {captionsUrl: undefined}, null, null);
            subtitles.disable();
            subtitles.show();

            expect(subtitlesContainerSpies.start).not.toHaveBeenCalled();
          });
        });

        describe('hide', () => {
          it('should stop subtitles when available', () => {
            var subtitles = Subtitles(null, stubCaptions, null, null);
            subtitles.hide();

            expect(subtitlesContainerSpies.stop).toHaveBeenCalledWith();
          });
        });

        describe('enable', () => {
          it('should set enabled state to true', () => {
            var subtitles = Subtitles(null, stubCaptions, null, null);
            subtitles.enable();

            expect(subtitles.enabled()).toEqual(true);
          });
        });

        describe('disable', () => {
          it('should set enabled state to false', () => {
            var subtitles = Subtitles(null, stubCaptions, null, null);
            subtitles.disable();

            expect(subtitlesContainerSpies.stop).not.toHaveBeenCalled();
            expect(subtitles.enabled()).toEqual(false);
          });
        });

        describe('enabled', () => {
          it('should return true if subtitles are enabled at construction', () => {
            var subtitles = Subtitles(null, {captionsUrl: undefined}, true, null);

            expect(subtitles.enabled()).toEqual(true);
          });

          it('should return true if subtitles are enabled by an api call', () => {
            var subtitles = Subtitles(null, {captionsUrl: undefined}, false, null);
            subtitles.enable();

            expect(subtitles.enabled()).toEqual(true);
          });

          it('should return false if subtitles are disabled at construction', () => {
            var subtitles = Subtitles(null, {captionsUrl: undefined}, false, null);

            expect(subtitles.enabled()).toEqual(false);
          });

          it('should return true if subtitles are disabled by an api call', () => {
            var subtitles = Subtitles(null, {captionsUrl: undefined}, true, null);
            subtitles.disable();

            expect(subtitles.enabled()).toEqual(false);
          });
        });

        describe('available', () => {
          it('should return true if VOD and url exists', () => {
            var subtitles = Subtitles(null, {captionsUrl: 'http://captions.example.test'}, true, null);

            expect(subtitles.available()).toEqual(true);
          });

          it('should return true if LIVE, url exists and no override', () => {
            var subtitles = Subtitles(null, {captionsUrl: 'http://captions.example.test', segmentLength: 3.84}, true, null);

            expect(subtitles.available()).toEqual(true);
          });

          it('should return true if VOD, url exists and legacy override exists', () => {
            window.bigscreenPlayer = {
              overrides: {
                legacySubtitles: true
              }
            };
            var subtitles = Subtitles(null, {captionsUrl: 'http://captions.example.test'}, true, null);

            expect(subtitles.available()).toEqual(true);
          });

          it('should return false if LIVE, url exists and legacy override exists', () => {
            window.bigscreenPlayer = {
              overrides: {
                legacySubtitles: true
              }
            };
            var subtitles = Subtitles(null, {captionsUrl: 'http://captions.example.test', segmentLength: 3.84}, true, null);

            expect(subtitles.available()).toEqual(false);
          });

          it('should return false if VOD and no url exists', () => {
            var subtitles = Subtitles(null, {captionsUrl: undefined}, true, null);

            expect(subtitles.available()).toEqual(false);
          });

          it('should return false if LIVE and no url exists', () => {
            var subtitles = Subtitles(null, {captionsUrl: undefined, segmentLength: 3.84}, true, null);

            expect(subtitles.available()).toEqual(false);
          });
        });

        describe('setPosition', () => {
          it('calls through to subtitlesContainer updatePosition', () => {
            var subtitles = Subtitles(null, stubCaptions, true, null);
            subtitles.setPosition('pos');

            expect(subtitlesContainerSpies.updatePosition).toHaveBeenCalledWith('pos');
          });
        });

        describe('customise', () => {
          it('passes through custom style object and enabled state to subtitlesContainer customise function', () => {
            var subtitles = Subtitles(null, stubCaptions, true, null);
            var customStyleObj = { size: 0.7 };
            subtitles.customise(customStyleObj);

            expect(subtitlesContainerSpies.customise).toHaveBeenCalledWith(customStyleObj, jasmine.any(Boolean));
          });
        });

        describe('renderExample', () => {
          it('calls subtitlesContainer renderExample function with correct values', () => {
            var subtitles = Subtitles(null, stubCaptions, true, null);
            var exampleUrl = '';
            var customStyleObj = { size: 0.7 };
            var safePosition = { left: 30, top: 0 };
            subtitles.renderExample(exampleUrl, customStyleObj, safePosition);

            expect(subtitlesContainerSpies.renderExample).toHaveBeenCalledWith(exampleUrl, customStyleObj, safePosition);
          });
        });

        describe('clearExample', () => {
          it('calls subtitlesContainer clearExample function ', () => {
            var subtitles = Subtitles(null, stubCaptions, true, null);
            subtitles.clearExample();

            expect(subtitlesContainerSpies.clearExample).toHaveBeenCalledTimes(1);
          });
        });

        describe('tearDown', () => {
          it('calls through to subtitlesContainer tearDown', () => {
            var subtitles = Subtitles(null, stubCaptions, true, null);
            subtitles.tearDown();

            expect(subtitlesContainerSpies.tearDown).toHaveBeenCalledTimes(1);
          });
        });
      });
    });
  
