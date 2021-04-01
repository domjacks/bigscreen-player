import Native from 'bigscreenplayer/playbackstrategy/nativestrategy';
import MSE from 'bigscreenplayer/playbackstrategy/msestrategy';
import StrategyPicker from 'bigscreenplayer/playbackstrategy/strategypicker';
import LiveSupport from 'bigscreenplayer/models/livesupport';
import PlaybackStrategy from 'bigscreenplayer/models/playbackstrategy';
    var HybridStrategy = function (mediaSources, windowType, mediaKind, videoElement, isUHD) {
      var strategy = StrategyPicker(windowType, isUHD);

      if (strategy === PlaybackStrategy.MSE) {
        return MSE(mediaSources, windowType, mediaKind, videoElement, isUHD);
      }

      return Native(mediaSources, windowType, mediaKind, videoElement, isUHD);
    };

    HybridStrategy.getLiveSupport = function () {
      return LiveSupport.SEEKABLE;
    };

    export default HybridStrategy;
  
