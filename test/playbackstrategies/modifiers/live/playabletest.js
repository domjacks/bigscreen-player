/*
 *  playable live modfifier is just a wrapper around html5
 *  So no further logical testing is required for unit tests
 *  providing that hml5 is properly tested
 */

import MediaPlayerBase from 'bigscreenplayer/playbackstrategy/modifiers/mediaplayerbase';
import PlayableMediaPlayer from 'bigscreenplayer/playbackstrategy/modifiers/live/playable';
    var sourceContainer = document.createElement('div');
    var player;
    var playableMediaPlayer;

    function wrapperTests (action, expectedReturn) {
      if (expectedReturn) {
        player[action].and.returnValue(expectedReturn);

        expect(playableMediaPlayer[action]()).toBe(expectedReturn);
      } else {
        playableMediaPlayer[action]();

        expect(player[action]).toHaveBeenCalledTimes(1);
      }
    }

    function isUndefined (action) {
      expect(playableMediaPlayer[action]).not.toBeDefined();
    }

    describe('Playable HMTL5 Live Player', () => {
      beforeEach(() => {
        player = jasmine.createSpyObj('player',
          ['beginPlayback', 'initialiseMedia', 'stop', 'reset', 'getState', 'getSource', 'getMimeType',
            'addEventCallback', 'removeEventCallback', 'removeAllEventCallbacks', 'getPlayerElement']);

        playableMediaPlayer = PlayableMediaPlayer(player);
      });

      it('calls beginPlayback on the media player', () => {
        wrapperTests('beginPlayback');
      });

      it('calls initialiseMedia on the media player', () => {
        wrapperTests('initialiseMedia');
      });

      it('calls stop on the media player', () => {
        wrapperTests('stop');
      });

      it('calls reset on the media player', () => {
        wrapperTests('reset');
      });

      it('calls getState on the media player', () => {
        wrapperTests('getState', 'thisState');
      });

      it('calls getSource on the media player', () => {
        wrapperTests('getSource', 'thisSource');
      });

      it('calls getMimeType on the media player', () => {
        wrapperTests('getMimeType', 'thisMimeType');
      });

      it('calls addEventCallback on the media player', () => {
        var thisArg = 'arg';
        var callback = function () { return; };
        playableMediaPlayer.addEventCallback(thisArg, callback);

        expect(player.addEventCallback).toHaveBeenCalledWith(thisArg, callback);
      });

      it('calls removeEventCallback on the media player', () => {
        var thisArg = 'arg';
        var callback = function () { return; };
        playableMediaPlayer.removeEventCallback(thisArg, callback);

        expect(player.removeEventCallback).toHaveBeenCalledWith(thisArg, callback);
      });

      it('calls removeAllEventCallbacks on the media player', () => {
        wrapperTests('removeAllEventCallbacks');
      });

      it('calls getPlayerElement on the media player', () => {
        wrapperTests('getPlayerElement', 'thisPlayerElement');
      });

      describe('should not have methods for', () => {
        it('beginPlaybackFrom', () => {
          isUndefined('beginPlaybackFrom');
        });

        it('playFrom', () => {
          isUndefined('playFrom');
        });

        it('pause', () => {
          isUndefined('pause');
        });

        it('resume', () => {
          isUndefined('resume');
        });

        it('getCurrentTime', () => {
          isUndefined('getCurrentTime');
        });

        it('getSeekableRange', () => {
          isUndefined('getSeekableRange');
        });
      });

      describe('calls the mediaplayer with the correct media Type', () => {
        it('when is an audio stream', () => {
          var mediaType = MediaPlayerBase.TYPE.AUDIO;
          playableMediaPlayer.initialiseMedia(mediaType, null, null, sourceContainer, null);

          expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_AUDIO, null, null, sourceContainer, null);
        });

        it('when is an video stream', () => {
          var mediaType = MediaPlayerBase.TYPE.VIDEO;
          playableMediaPlayer.initialiseMedia(mediaType, null, null, sourceContainer, null);

          expect(player.initialiseMedia).toHaveBeenCalledWith(MediaPlayerBase.TYPE.LIVE_VIDEO, null, null, sourceContainer, null);
        });
      });
    });
  
