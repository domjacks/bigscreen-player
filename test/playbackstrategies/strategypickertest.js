import WindowTypes from 'bigscreenplayer/models/windowtypes';
import StrategyPicker from 'bigscreenplayer/playbackstrategy/strategypicker';
    var isUHD = true;
    var previousPlaybackConfig = window.bigscreenPlayer;

    function setWindowBigscreenPlayerConfig (config) {
      window.bigscreenPlayer = config;
    }

    describe('Strategy Picker', () => {
      beforeEach(() => {
        window.bigscreenPlayer = {};
        setWindowBigscreenPlayerConfig({playbackStrategy: 'hybridstrategy'});
      });

      afterEach(() => {
        setWindowBigscreenPlayerConfig(previousPlaybackConfig);
      });

      it('Causes MSE Strategy to be picked if there are no configured exceptions', () => {
        expect(StrategyPicker(WindowTypes.STATIC, !isUHD)).toBe('msestrategy');
      });

      it('Causes TAL Strategy to be picked if uhd is an exception', () => {
        setWindowBigscreenPlayerConfig({mseExceptions: ['uhd']});

        expect(StrategyPicker(WindowTypes.STATIC, isUHD)).toBe('nativestrategy');
      });

      it('Causes MSE Strategy to be picked if uhd is an exception but asset is not UHD', () => {
        setWindowBigscreenPlayerConfig({mseExceptions: ['uhd']});

        expect(StrategyPicker(WindowTypes.STATIC, !isUHD)).toBe('msestrategy');
      });

      describe('WindowTypes', () => {
        it('Causes MSE Strategy to be picked if asset is STATIC window and there is no exception for staticWindow', () => {
          setWindowBigscreenPlayerConfig({mseExceptions: ['testException']});

          expect(StrategyPicker(WindowTypes.STATIC, !isUHD)).toBe('msestrategy');
        });

        it('Causes TAL Strategy to be picked if asset is STATIC window and there is an exception for staticWindow', () => {
          setWindowBigscreenPlayerConfig({mseExceptions: ['staticWindow']});

          expect(StrategyPicker(WindowTypes.STATIC, !isUHD)).toBe('nativestrategy');
        });

        it('Causes MSE Strategy to be picked if asset is SLIDING window and there is no exception for slidingWindow', () => {
          setWindowBigscreenPlayerConfig({mseExceptions: ['testException']});

          expect(StrategyPicker(WindowTypes.SLIDING, !isUHD)).toBe('msestrategy');
        });

        it('Causes TAL Strategy to be picked if asset is SLIDING window and there is an exception for slidingWindow', () => {
          setWindowBigscreenPlayerConfig({mseExceptions: ['slidingWindow']});

          expect(StrategyPicker(WindowTypes.SLIDING, !isUHD)).toBe('nativestrategy');
        });

        it('Causes MSE Strategy to be picked if asset is GROWING window and there is no exception for growingWindow', () => {
          setWindowBigscreenPlayerConfig({mseExceptions: ['testException']});

          expect(StrategyPicker(WindowTypes.GROWING, !isUHD)).toBe('msestrategy');
        });

        it('Causes TAL Strategy to be picked if asset is GROWING and there is an exception for growingWindow', () => {
          setWindowBigscreenPlayerConfig({mseExceptions: ['growingWindow']});

          expect(StrategyPicker(WindowTypes.GROWING, !isUHD)).toBe('nativestrategy');
        });
      });
    });
  
