import LegacyAdapter from 'bigscreenplayer/playbackstrategy/legacyplayeradapter';
import WindowTypes from 'bigscreenplayer/models/windowtypes';
import LivePlayer from undefined;
    var NativeStrategy = function (mediaSources, windowType, mediaKind, playbackElement, isUHD) {
      var mediaPlayer;

      mediaPlayer = MediaPlayer();
      if (windowType !== WindowTypes.STATIC) {
        mediaPlayer = LivePlayer(mediaPlayer, windowType, mediaSources);
      }

      return LegacyAdapter(mediaSources, windowType, playbackElement, isUHD, mediaPlayer);
    };

    NativeStrategy.getLiveSupport = function () {
      return window.bigscreenPlayer.liveSupport;
    };

    export default NativeStrategy;
  
